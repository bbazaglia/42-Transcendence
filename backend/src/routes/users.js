import { publicUserSelect } from '../lib/prismaSelects.js';

export default async function (fastify, opts) {
    // Apply authentication hook to all routes in this plugin
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobbyAuth);

    // ROUTE: Gets the public profile (stats, display name) of any user by their ID.
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                },
                required: ['id']
            }
        },
        response: {
            200: { $ref: 'publicUser#' },
            404: { $ref: 'httpError#' },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.id;

            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                select: publicUserSelect
            });

            if (!user) {
                throw fastify.httpErrors.notFound(`User ${userId} not found`);
            }

            return user;

        } catch (error) {
            fastify.log.error(error, `Error fetching user profile for ID ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching the user profile.');
        }
    });

    // ROUTE: Gets the match history for a specific user.
    fastify.get('/:id/history', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                },
                required: ['id']
            }
        },
        response: {
            200: { type: 'array', items: { $ref: 'matchDetail#' } },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.id;

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

        } catch (error) {
            fastify.log.error(error, `Error fetching match history for user ID ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching match history.');
        }
    });
}
