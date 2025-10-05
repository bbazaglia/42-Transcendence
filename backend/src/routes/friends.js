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
    // Ensure the sessionManager plugin is registered.
    if (!fastify.hasDecorator('session')) {
        throw new Error('sessionManager plugin must be registered before this file');
    }

    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.session.authorizeParticipant);

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
            const session = fastify.session.get();
            const onlineUserIds = new Set(session.participants.keys());
            fastify.log.debug(`Fetching friends for user ${userId}. Online users: ${Array.from(onlineUserIds).join(', ')}`);

            const friendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.ACCEPTED, onlineUserIds);
            fastify.log.debug(`Found ${friendships.length} friends for user ${userId}`);

            return { friendships: friendships };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, `Error fetching friends for user ${request.params.userId}`);
            return reply.internalServerError('An unexpected error occurred while fetching friendships.');
        }
    });

    // ROUTE: Gets a list of INCOMING pending friend requests for the current user.
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
            const session = fastify.session.get();
            const onlineUserIds = new Set(session.participants.keys());
            fastify.log.debug(`Fetching incoming pending requests for user ${userId}. Online users: ${Array.from(onlineUserIds).join(', ')}`);

            const pendingFriendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds, 'INCOMING');
            fastify.log.debug(`Found ${pendingFriendships.length} incoming pending requests for user ${userId}`);

            return { friendships: pendingFriendships };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, `Error fetching pending requests for user ${request.params.userId}`);
            return reply.internalServerError('An unexpected error occurred while fetching pending requests.');
        }
    });

    // ROUTE: Gets a list of SENT pending friend requests for the current user.
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
            const session = fastify.session.get();
            const onlineUserIds = new Set(session.participants.keys());
            fastify.log.debug(`Fetching sent pending requests for user ${userId}. Online users: ${Array.from(onlineUserIds).join(', ')}`);

            const pendingFriendships = await getFriendshipsForUser(fastify.prisma, userId, FriendshipStatus.PENDING, onlineUserIds, 'SENT');
            fastify.log.debug(`Found ${pendingFriendships.length} sent pending requests for user ${userId}`);

            return { friendships: pendingFriendships };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, `Error fetching pending requests for user ${request.params.userId}`);
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
                required: ['actorId', 'friendId'],
                additionalProperties: false
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
            fastify.log.debug(`User ${actorId} is attempting to send a friend request to user ${friendId}`);

            if (actorId === friendId) {
                throw fastify.httpErrors.badRequest('A user cannot send a friend request to themselves.');
            }

            const friendExists = await fastify.prisma.user.findUnique({
                where: { id: friendId }
            });

            if (!friendExists) {
                throw fastify.httpErrors.notFound('The user you are trying to add as a friend does not exist.');
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

            fastify.log.debug(`Friend request created with ID ${newFriendshipFromDb.id} between users ${actorId} and ${friendId}`);
            reply.code(201);
            return { friendship: friendshipResponse };

        } catch (error) {
            // This will catch the error from the @@unique constraint if the friendship already exists.
            if (error.code === 'P2002') { // Prisma's unique constraint violation code
                return reply.conflict('A friendship with this user already exists.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Error creating friendship for user', actorId);
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
                required: ['actorId'],
                additionalProperties: false
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
            fastify.log.debug(`User ${actorId} is attempting to accept friend request ID ${friendshipId}`);

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

            fastify.log.debug(`Friend request ID ${friendshipId} accepted by user ${actorId}`);
            return { friendship: friendshipResponse };

        } catch (error) {
            // If the `where` clause fails to find a match, Prisma throws P2025.
            if (error.code === 'P2025') {
                return reply.notFound('No pending friend request found from this user.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Error accepting friendship for user', actorId);
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
                required: ['actorId'],
                additionalProperties: false
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
            fastify.log.debug(`User ${actorId} is attempting to remove friendship ID ${friendshipId}`);

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
            fastify.log.debug(`Friendship ID ${friendshipId} removed by user ${actorId}`);
            reply.code(204);

        } catch (error) {
            // If no friendship exists or the user is not part of it, Prisma will throw an error.
            if (error.code === 'P2025') { // Prisma's record not found code
                return reply.notFound('Friendship not found or you do not have permission to modify it.');
            }
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Error deleting friendship');
            return reply.internalServerError('An unexpected error occurred while removing the friendship.');
        }
    });
}
