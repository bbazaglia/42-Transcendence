export default async function (fastify, opts) {
    // Apply authentication hook to all routes in this plugin
    fastify.addHook('preHandler', fastify.authenticate);

    // ROUTE: Gets the public profile (stats, display name) of any user by their ID.
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    displayName: { type: 'string' },
                    avatarUrl: { type: 'string', format: 'uri' },
                    wins: { type: 'integer' },
                    losses: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            404: { $ref: 'errorResponse#' },
            500: { $ref: 'errorResponse#' }
        }
    }, async (request, reply) => {
        const userId = request.params.id;

        try {
            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                // Use 'select' to pick only the public fields we need and avoid exposing sensitive data
                select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                    wins: true,
                    losses: true,
                    createdAt: true
                }
            });

            if (!user) {
                reply.code(404);
                return { error: 'User not found' };
            }

            return user;

        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching the user profile.' };
        }
    });

    // ROUTE: Gets the match history for a specific user.
    fastify.get('/:id/history', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        playerOneId: { type: 'integer' },
                        playerTwoId: { type: 'integer' },
                        playerOneScore: { type: 'integer' },
                        playerTwoScore: { type: 'integer' },
                        winnerId: { type: 'integer' },
                        playedAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
            500: { $ref: 'errorResponse#' }
        }
    }, async (request, reply) => {
        const userId = request.params.id;
        
        try {
            const matches = await fastify.prisma.match.findMany({
                where: {
                    OR: [
                        { playerOneId: userId },
                        { playerTwoId: userId }
                    ]
                },

                orderBy: {
                    playedAt: 'desc'
                }
            });

            return matches;

        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching match history.' };
        }
    });
}
