import { FriendshipStatus } from '@prisma/client';

async function getFriendshipsForUser(prisma, userId, status, onlineUserIds) {
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
        include: {
            userOne: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true } },
            userTwo: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true } }
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
                required: ['id'],
                properties: { id: { type: 'integer' } }
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const userId = request.params.id;
        const lobby = fastify.getLobby();
        const onlineUserIds = new Set(fastify.getLobby().participants.keys());

        try {
            const friends = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.ACCEPTED, onlineUserIds);
            return friends;
        } catch (error) {
            fastify.log.error(error, `Error fetching friends for user ${userId}`);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching friendships.' };
        }
    });

    fastify.get('/pending/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer' } }
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const userId = request.params.id;
        const lobby = fastify.getLobby();
        const onlineUserIds = new Set(fastify.getLobby().participants.keys());

        if (!lobby.participants.has(userId)) {
            reply.code(403);
            return { error: 'User must be in the lobby to view pending requests.' };
        }

        try {
            const requests = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds);
            return requests;
        } catch (error) {
            fastify.log.error(error, `Error fetching pending requests for user ${userId}`);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching pending requests.' };
        }
    });

    // ROUTE: Sends a friend request to another user.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['actorId', 'friendId'],
                properties: {
                    actorId: { type: 'integer' },
                    friendId: { type: 'integer' }
                }
            },
            response: {
                201: { type: 'object', properties: { message: { type: 'string' } } },
                400: { $ref: 'errorResponse#' },
                403: { $ref: 'errorResponse#' },
                409: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { actorId, friendId } = request.body;
        const lobby = fastify.getLobby();

        if (!lobby.participants.has(actorId)) {
            reply.code(403);
            return { error: 'User must be logged in to send a friend request.' };
        }

        if (actorId === friendId) {
            reply.code(400);
            return { error: 'A user cannot send a friend request to themselves.' };
        }

        const userOneId = Math.min(actorId, friendId);
        const userTwoId = Math.max(actorId, friendId);

        try {
            await fastify.prisma.friendship.create({
                data: {
                    userOneId, // Always the smaller ID
                    userTwoId,  // Always the larger ID
                    status: FriendshipStatus.PENDING,
                    actionUserId: actorId // The user initiating the friendship
                }
            });

            reply.code(201);
            return { message: 'Friend request sent successfully.' };
        } catch (error) {
            // This will catch the error from the @@unique constraint if the friendship already exists.
            if (error.code === 'P2002') { // Prisma's unique constraint violation code
                reply.code(409); // 409 Conflict
                return { error: 'A friendship with this user already exists.' };
            }
            fastify.log.error(error, 'Error creating friendship');
            reply.code(500);
            return { error: 'An unexpected error occurred.' };
        }
    });

    // ROUTE: Accepts a pending friend request.
    fastify.patch('/accept', {
        schema: {
            body: {
                type: 'object',
                required: ['actorId', 'senderId'],
                properties: {
                    actorId: { type: 'integer' }, // The user ACCEPTING the request
                    senderId: { type: 'integer' } // The user who SENT the request
                }
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                403: { $ref: 'errorResponse#' },
                404: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { actorId, senderId } = request.body;
        const lobby = fastify.getLobby();
        const onlineUserIds = new Set(fastify.getLobby().participants.keys());

        if (!lobby.participants.has(actorId)) {
            reply.code(403);
            return { error: 'User must be logged in to accept a friend request.' };
        }

        const userOneId = Math.min(actorId, senderId);
        const userTwoId = Math.max(actorId, senderId);

        try {
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

            return await getFriendshipsForUser(fastify.prisma, actorId, FriendshipStatus.ACCEPTED, onlineUserIds);

        } catch (error) {
            // If the `where` clause fails to find a match, Prisma throws P2025.
            if (error.code === 'P2025') {
                reply.code(404); // 404 Not Found
                return { error: 'No pending friend request found from this user.' };
            }
            fastify.log.error(error, 'Error accepting friendship');
            reply.code(500);
            return { error: 'An unexpected error occurred.' };
        }
    });

    // ROUTE: Removes a friendship between two participants.
    fastify.delete('/', {
        schema: {
            body: {
                type: 'object',
                required: ['actorId', 'friendIdToRemove'],
                properties: {
                    actorId: { type: 'integer' },          // The user INITIATING the removal
                    friendIdToRemove: { type: 'integer' } // The friend being removed
                }
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                403: { $ref: 'errorResponse#' },
                404: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { actorId, friendIdToRemove } = request.body;
        const lobby = fastify.getLobby();
        const onlineUserIds = new Set(fastify.getLobby().participants.keys());

        if (!lobby.participants.has(actorId)) {
            reply.code(403);
            return { error: 'User must be logged in to delete a friendship.' };
        }

        try {
            const userOneId = Math.min(actorId, friendIdToRemove);
            const userTwoId = Math.max(actorId, friendIdToRemove);

            await fastify.prisma.friendship.delete({
                where: {
                    userOneId_userTwoId: { userOneId, userTwoId },
                    // userOneId_userTwoId is a composite key based on the @@unique constraint created by prisma
                }
            });

            const friends = await getFriendshipsForUser(fastify.prisma, actorId, FriendshipStatus.ACCEPTED, onlineUserIds);
            return friends;
        } catch (error) {
            // If no friendship exists, Prisma will throw an error.
            if (error.code === 'P2025') { // Prisma's record not found code
                reply.code(404);
                return { error: 'Friendship not found for requesting user.' };
            }
            fastify.log.error(error, 'Error deleting friendship');
            reply.code(500);
            return { error: 'An unexpected error occurred while removing the friendship.' };
        }
    });
}
