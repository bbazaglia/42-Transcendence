export default async function (fastify, opts) {
    // ROUTE: Creates a new user account.
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                required: ['displayName', 'email', 'password'],
                properties: {
                    displayName: { type: 'string', minLength: 3, maxLength: 20 },
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        userId: { type: 'integer' }
                    }
                },
                409: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { displayName, email, password } = request.body;

        try {
            // Check for existing user with Prisma (case-insensitive)
            const existingUserByDisplayName = await fastify.prisma.user.findFirst({
                where: {
                    displayName: {
                        equals: displayName,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingUserByDisplayName) {
                reply.code(409);
                return { error: 'Display name is already in use.' };
            }

            const existingUserByEmail = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true }
            });

            if (existingUserByEmail) {
                reply.code(409);
                return { error: 'An account with this email already exists.' };
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
            return { message: 'User registered successfully.', userId: newUser.id };

        } catch (err) {
            fastify.log.error(err, 'Registration failed');
            reply.code(500);
            return { error: 'An unexpected error occurred during registration.' };
        }
    });

    // ROUTE: Logs in a user and returns a JWT token.
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                displayName: { type: 'string' },
                                avatarUrl: { type: 'string', format: 'uri' },
                                wins: { type: 'integer' },
                                losses: { type: 'integer' },
                                createdAt: { type: 'string', format: 'date-time' }
                            }
                        }
                    }
                },
                401: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
               const { email, password } = request.body;

        try {
            // Find the user by their email.
            const user = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            // Verify the password.
            const isPasswordValid = user && await bcrypt.compare(password, user.passwordHash);

            if (!isPasswordValid) {
                reply.code(401); // 401 Unauthorized
                return { error: 'Invalid email or password.' };
            }

            // Create the JWT payload and sign the token.
            const payload = { id: user.id, displayName: user.displayName };
            const token = fastify.jwt.sign({ payload });

            reply.setCookie('token', token, {
                path: '/', // The cookie is available to our entire site
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7
            });

            // Return the token and the public user object.
            const publicUser = {
                id: user.id,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                wins: user.wins,
                losses: user.losses,
                createdAt: user.createdAt
            };

            return { user: publicUser };

        } catch (err) {
            fastify.log.error(err, 'Login failed');
            reply.code(500);
            return { error: 'An unexpected error occurred during login.' };
        }
    });

    // ROUTE: Redirects the user to the Google sign-in page.
    fastify.get('/google', async (request, reply) => {
        // Google OAuth logic
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/googles/callback', async (request, reply) => {
        // Google OAuth callback logic
    }
    );

    // ROUTE: Generates a new secret and QR code for setting up 2FA.
    fastify.post('/2fa/generate', async (request, reply) => {
        // Generate 2FA secret and QR code logic
    }
    );

    // ROUTE: Verifies a 2FA code and enables it for a user.
    fastify.post('/2fa/verify', async (request, reply) => {
        // Verify 2FA logic
    });

    // ROUTE: Disables 2FA for a user.
    fastify.post('/2fa/disable', async (request, reply) => {
        // Disable 2FA logic
    });

    // ROUTE: Checks if 2FA is enabled for a user.
    fastify.get('/2fa/enable', async (request, reply) => {
        // Enable 2FA check logic
    });
}
