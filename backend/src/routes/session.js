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
            fastify.log.debug(`Login attempt for email: ${email}`);

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
            fastify.log.debug(`User ${publicUser.displayName} logged in successfully without TOTP.`);
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
            fastify.log.debug(`TOTP verification attempt for user ID: ${decodedTempToken.id}`);

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
            fastify.log.debug(`User ${publicUser.displayName} passed TOTP verification and logged in successfully.`);
            return { participants: Array.from(session.participants.values()) };

        } catch (error) {
            fastify.log.error(error, 'TOTP login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.unauthorized('Invalid or expired TOTP session.');
        }
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/google/callback', {
        schema: {
            response: {
                201: { $ref: 'publicUser#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            },
        },
    }, async (request, reply) => {
        try {
            const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            fastify.log.debug('Received Google OAuth token');

            const googleResponse = await fetch(process.env.GOOGLE_OAUTH_USER_INFO_URL, {
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                },
            });

            const googleData = await googleResponse.json();

            let user = {
                displayName: googleData.name,
                email: googleData.email,
                googleId: googleData.id,
                avatarUrl: googleData.picture, //TODO download it from google URL and store it locally.
            };

            const existingUser = await fastify.prisma.user.findUnique({
                where: { email: user.email.toLowerCase() }
            });

            const generateUsername = (base = "user") => {
                const randomPart = Math.floor(100000 + Math.random() * 900000);
                return `${base}_${randomPart}`;
            };

            if (!existingUser) {
                user.displayName = (await fastify.prisma.user.findFirst({
                    where: { displayName: user.displayName }
                })) ? generateUsername() : user.displayName;
            } else {
                user.displayName = existingUser.displayName;
            }

            const dbUser = await fastify.prisma.user.upsert({
                where: { email: user.email.toLowerCase() },
                update: { ...user },
                create: { ...user },
            });

            // We use our existing login handler. It will create the session and set the cookie if needed.
            // We wrap it in a try-catch to ignore the "already in session" conflict for OAuth and redirect
            // the user to the frontend anyway.
            try {
                await handleSuccessfulLogin(fastify, reply, dbUser);
            } catch (error) {
                if (error.statusCode !== 409) { // Re-throw if it's not the expected conflict
                    throw error;
                }
                fastify.log.info(`User ${dbUser.displayName} is already in a session, proceeding with OAuth login.`);
            }

            fastify.log.info(`User ${dbUser.displayName} registered/logged in via Google OAuth`);
            return reply.redirect(process.env.FRONTEND_URL);

        } catch (error) {
            fastify.log.error(error, 'Oauth Registration failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during oauth registration.');
        }
    });

    //------ Session authentication required for all routes below this line ------

    // ROUTE: Logs a user out of the session.
    fastify.post('/logout', {
        preHandler: [fastify.session.authorize],
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
        try {
            const { userId } = request.body;
            const session = fastify.session.get();
            fastify.log.debug(`Logout attempt for user ID: ${userId} from session ${session.sessionId}`);

            if (!fastify.session.isParticipant(userId)) {
                throw fastify.httpErrors.notFound('User not found in current session.');
            }

            const loggedOutUser = session.participants.get(userId);
            session.participants.delete(userId);
            fastify.log.info(`User ${loggedOutUser.displayName} logged out of session ${session.sessionId}`);

            // If the last participant has left, end the session.
            if (session.participants.size === 0) {
                fastify.session.set(null);
                reply.clearCookie('token', { path: '/' });
                fastify.log.info(`Session ${session.sessionId} ended as the last participant left.`);
                return reply.code(204).send();
            }

            // Otherwise, just update the session
            fastify.session.set(session);

            return { participants: Array.from(session.participants.values()) };

        } catch (error) {
            fastify.log.error(error, 'Logout failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during logout.');
        }
    });

    // ROUTE: Gets the current participants of the session.
    fastify.get('/', {
        preHandler: [fastify.session.authorize],
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
