async function getFriendsForUser(prisma, userId) {
    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [
                { userOneId: userId },
                { userTwoId: userId }
            ]
        },
        include: {
            userOne: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true } },
            userTwo: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true } }
        }
    });

    const friends = friendships.map(friendship => {
        return friendship.userOneId === userId ? friendship.userTwo : friendship.userOne;
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
                properties: {
                    id: { type: 'integer' }
                }
            },
            response: {
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const userId = request.params.id;

        try {
            const friends = await getFriendsForUser(fastify.prisma, userId);
            return friends;
        } catch (error) {
            fastify.log.error(error, `Error fetching friends for user ${userId}`);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching friendships.' };
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
                200: { type: 'array', items: { $ref: 'publicUser#' } },
                400: { $ref: 'errorResponse#' },
                403: { $ref: 'errorResponse#' },
                409: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { actorId, friendId } = request.body;
        const lobby = fastify.getLobby();

        if (!lobby.participants.has(actorId) || !lobby.participants.has(friendId)) {
            reply.code(403);
            return { error: 'Both users must be in the current lobby to form a friendship.' };
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
                    userTwoId  // Always the larger ID
                }
            });

            const friends = await getFriendsForUser(fastify.prisma, actorId);
            return friends;
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

        if (!lobby.participants.has(actorId) || !lobby.participants.has(friendIdToRemove)) {
            reply.code(403);
            return { error: 'Both users must be in the current lobby.' };
        }

        try {
            const userOneId = Math.min(actorId, friendIdToRemove);
            const userTwoId = Math.max(actorId, friendIdToRemove);

            await fastify.prisma.friendship.delete({
                where: { userOneId_userTwoId: { userOneId, userTwoId } }
                // userOneId_userTwoId is a composite key based on the @@unique constraint created by prisma
            });

            const friends = await getFriendsForUser(fastify.prisma, actorId);
            return friends;
        } catch (error) {
            // If no friendship exists, Prisma will throw an error.
            if (error.code === 'P2025') { // Prisma's record not found code
                reply.code(404);
                return { error: 'Friendship not found.' };
            }
            fastify.log.error(error, 'Error deleting friendship');
            reply.code(500);
            return { error: 'An unexpected error occurred while removing the friendship.' };
        }
    });
}
