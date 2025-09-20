import bcrypt from 'bcrypt';

async function createSession(reply, user) {
    const payload = { id: user.id, displayName: user.displayName };
    const token = reply.jwtSign(payload);

    reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
}

export default async function (fastify, opts) {
    // ROUTE: Creates a new user account.
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string', minLength: 3, maxLength: 20 },
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                },
                required: ['displayName', 'email', 'password']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { displayName, email, password } = request.body;

            // Check for existing user with Prisma
            const existingUserByDisplayName = await fastify.prisma.user.findFirst({
                where: {
                    displayName: {
                        equals: displayName
                    }
                }
            });

            if (existingUserByDisplayName) {
                throw fastify.httpErrors.conflict('Display name is already in use.');
            }

            const existingUserByEmail = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true }
            });

            if (existingUserByEmail) {
                throw fastify.httpErrors.conflict('An account with this email already exists.');
            }

            // Hash the password before storing it
            const passwordHash = await bcrypt.hash(password, 10);

            // Create the new user with Prisma
            const newUser = await fastify.prisma.user.create({
                data: {
                    displayName,
                    email: email.toLowerCase(),
                    passwordHash
                }
            });

            reply.code(201);
            return { user: newUser };

        } catch (error) {
            fastify.log.error(error, 'Registration failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during registration.');
        }
    });

    // ROUTE: Logs in the host user and returns a JWT token.
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                },
                required: ['email', 'password']
            },
            response: {
                200: {
                    oneOf: [
                        // The standard response with the user object.
                        {
                            type: 'object',
                            properties: {
                                user: { $ref: 'publicUser#' }
                            },
                            required: ['user']
                        },
                        // The response when 2FA is required
                        {
                            type: 'object',
                            properties: {
                                twoFactorChallenge: {
                                    type: 'object',
                                    properties: {
                                        tempToken: { type: 'string' }
                                    },
                                    required: ['tempToken']
                                }
                            },
                            required: ['twoFactorChallenge']
                        }
                    ]
                },
                401: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;

            // Find the user by email using the PRIVATE client to get the password hash.
            const hostWithSecrets = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                omit: { passwordHash: false }
            });

            // Verify the password.
            const isPasswordValid = hostWithSecrets && await bcrypt.compare(password, hostWithSecrets.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid email or password.');
            }

            if (hostWithSecrets.isTwoFaEnabled) {
                // Create a temporary, limited-scope token.
                const tempPayload = { id: hostWithSecrets.id, scope: '2fa' };
                const tempToken = fastify.jwt.sign(tempPayload, { expiresIn: '5m' });

                // Send a specific response telling the frontend that 2FA is required.
                reply.code(200);
                return {
                    twoFactorChallenge: {
                        tempToken: tempToken
                    }
                };
            }

            // Create the JWT payload and sign the token.
            await createSession(reply, hostWithSecrets);

            // IMPORTANT: Fetch the user again with the SAFE client to return to the frontend.
            // This ensures no secrets are ever sent in the response.
            const publicHost = await fastify.prisma.user.findUnique({ where: { id: hostWithSecrets.id } });

            return { user: publicHost };

        } catch (error) {
            fastify.log.error(error, 'Login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during login.');
        }
    });

    // ROUTE: Handles 2FA verification during login.
    fastify.post('/login/2fa', {
        schema: {
            body: {
                type: 'object',
                properties: { token: { type: 'string' } },
                required: ['token']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                401: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const decodedTempToken = await request.jwtVerify();

            if (decodedTempToken.scope !== '2fa') {
                throw fastify.httpErrors.unauthorized('Invalid token scope.');
            }

            // Fetch the user's secret and verify the 2FA code from the request body.
            const user = await fastify.prisma.user.findUnique({
                where: { id: decodedTempToken.id },
                omit: { twoFaSecret: false }
            });
            const isValid = fastify.totp.verify(request.body.token, user.twoFaSecret);

            if (!isValid) {
                throw fastify.httpErrors.unauthorized('Invalid 2FA code.');
            }

            await createSession(reply, user);

            // Return the public user object, just like a normal login.
            const publicUser = await fastify.prisma.user.findUnique({ where: { id: user.id } });
            return { user: publicUser };

        } catch (error) {
            fastify.log.error(error, '2FA login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.unauthorized('Invalid or expired 2FA session.');
        }
    });

    // ROUTE: Generates a new secret and QR code for setting up 2FA.
    fastify.post('/2fa/setup', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        qrCodeUrl: { type: 'string' }
                    },
                    required: ['qrCodeUrl']
                },
                401: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.authenticate], // Ensure the user is authenticated
    }, async (request, reply) => {
        const totpInstance = fastify.totp.setup(request.user.email);

        const secret = totpInstance.secret.base32;
        await fastify.prisma.user.update({
            where: { id: request.user.id },
            data: { twoFaSecret: secret, isTwoFaEnabled: false },
        });

        const qrCodeDataURL = await fastify.totp.generateQRCode(totpInstance);

        return { qrCodeUrl: qrCodeDataURL };
    });

    // ROUTE: Verifies a 2FA code and enables it for a user.
    fastify.post('/2fa/verify', {
        schema: {
            body: {
                type: 'object',
                properties: { token: { type: 'string' } },
                required: ['token']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                400: { $ref: 'httpError#' },
                401: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const { token } = request.body;
        const user = await fastify.prisma.user.findUnique({
            where: { id: request.user.id },
            omit: { twoFaSecret: false }
        });

        const isValid = fastify.totp.verify(token, user.twoFaSecret);

        if (!isValid) {
            throw fastify.httpErrors.badRequest('Invalid 2FA token.');
        }


        // Update the user and return the new public version of the object.
        const updatedUser = await fastify.prisma.user.update({
            where: { id: request.user.id },
            data: { isTwoFaEnabled: true },
        });

        return { user: updatedUser };
    });

    // ROUTE: Disables 2FA for a user.
    fastify.post('/2fa/disable', {
        schema: {
            body: {
                type: 'object',
                properties: { password: { type: 'string' } },
                required: ['password']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: {
                            $ref: 'publicUser#'
                        }
                    },
                    required: ['user']
                },
                401: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const { password } = request.body;
        const user = await fastify.prisma.user.findUnique({
            where: { id: request.user.id },
            omit: { passwordHash: false }
        });

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw fastify.httpErrors.unauthorized('Invalid password.');
        }

        const updatedUser = await fastify.prisma.user.update({
            where: { id: request.user.id },
            data: { isTwoFaEnabled: false, twoFaSecret: null },
        });

        return { user: updatedUser };
    });

    // ROUTE: Redirects the user to the Google sign-in page.
    fastify.get('/google', async (request, reply) => {
        // Google OAuth logic
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/google/callback', async (request, reply) => {
        // Google OAuth callback logic
    });
}
