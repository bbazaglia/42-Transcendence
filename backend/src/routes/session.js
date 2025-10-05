import bcrypt from 'bcrypt';

async function handleSuccessfulLogin(request, reply, fastify, user) {
    let participantIds = [];
    let sessionId;

    try {
        // Check for an existing JWT on the request to join a session
        await request.jwtVerify();
        sessionId = request.user.sessionId;
        const existingSession = await request.sessionStore.get(sessionId);
        if (existingSession) {
            participantIds = existingSession.participants || [];
        }
    } catch (err) {
        // No valid JWT, so we'll create a new session
        const tempSession = request.session; // Get a blank session object to steal its ID
        sessionId = tempSession.sessionId;
    }

    if (participantIds.includes(user.id)) {
        throw fastify.httpErrors.conflict('User is already in the session.');
    }
    participantIds.push(user.id);

    // Save the updated session state
    await request.sessionStore.set(sessionId, { participants: participantIds });

    // Create/update the JWT cookie
    const token = await reply.jwtSign({ sessionId });
    reply.setCookie('token', token, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', signed: true });

    // Return the full participant list for the frontend
    return fastify.getHydratedParticipants(participantIds);
}

export default async function (fastify, opts) {
    // ROUTE: Logs in a user, creating or joining a session.
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
                        { $ref: 'sessionState#' },
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

            // Standard login flow: Verify email and password.
            const userWithSecrets = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                omit: { email: false, passwordHash: false }
            });

            const isPasswordValid = userWithSecrets && await bcrypt.compare(password, userWithSecrets.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid email or password.');
            }

            //  2FA check
            if (userWithSecrets.isTwoFaEnabled) {
                // Create a temporary, limited-scope token.
                const tempPayload = { id: userWithSecrets.id, scope: 'totp' };
                const tempToken = fastify.jwt.sign(tempPayload, { expiresIn: '5m' });

                // Send a specific response telling the frontend that 2FA is required.
                return { twoFactorChallenge: { tempToken: tempToken } };
            }

            const publicUser = await fastify.prisma.user.findUnique({ where: { id: userWithSecrets.id } });
            const hydratedParticipants = await handleSuccessfulLogin(request, reply, fastify, publicUser);
            fastify.log.info(`User ${publicUser.displayName} logged in successfully.`);
            return { participants: hydratedParticipants };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Login failed');
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

            const publicUser = await fastify.prisma.user.findUnique({ where: { id: decodedTempToken.id } });
            const hydratedParticipants = await handleSuccessfulLogin(request, reply, fastify, publicUser);
            fastify.log.info(`User ${publicUser.displayName} passed TOTP verification and logged in successfully.`);
            return { participants: hydratedParticipants };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'TOTP login failed');
            return reply.unauthorized('Invalid or expired TOTP session.');
        }
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/google/callback', {
        schema: {
            response: {
                302: { type: 'string', format: 'uri' },
                401: { $ref: 'httpError#' },
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
                avatarUrl: googleData.picture,
            };

            const existingUser = await fastify.prisma.user.findUnique({
                where: { email: user.email.toLowerCase() },
                select: { displayName: true }
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

            // We wrap the call to handle the case where a user is already in a session
            // but logs in with Google again.
            try {
                await handleSuccessfulLogin(request, reply, fastify, dbUser);
            } catch (error) {
                if (error.statusCode !== 409) { // Re-throw if it's not the expected conflict
                    throw error;
                }
                fastify.log.info(`User ${dbUser.displayName} is already in a session, proceeding with OAuth login.`);
            }

            fastify.log.info(`User ${dbUser.displayName} registered/logged in via Google OAuth`);
            return reply.redirect(process.env.FRONTEND_URL);

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Oauth Registration failed');
            return reply.internalServerError('An unexpected error occurred during oauth registration.');
        }
    });

    //------ Session authentication required for all routes below this line ------

    // ROUTE: Logs a user out of the session.
    fastify.post('/logout', {
        preHandler: [fastify.authorizeParticipant],
        schema: {
            body: {
                type: 'object',
                properties: { actorId: { type: 'integer' } },
                required: ['actorId'],
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
            const { actorId } = request.body;
            fastify.log.debug(`Logout attempt for user ID: ${actorId} from session ${request.user.sessionId}`);

            // The authorize hook has already loaded the session into request.sessionData.
            request.sessionData.participants = request.sessionData.participants.filter(id => id !== actorId);

            // If the last participant has left, destroy the session.
            if (request.sessionData.participants.length === 0) {
                await request.sessionStore.destroy(request.user.sessionId);
                reply.clearCookie('token', { path: '/' });
                fastify.log.info(`Session ${request.user.sessionId} ended as the last participant left.`);
                return reply.code(204).send();
            }

            await request.saveSession();

            const hydratedParticipants = await fastify.getHydratedParticipants(request.sessionData.participants);
            return { participants: hydratedParticipants };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Logout failed');
            return reply.internalServerError('An unexpected error occurred during logout.');
        }
    });

    // ROUTE: Gets the current participants of the session.
    fastify.get('/', {
        preHandler: [fastify.authorize],
        schema: {
            response: {
                200: { $ref: 'sessionState#' },
                401: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            // The authorize hook has already loaded the lean session into request.sessionData.
            // All we need to do is hydrate the IDs and return the result.
            const hydratedParticipants = await fastify.getHydratedParticipants(request.sessionData.participants);
            return { participants: hydratedParticipants };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Failed to get session state');
            return reply.internalServerError('An unexpected error occurred while fetching the session state.');
        }
    });
}
