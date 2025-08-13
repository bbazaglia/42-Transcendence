import bcrypt from 'bcrypt';

let activeLobby = null;
const AI_PLAYER_ID = 0;

function toPublicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        wins: user.wins,
        losses: user.losses
    };
}

async function lobbyAuth(request, reply) {
    const lobby = request.server.getLobby();

    if (!lobby) {
        reply.code(403);
        return { error: 'No active lobby session.' };
    }

    if (lobby.host.id !== request.user.id) {
        reply.code(403);
        return { error: 'You are not the host of the active lobby.' };
    }
}

export default async function (fastify, opts) {
    fastify.decorate('getLobby', () => activeLobby);
    fastify.decorate('lobbyAuth', lobbyAuth);

    // All lobby management routes require the host to be authenticated.
    fastify.addHook('preHandler', fastify.authenticate);

    // ROUTE: Creates a new lobby session.
    fastify.post('/create', {
        schema: {
            response: {
                201: { $ref: 'lobbyState#' },
                409: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        if (activeLobby) {
            reply.code(409); // Conflict
            return { error: 'A lobby is already in session.' };
        }

        const hostUser = request.user;
        activeLobby = {
            host: hostUser,
            participants: new Map()
        };

        activeLobby.participants.set(hostUser.id, hostUser);
        activeLobby.participants.set(AI_PLAYER_ID, {
            id: AI_PLAYER_ID,
            displayName: 'AI Bot',
            avatarUrl: '/avatars/ai-avatar.png',
            wins: 0,
            losses: 0
        });

        fastify.log.info(`Lobby created by host: ${hostUser.displayName}`);

        // Return the initial state.
        reply.code(201);
        return {
            host: toPublicUser(hostUser),
            participants: Array.from(activeLobby.participants.values()).map(toPublicUser)
        };
    });

    // ROUTE: Deletes the current lobby session.
    fastify.delete('/', {
        schema: {
            response: {
                204: { type: 'null' },
                403: { $ref: 'errorResponse#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        fastify.log.info(`Lobby deleted by host: ${activeLobby.host.displayName}`);
        activeLobby = null;
        reply.code(204); // No Content
        return;
    });

    // ROUTE: A guest joins the lobby.
    fastify.post('/join', {
        schema: {
            body: {
                type: 'object',
                required: ['displayName', 'password'],
                properties: {
                    displayName: { type: 'string' },
                    password: { type: 'string' }
                }
            },
            response: {
                200: { $ref: 'lobbyState#' },
                401: { $ref: 'errorResponse#' },
                409: { $ref: 'errorResponse#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        const { displayName, password } = request.body;
        const guestUser = await fastify.prisma.user.findUnique({ where: { displayName } });
        const isPasswordValid = guestUser && await bcrypt.compare(password, guestUser.passwordHash);

        if (!isPasswordValid) {
            reply.code(401);
            return { error: 'Invalid credentials.' };
        }
        if (guestUser.id === activeLobby.host.id || activeLobby.participants.has(guestUser.id)) {
            reply.code(409);
            return { error: 'User is already in the lobby.' };
        }

        activeLobby.participants.set(guestUser.id, guestUser);

        // Return the new state.
        return {
            host: toPublicUser(activeLobby.host),
            participants: Array.from(activeLobby.participants.values()).map(toPublicUser)
        };
    });

    // ROUTE: A participant leaves the lobby.
    fastify.post('/leave', {
        schema: {
            body: {
                type: 'object',
                required: ['userId'],
                properties: {
                    userId: { type: 'integer' }
                }
            },
            response: {
                200: { $ref: 'lobbyState#' },
                400: { $ref: 'errorResponse#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        const { userId } = request.body;
        if (userId === activeLobby.host.id || userId === AI_PLAYER_ID || !activeLobby.participants.has(userId)) {
            reply.code(400);
            return { error: 'Participant cannot be removed.' };
        }

        activeLobby.participants.delete(userId);

        // Return the new state.
        return {
            host: toPublicUser(activeLobby.host),
            participants: Array.from(activeLobby.participants.values()).map(toPublicUser)
        };
    });

    // ROUTE: Updates a participant's profile.
    fastify.patch('/participants/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
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
                400: { $ref: 'errorResponse#' },
                404: { $ref: 'errorResponse#' }
            }
        },
        preHandler: [fastify.lobbyAuth]
    }, async (request, reply) => {
        const userId = request.params.id;
        if (userId === AI_PLAYER_ID || !activeLobby.participants.has(userId)) {
            reply.code(404);
            return { error: 'Participant not found or cannot be updated.' };
        }

        const { displayName, avatarUrl } = request.body;

        if (displayName === undefined && avatarUrl === undefined) {
            reply.code(400);
            return { error: 'Request body must contain at least one field to update (displayName or avatarUrl).' };
        }

        const updatedUser = await fastify.prisma.user.update({
            where: { id: userId },
            data: { displayName, avatarUrl } // Prisma handles undefined fields
        });

        activeLobby.participants.set(userId, updatedUser);
        if (userId === activeLobby.host.id) {
            activeLobby.host = updatedUser;
        }

        // Return the new state.
        return {
            host: toPublicUser(activeLobby.host),
            participants: Array.from(activeLobby.participants.values()).map(toPublicUser)
        };
    });
}
