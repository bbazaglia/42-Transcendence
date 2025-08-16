import bcrypt from 'bcrypt';

export default async function (fastify, opts) {
    // Ensure decorators plugin is registered before routes (avoid soft dependency).
    if (
        typeof fastify.hasDecorator !== 'function' ||
        !fastify.hasDecorator('getLobby') ||
        !fastify.hasDecorator('setLobby') ||
        !fastify.hasDecorator('lobbyAuth') ||
        !fastify.hasDecorator('AI_PLAYER_ID') ||
        !fastify.hasDecorator('toPublicUser')
    ) {
        throw new Error('lobbyPlugin must be registered before lobby routes');
    }

    // All lobby management routes require the host to be authenticated.
    fastify.addHook('preHandler', fastify.authenticate);

    const toPublicUser = fastify.toPublicUser;
    const AI_PLAYER_ID = fastify.AI_PLAYER_ID;

    // ROUTE: Creates a new lobby session.
    fastify.post('/create', {
        schema: {
            response: {
                201: { $ref: 'lobbyState#' },
                409: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const lobby = fastify.getLobby();
            if (lobby) {
                throw fastify.httpErrors.conflict('A lobby is already in session.');
            }

            const hostUser = request.user;
            const newLobby = {
                host: hostUser,
                participants: new Map()
            };

            newLobby.participants.set(hostUser.id, hostUser);
            newLobby.participants.set(AI_PLAYER_ID, {
                id: AI_PLAYER_ID,
                displayName: 'AI Bot',
                avatarUrl: '/avatars/ai-avatar.png',
                wins: 0,
                losses: 0
            });

            fastify.setLobby(newLobby);
            fastify.log.info(`Lobby created by host: ${hostUser.displayName}`);

            // Return the initial state.
            reply.code(201);
            return {
                host: toPublicUser(hostUser),
                participants: Array.from(newLobby.participants.values()).map(toPublicUser)
            };
        } catch (error) {
            fastify.log.error(error, 'Error creating lobby');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while creating the lobby.');
        }
    });

    // ROUTE: Deletes the current lobby session.
    fastify.delete('/', {
        schema: {
            response: {
                204: { type: 'null' },
                403: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        const lobby = fastify.getLobby();

        fastify.log.info(`Lobby deleted by host: ${lobby.host.displayName}`);
        fastify.setLobby(null);

        return reply.code(204).send(); // No Content
    });

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
                200: { $ref: 'lobbyState#' },
                401: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        try {
            const { displayName, password } = request.body;

            const lobby = fastify.getLobby();
            const guestUser = await fastify.prisma.user.findUnique({ where: { displayName } });
            const isPasswordValid = guestUser && await bcrypt.compare(password, guestUser.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid credentials.');
            }

            if (guestUser.id === lobby.host.id || lobby.participants.has(guestUser.id)) {
                throw fastify.httpErrors.conflict('User is already in the lobby.');
            }

            lobby.participants.set(guestUser.id, guestUser);
            fastify.setLobby(lobby); // Update the lobby state

            // Return the new state.
            return {
                host: toPublicUser(lobby.host),
                participants: Array.from(lobby.participants.values()).map(toPublicUser)
            };
        } catch (error) {
            fastify.log.error(error, 'Error joining lobby');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while joining the lobby.');
        }
    });

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
                200: { $ref: 'lobbyState#' },
                400: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        try {
            const { userId } = request.body;

            const lobby = fastify.getLobby();
            if (userId === lobby.host.id || userId === AI_PLAYER_ID || !lobby.participants.has(userId)) {
                throw fastify.httpErrors.badRequest('Participant cannot be removed.');
            }

            lobby.participants.delete(userId);
            fastify.setLobby(lobby);

            // Return the new state.
            return {
                host: toPublicUser(lobby.host),
                participants: Array.from(lobby.participants.values()).map(toPublicUser)
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
                200: { $ref: 'lobbyState#' },
                400: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        try {
            const userId = request.params.id;
            const lobby = fastify.getLobby();
            if (userId === AI_PLAYER_ID || !lobby.participants.has(userId)) {
                throw fastify.httpErrors.notFound('Participant not found or cannot be updated.');
            }

            const { displayName, avatarUrl } = request.body;

            if (displayName === undefined && avatarUrl === undefined) {
                throw fastify.httpErrors.badRequest('Request body must contain at least one field to update (displayName or avatarUrl).');
            }

            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: { displayName, avatarUrl } // Prisma handles undefined fields
            });

            lobby.participants.set(userId, updatedUser);
            if (userId === lobby.host.id) {
                lobby.host = updatedUser;
            }
            fastify.setLobby(lobby);

            // Return the new state.
            return {
                host: toPublicUser(lobby.host),
                participants: Array.from(lobby.participants.values()).map(toPublicUser)
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
