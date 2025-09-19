import { publicUserSelect } from '../lib/prismaSelects.js';

export default async function (fastify, opts) {
    // Apply authentication hook to all routes in this plugin
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobby.auth);

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
            200: {
                type: 'object',
                properties: {
                    user: { $ref: 'publicUser#' }
                }
            },
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

            return { user: user };

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
            200: {
                type: 'object',
                properties: {
                    matches: {
                        type: 'array',
                        items: { $ref: 'matchDetail#' }
                    }
                }
            },
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

            return { matches: matches };

        } catch (error) {
            fastify.log.error(error, `Error fetching match history for user ID ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching match history.');
        }
    });

    // ROUTE: Searches for users by display name
    fastify.get('/search', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    search: { type: 'string', minLength: 1, maxLength: 50 }
                },
                required: ['search']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: { $ref: 'publicUser#' }
                        }
                    }
                },
                400: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { search } = request.query;

            const users = await fastify.prisma.user.findMany({
                where: {
                    displayName: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                select: publicUserSelect,
                take: 10 // Limit to 10 results
            });

            return { users: users };

        } catch (error) {
            fastify.log.error(error, `Error searching users with query: ${request.query.search}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while searching users.');
        }
    });

    // ROUTE: Updates user profile information
    fastify.patch('/:id', {
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
                    displayName: { type: 'string', minLength: 3, maxLength: 20 },
                    avatarUrl: { type: 'string', maxLength: 500 }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    }
                },
                400: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.id;
            const { displayName, avatarUrl } = request.body;

            // Check if user exists
            const existingUser = await fastify.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!existingUser) {
                throw fastify.httpErrors.notFound('User not found');
            }

            // Check if displayName is already taken (if provided)
            if (displayName) {
                const nameExists = await fastify.prisma.user.findFirst({
                    where: {
                        displayName: displayName,
                        id: { not: userId }
                    }
                });

                if (nameExists) {
                    throw fastify.httpErrors.conflict('Display name is already in use');
                }
            }

            // Update user
            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(displayName && { displayName: displayName }),
                    ...(avatarUrl && { avatarUrl: avatarUrl })
                },
                select: publicUserSelect
            });

            return { user: updatedUser };

        } catch (error) {
            fastify.log.error(error, `Error updating user profile for ID ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while updating the user profile.');
        }
    });
}
