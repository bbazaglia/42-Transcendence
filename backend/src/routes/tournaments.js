export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // ROUTE: Gets a list of all tournaments.
    fastify.get('/', {
        schema: {
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                            winnerId: { type: 'integer', nullable: true },
                            maxParticipants: { type: 'integer' },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const tournaments = await fastify.prisma.tournament.findMany({
                select: {
                    id: true,
                    name: true,
                    status: true,
                    winnerId: true,
                    maxParticipants: true,
                    createdAt: true
                }
            });

            return tournaments;
        } catch (error) {
            fastify.log.error(error);
            reply.code(500)
            return { error: 'Failed to fetch tournaments' };
        }
    });

    // ROUTE: Gets the details and status of a specific tournament, including the match bracket.
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                },
                required: ['id']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                        maxParticipants: { type: 'integer' },
                        winner: { nullable: true, $ref: 'publicUser#' },
                        createdAt: { type: 'string', format: 'date-time' },
                        participants: { type: 'array', items: { $ref: 'publicUser#' } },
                        matches: { type: 'array', items: { $ref: 'tournamentMatch#' } }
                    }
                },
                404: { $id: 'errorResponse#' },
                500: { $id: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const tournamentId = request.params.id;

        try {
            const tournament = await fastify.prisma.tournament.findUnique({
                where: { id: tournamentId },
                include: {
                    // Include winner details if available
                    winner: {
                        select: {
                            id: true,
                            displayName: true,
                            avatarUrl: true
                        }
                    },
                    // Include participants with user details
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    displayName: true
                                }
                            }
                        }
                    },
                    // Include all matches related to the tournament
                    matches: true
                }
            });

            if (!tournament) {
                reply.code(404);
                return { error: 'Tournament not found' };
            }

            // Map participants to match your response schema
            const participants = tournament.participants.map(p => ({
                userId: p.user.id,
                displayName: p.user.displayName
            }));

            // Build the response object
            const response = {
                id: tournament.id,
                name: tournament.name,
                status: tournament.status,
                maxParticipants: tournament.maxParticipants,
                createdAt: tournament.createdAt,
                winner: tournament.winner,
                participants: participants,
                matches: tournament.matches
            };

            return response;
        } catch (error) {
            fastify.log.error(error, `Failed to fetch tournament with id ${tournamentId}`);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching the tournament.' };
        }
    });

    // ROUTE: Allows a user to create a new tournament.
    fastify.post('/', async (request, reply) => {
        // Logic to create a new tournament
        // This should accept tournament details like name, description, start date, etc.
        return { message: 'Tournament created successfully' };
    });

    // ROUTE: Allows a user to join an existing tournament.
    fastify.post('/:id/join', async (request, reply) => {
        const tournamentId = request.params.id;
        // Logic to join a tournament by ID
        // This should add the user to the specified tournament in the database
        return { message: `User joined tournament with ID ${tournamentId} successfully` };
    });

    // ROUTE: Records the outcome of a tournament match, which would trigger the backend matchmaking logic for the next round.
    fastify.post('/:id/matches', async (request, reply) => {
        const tournamentId = request.params.id;
        // Logic to record a match outcome in a tournament
        // This should accept match details like winner ID, loser ID, score, etc.
        return { message: `Match recorded for tournament with ID ${tournamentId}` };
    });
}
