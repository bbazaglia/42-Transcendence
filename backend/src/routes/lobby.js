import bcrypt from 'bcrypt';

export default async function (fastify, opts) {
    // Ensure decorators plugin is registered before routes (avoid soft dependency).
    if (typeof fastify.hasDecorator !== 'function' || !fastify.hasDecorator('lobby')) {
        throw new Error('lobbySetup plugin must be registered before lobby routes');
    }

    // All lobby management routes require the host to be authenticated.
    fastify.addHook('preHandler', fastify.authenticate);

    const AI_PLAYER_ID = fastify.lobby.AI_PLAYER_ID;
    const AI_PLAYER = fastify.lobby.AI_PLAYER;

    // ROUTE: Creates a new lobby session.
    fastify.post('/create', {
        schema: {
            response: {
                201: {
                    type: 'object',
                    properties: {
                        lobby: { $ref: 'lobbyState#' }
                    },
                    required: ['lobby']
                },
                409: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const lobby = fastify.lobby.get();
            if (lobby) {
                throw fastify.httpErrors.conflict('A lobby is already in session.');
            }

            const hostUser = await fastify.prisma.user.findUnique({
                where: { id: request.user.id },
            });

            const newLobby = {
                host: hostUser,
                participants: new Map()
            };

            newLobby.participants.set(hostUser.id, hostUser);
            newLobby.participants.set(AI_PLAYER_ID, AI_PLAYER);

            fastify.lobby.set(newLobby);
            fastify.log.info(`Lobby created by host: ${hostUser.displayName}`);

            // Return the initial state.
            reply.code(201);
            return {
                lobby: {
                    host: hostUser,
                    participants: Array.from(newLobby.participants.values())
                }
            };

        } catch (error) {
            fastify.log.error(error, 'Error creating lobby');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while creating the lobby.');
        }
    });

    // ROUTE: Gets the current state of the lobby.
    fastify.get('/', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        lobby: { $ref: 'lobbyState#' }
                    },
                    required: ['lobby']
                },
                401: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobby.auth]
    }, async (request, reply) => {
        const lobby = fastify.lobby.get();

        return {
            lobby: {
                host: lobby.host,
                participants: Array.from(lobby.participants.values())
            }
        };
    });

    // ROUTE: Deletes the current lobby session.
    fastify.delete('/', {
        schema: {
            response: {
                204: { type: 'null' },
                403: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobby.auth]
    }, async (request, reply) => {
        const lobby = fastify.lobby.get();

        fastify.log.info(`Lobby deleted by host: ${lobby.host.displayName}`);
        fastify.lobby.set(null);

        return reply.code(204).send(); // No Content
    });

    // TODO: Include 2fa logic
    // ROUTE: A guest joins the lobby.
    fastify.post('/join', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string' },
                    password: { type: 'string' }
                },
                required: ['displayName', 'password']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        lobby: { $ref: 'lobbyState#' }
                    },
                    required: ['lobby']
                },
                401: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobby.auth]
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;
            const lobby = fastify.lobby.get();

            const guestUserWithSecrets = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                omit: { passwordHash: false } // Explicitly include passwordHash
            });

            const isPasswordValid = guestUserWithSecrets && await bcrypt.compare(password, guestUserWithSecrets.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid credentials.');
            }

            // Now that validation is done, get the public version of the user.
            const guestUser = await fastify.prisma.user.findUnique({
                where: { id: guestUserWithSecrets.id },
            });

            if (guestUser.id === lobby.host.id || lobby.isParticipant(guestUser.id)) {
                throw fastify.httpErrors.conflict('User is already in the lobby.');
            }

            lobby.participants.set(guestUser.id, guestUser);
            fastify.lobby.set(lobby); // Update the lobby state

            // Return the new state.
            return {
                lobby: {
                    host: lobby.host,
                    participants: Array.from(lobby.participants.values())
                }
            };

        } catch (error) {
            fastify.log.error(error, 'Error joining lobby');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while joining the lobby.');
        }
    });

    // TODO: Implement 2FA logic
    // ROUTE: A guest joins the lobby with 2FA.
    fastify.post('/join/2fa', async (request, reply) => {
    });

    // TODO: update host if host leaves
    // ROUTE: A participant leaves the lobby.
    fastify.post('/leave', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    userId: { type: 'integer' }
                },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        lobby: { $ref: 'lobbyState#' }
                    },
                    required: ['lobby']
                },
                400: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobby.auth]
    }, async (request, reply) => {
        try {
            const { userId } = request.body;

            const lobby = fastify.lobby.get();
            if (userId === lobby.host.id || userId === AI_PLAYER_ID || !lobby.isParticipant(userId)) {
                throw fastify.httpErrors.badRequest('Participant cannot be removed.');
            }

            lobby.participants.delete(userId);
            fastify.lobby.set(lobby);

            // Return the new state.
            return {
                lobby: {
                    host: lobby.host,
                    participants: Array.from(lobby.participants.values())
                }
            };

        } catch (error) {
            fastify.log.error(error, 'Error leaving lobby');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while leaving the lobby.');
        }
    });

    // ROUTE: Updates a participant's profile.
    fastify.patch('/participants/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                },
                required: ['id']
            },
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string' },
                    avatarUrl: { type: 'string', format: 'uri-reference' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        lobby: { $ref: 'lobbyState#' }
                    },
                    required: ['lobby']
                },
                400: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobby.auth]
    }, async (request, reply) => {
        try {
            const userId = request.params.id;
            const lobby = fastify.lobby.get();
            if (userId === AI_PLAYER_ID || !lobby.isParticipant(userId)) {
                throw fastify.httpErrors.notFound('Participant not found or cannot be updated.');
            }

            const { displayName, avatarUrl } = request.body;

            if (displayName === undefined && avatarUrl === undefined) {
                throw fastify.httpErrors.badRequest('Request body must contain at least one field to update (displayName or avatarUrl).');
            }

            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: { displayName, avatarUrl }, // Prisma handles undefined fields
            });

            lobby.participants.set(userId, updatedUser);
            if (userId === lobby.host.id) {
                lobby.host = updatedUser;
            }
            fastify.lobby.set(lobby);

            // Return the new state.
            return {
                lobby: {
                    host: lobby.host,
                    participants: Array.from(lobby.participants.values())
                }
            };

        } catch (error) {
            fastify.log.error(error, `Error updating participant profile ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while updating participant profile.');
        }
    });
}
