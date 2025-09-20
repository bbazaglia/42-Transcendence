import pkg from '@prisma/client';
const { FriendshipStatus } = pkg;

async function getFriendshipsForUser(prisma, userId, status, onlineUserIds = new Set(), requestType = 'INCOMING') {
    const whereClause = {
        status,
        OR: [
            { userOneId: userId },
            { userTwoId: userId }
        ]
    };

    if (status === FriendshipStatus.PENDING) {
        if (requestType === 'INCOMING') {
            whereClause.NOT = {
                actionUserId: userId
            };
        } else if (requestType === 'SENT') {
            whereClause.actionUserId = userId;
        }
    }

    const friendshipsFromDb = await prisma.friendship.findMany({
        where: whereClause,
        include: {
            userOne: true,
            userTwo: true
        }
    });

    const friendships = friendshipsFromDb.map(friendship => {
        const friendUserObject = friendship.userOneId === userId ? friendship.userTwo : friendship.userOne;

        return {
            friendshipId: friendship.id,
            status: friendship.status,
            createdAt: friendship.createdAt,
            user: {
                ...friendUserObject,
                isOnline: onlineUserIds.has(friendUserObject.id)
            }
        };
    });

    return friendships;
}

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobby.auth);

    // ROUTE: Gets a list of the current user's friends and their status.
    fastify.get('/:userId', {
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        friendships: {
                            type: 'array',
                            items: { $ref: 'friendshipDetail#' }
                        }
                    },
                    required: ['friendships']
                },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const lobby = fastify.lobby.get();
            const onlineUserIds = new Set(lobby.participants.keys());

            const friendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.ACCEPTED, onlineUserIds);
            return { friendships: friendships };

        } catch (error) {
            fastify.log.error(error, `Error fetching friends for user ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching friendships.');
        }
    });

    fastify.get('/pending/incoming/:userId', {
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        friendships: {
                            type: 'array',
                            items: { $ref: 'friendshipDetail#' }
                        }
                    },
                    required: ['friendships']
                },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const lobby = fastify.lobby.get();
            const onlineUserIds = new Set(lobby.participants.keys());

            if (!lobby.isParticipant(userId)) {
                throw fastify.httpErrors.forbidden('User must be in the lobby to view pending requests.');
            }

            const pendingFriendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds, 'INCOMING');
            return { friendships: pendingFriendships };

        } catch (error) {
            fastify.log.error(error, `Error fetching pending requests for user ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching pending requests.');
        }
    });

    fastify.get('/pending/sent/:userId', {
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        friendships: {
                            type: 'array',
                            items: { $ref: 'friendshipDetail#' }
                        }
                    },
                    required: ['friendships']
                },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const lobby = fastify.lobby.get();
            const onlineUserIds = new Set(lobby.participants.keys());

            if (!lobby.isParticipant(userId)) {
                throw fastify.httpErrors.forbidden('User must be in the lobby to view pending requests.');
            }

            const pendingFriendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds, 'SENT');
            return { friendships: pendingFriendships };

        } catch (error) {
            fastify.log.error(error, `Error fetching pending requests for user ${request.params.userId}`);
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
                        friendship: { $ref: 'friendshipDetail#' }
                    },
                    required: ['friendship']
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
            const lobby = fastify.lobby.get();

            if (!lobby.isParticipant(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to send a friend request.');
            }

            if (actorId === friendId) {
                throw fastify.httpErrors.badRequest('A user cannot send a friend request to themselves.');
            }

            const userOneId = Math.min(actorId, friendId);
            const userTwoId = Math.max(actorId, friendId);

            const newFriendshipFromDb = await fastify.prisma.friendship.create({
                data: {
                    userOneId, // Always the smaller ID
                    userTwoId,  // Always the larger ID
                    actionUserId: actorId // The user initiating the friendship
                },
                include: {
                    userOne: true,
                    userTwo: true
                }
            });

            // Find the user object of the person who is NOT the actor.
            const friendUserObject = newFriendshipFromDb.userOneId === actorId
                ? newFriendshipFromDb.userTwo
                : newFriendshipFromDb.userOne;

            // Format the response to match the 'friendshipDetail#' schema.
            const friendshipResponse = {
                friendshipId: newFriendshipFromDb.id,
                status: newFriendshipFromDb.status,
                createdAt: newFriendshipFromDb.createdAt,
                user: friendUserObject
            };

            reply.code(201);
            return { friendship: friendshipResponse };

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
    fastify.patch('/:friendshipId/accept', {
        schema: {
            params: {
                type: 'object',
                properties: { friendshipId: { type: 'integer' } },
                required: ['friendshipId']
            },
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' } // The user ACCEPTING the request
                },
                required: ['actorId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        friendship: { $ref: 'friendshipDetail#' }
                    },
                    required: ['friendship']
                },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { friendshipId } = request.params;
            const { actorId } = request.body;
            const lobby = fastify.lobby.get();

            if (!lobby.isParticipant(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to accept a friend request.');
            }

            const updatedFriendship = await fastify.prisma.friendship.update({
                where: {
                    id: friendshipId,
                    status: FriendshipStatus.PENDING,
                    NOT: { actionUserId: actorId }
                },
                data: {
                    status: FriendshipStatus.ACCEPTED
                },
                include: {
                    userOne: true,
                    userTwo: true
                }
            });

            // Format the response to return the single updated friendship object
            const friendUserObject = updatedFriendship.userOneId === actorId ? updatedFriendship.userTwo : updatedFriendship.userOne;
            const friendshipResponse = {
                friendshipId: updatedFriendship.id,
                status: updatedFriendship.status,
                createdAt: updatedFriendship.createdAt,
                user: friendUserObject
            };

            return { friendship: friendshipResponse };

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
    fastify.delete('/:friendshipId', {
        schema: {
            params: {
                type: 'object',
                properties: { friendshipId: { type: 'integer' } },
                required: ['friendshipId']
            },
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' } // The user INITIATING the removal
                },
                required: ['actorId']
            },
            response: {
                204: { type: 'null' },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { friendshipId } = request.params;
            const { actorId } = request.body;
            const lobby = fastify.lobby.get();

            if (!lobby.isParticipant(actorId)) {
                throw fastify.httpErrors.forbidden('User must be logged in to modify a friendship.');
            }

            await fastify.prisma.friendship.delete({
                where: {
                    id: friendshipId,
                    OR: [
                        { userOneId: actorId },
                        { userTwoId: actorId }
                    ]
                }
            });

            // On successful deletion, return a 204 No Content response.
            reply.code(204);

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
