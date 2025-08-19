import { FriendshipStatus } from '@prisma/client';

async function getFriendsForUser(prisma, userId, status, onlineUserIds = new Set()) {
    const whereClause = {
        status,
        OR: [
            { userOneId: userId },
            { userTwoId: userId }
        ]
    };

    // Filter for only received requests if we're looking for pending requests
    if (status === FriendshipStatus.PENDING) {
        whereClause.NOT = {
            actionUserId: userId
        };
    }

    const friendships = await prisma.friendship.findMany({
        where: whereClause,
        select: {
            userOne: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
            userTwo: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
            userOneId: true,
            userTwoId: true
        }
    });

    const friends = friendships.map(friendship => {
        const friend = friendship.userOneId === userId ? friendship.userTwo : friendship.userOne;
        // Add the isOnline flag before returning
        return {
            ...friend,
            isOnline: onlineUserIds.has(friend.id)
        }
    });

    return friends;
}

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobbyAuth);

    // ROUTE: Gets a list of the current user's friends and their status.
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } },
                required: ['id']
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.id;
            const onlineUserIds = new Set(fastify.getLobby().participants.keys());

            const friends = await getFriendsForUser(fastify.prisma, userId, FriendshipStatus.ACCEPTED, onlineUserIds);
            return friends;

        } catch (error) {
            fastify.log.error(error, `Error fetching friends for user ${userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching friendships.');
        }
    });

    fastify.get('/pending/:id', {
        schema: {
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } },
                required: ['id']
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.id;
            const lobby = fastify.getLobby();
            const onlineUserIds = new Set(lobby.participants.keys());

            if (!lobby.participants.has(userId)) {
                throw fastify.httpErrors.forbidden('User must be in the lobby to view pending requests.');
            }

            const requests = await getFriendsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds);
            return requests;

        } catch (error) {
            fastify.log.error(error, `Error fetching pending requests for user ${userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching pending requests.');
        }
    });

    // ROUTE: Sends a friend request to another user.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' },
                    friendId: { type: 'integer' }
                },
                required: ['actorId', 'friendId']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        userOneId: { type: 'integer' },
                        userTwoId: { type: 'integer' },
                        status: { type: 'string', enum: [FriendshipStatus.PENDING] },
                        actionUserId: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                400: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { actorId, friendId } = request.body;
            const lobby = fastify.getLobby();

            if (!lobby.participants.has(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to send a friend request.');
            }

            if (actorId === friendId) {
                throw fastify.httpErrors.badRequest('A user cannot send a friend request to themselves.');
            }

            const userOneId = Math.min(actorId, friendId);
            const userTwoId = Math.max(actorId, friendId);

            const newFriendship = await fastify.prisma.friendship.create({
                data: {
                    userOneId, // Always the smaller ID
                    userTwoId,  // Always the larger ID
                    actionUserId: actorId // The user initiating the friendship
                },
                select: {
                    userOneId: true,
                    userTwoId: true,
                    status: true,
                    actionUserId: true,
                    createdAt: true
                }
            });

            reply.code(201);
            return newFriendship;

        } catch (error) {
            fastify.log.error(error, 'Error creating friendship for user', actorId);
            // This will catch the error from the @@unique constraint if the friendship already exists.
            if (error.code === 'P2002') { // Prisma's unique constraint violation code
                return reply.conflict('A friendship with this user already exists.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred.');
        }
    });

    // ROUTE: Accepts a pending friend request.
    fastify.patch('/accept', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' }, // The user ACCEPTING the request
                    senderId: { type: 'integer' } // The user who SENT the request
                },
                required: ['actorId', 'senderId']
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { actorId, senderId } = request.body;
            const lobby = fastify.getLobby();
            const onlineUserIds = new Set(lobby.participants.keys());

            if (!lobby.participants.has(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to accept a friend request.');
            }

            const userOneId = Math.min(actorId, senderId);
            const userTwoId = Math.max(actorId, senderId);

            await fastify.prisma.friendship.update({
                where: {
                    userOneId_userTwoId: { userOneId, userTwoId },
                    status: FriendshipStatus.PENDING,
                    actionUserId: senderId
                },
                data: {
                    status: FriendshipStatus.ACCEPTED
                }
            });

            return await getFriendsForUser(fastify.prisma, actorId, FriendshipStatus.ACCEPTED, onlineUserIds);

        } catch (error) {
            fastify.log.error(error, 'Error accepting friendship for user', actorId);
            // If the `where` clause fails to find a match, Prisma throws P2025.
            if (error.code === 'P2025') {
                return reply.notFound('No pending friend request found from this user.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred when accepting the friend request.');
        }
    });

    // ROUTE: Removes a friendship between two participants.
    fastify.delete('/', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' },          // The user INITIATING the removal
                    friendIdToRemove: { type: 'integer' } // The friend being removed
                },
                required: ['actorId', 'friendIdToRemove']
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { actorId, friendIdToRemove } = request.body;
            const lobby = fastify.getLobby();
            const onlineUserIds = new Set(lobby.participants.keys());

            if (!lobby.participants.has(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to delete a friendship.');
            }

            const userOneId = Math.min(actorId, friendIdToRemove);
            const userTwoId = Math.max(actorId, friendIdToRemove);

            await fastify.prisma.friendship.delete({
                where: {
                    userOneId_userTwoId: { userOneId, userTwoId },
                    // userOneId_userTwoId is a composite key based on the @@unique constraint created by prisma
                }
            });

            const friends = await getFriendsForUser(fastify.prisma, actorId, FriendshipStatus.ACCEPTED, onlineUserIds);
            return friends;

        } catch (error) {
            fastify.log.error(error, 'Error deleting friendship');
            // If no friendship exists, Prisma will throw an error.
            if (error.code === 'P2025') { // Prisma's record not found code
                return reply.notFound('Friendship not found for requesting user.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while removing the friendship.');
        }
    });
}
