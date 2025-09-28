import bcrypt from 'bcrypt';

async function createSessionCookie(reply, sessionId) {
    const payload = { sessionId };
    const token = reply.jwtSign(payload);

    reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

async function handleSuccessfulLogin(fastify, reply, publicUser) {
    let session = fastify.session.get();

    if (!session) {
        session = fastify.session.create(publicUser);
        fastify.log.info(`New session ${session.sessionId} created by ${publicUser.displayName}`);
        // Issue the session cookie ONLY when the session is created.
        await createSessionCookie(reply, session.sessionId);
    } else {
        // A session already exists. Check if user is already in it.
        if (fastify.session.isParticipant(publicUser.id)) {
            throw fastify.httpErrors.conflict('User is already in the session.');
        }
        // Add the new user to the existing session.
        session.participants.set(publicUser.id, publicUser);
        fastify.session.set(session);
        fastify.log.info(`User ${publicUser.displayName} joined session ${session.sessionId}`);
    }
    return session;
}

export default async function (fastify, opts) {
    // Ensure the sessionManager plugin is registered.
    if (!fastify.hasDecorator('session')) {
        throw new Error('sessionManager plugin must be registered before session routes');
    }

    // ROUTE: Logs in the host user and returns a JWT token.
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                },
                required: ['email', 'password'],
                additionalProperties: false
            },
            response: {
                200: {
                    oneOf: [
                        // The standard response with the session object.
                        { 200: { $ref: 'sessionState#' } },
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
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;

            const userWithSecrets = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                omit: { passwordHash: false }
            });

            const isPasswordValid = userWithSecrets && await bcrypt.compare(password, userWithSecrets.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid email or password.');
            }

            if (userWithSecrets.isTwoFaEnabled) {
                // Create a temporary, limited-scope token.
                const tempPayload = { id: userWithSecrets.id, scope: 'totp' };
                const tempToken = fastify.jwt.sign(tempPayload, { expiresIn: '5m' });

                // Send a specific response telling the frontend that 2FA is required.
                return { twoFactorChallenge: { tempToken: tempToken } };
            }

            // Fetch the public user object to return.
            const publicUser = await fastify.prisma.user.findUnique({ where: { id: userWithSecrets.id } });

            // Handle session creation or joining.
            const session = await handleSuccessfulLogin(fastify, reply, publicUser);

            // Return the latest session state
            return { participants: Array.from(session.participants.values()) };

        } catch (error) {
            fastify.log.error(error, 'Login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during login.');
        }
    });

    // ROUTE: Handles TOTP verification during login.
    fastify.post('/login/totp', {
        schema: {
            body: {
                type: 'object',
                properties: { code: { type: 'string' } },
                required: ['code'],
                additionalProperties: false
            },
            response: {
                200: { $ref: 'sessionState#' },
                401: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const decodedTempToken = await request.jwtVerify();

            if (decodedTempToken.scope !== 'totp') {
                throw fastify.httpErrors.unauthorized('Invalid token scope.');
            }

            // Fetch the user's secret and verify the TOTP code from the request body.
            const userWithSecrets = await fastify.prisma.user.findUnique({
                where: { id: decodedTempToken.id },
                omit: { totpSecret: false }
            });
            const isValid = fastify.totp.verify(request.body.code, userWithSecrets.totpSecret);

            if (!isValid) {
                throw fastify.httpErrors.unauthorized('Invalid TOTP code.');
            }

            // Fetch the public user object to return.
            const publicUser = await fastify.prisma.user.findUnique({ where: { id: userWithSecrets.id } });

            // Handle session creation or joining.
            const session = await handleSuccessfulLogin(fastify, reply, publicUser);

            // Return the latest session state
            return { participants: Array.from(session.participants.values()) };

        } catch (error) {
            fastify.log.error(error, 'TOTP login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.unauthorized('Invalid or expired TOTP session.');
        }
    });

    //---------------------------------------------------------------------------

    // ROUTE: Redirects the user to the Google sign-in page.
    fastify.get('/google', async (request, reply) => {
        // Google OAuth logic
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/google/callback', async (request, reply) => {
        // Google OAuth callback logic
    });

    //------ Session authentication required for all routes below this line ------

    //TODO: test if the hook works only for routes below this line
    fastify.addHook('preHandler', fastify.session.authorize);

    // ROUTE: Logs a user out of the session.
    fastify.post('/logout', {
        schema: {
            body: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId'],
                additionalProperties: false
            },
            response: {
                200: { $ref: 'sessionState#' },
                204: { type: 'null' },
                401: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        const { userId } = request.body;
        const session = fastify.session.get();

        if (!fastify.session.isParticipant(userId)) {
            throw fastify.httpErrors.notFound('User not found in current session.');
        }

        const loggedOutUser = session.participants.get(userId);
        session.participants.delete(userId);
        fastify.log.info(`User ${loggedOutUser.displayName} logged out of session ${session.sessionId}`);

        // End the session if the last human participant leaves
        if (session.participants.size === 1 && session.participants.has(fastify.session.AI_PLAYER_ID)) {
            fastify.session.set(null);
            reply.clearCookie('token', { path: '/' });
            fastify.log.info(`Session ${session.sessionId} ended as the last human participant left.`);
            return reply.code(204).send();
        }

        // Otherwise, just update the session
        fastify.session.set(session);

        return { participants: Array.from(session.participants.values()) };
    });

    // ROUTE: Gets the current participants of the session.
    fastify.get('/', {
        schema: {
            response: {
                200: { $ref: 'sessionState#' },
                401: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const session = fastify.session.get();

            return { participants: Array.from(session.participants.values()) };

        } catch (error) {
            fastify.log.error(error, 'Failed to get session state');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching the session state.');
        }
    });
}
