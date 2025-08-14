import { TournamentStatus } from '@prisma/client';

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // ROUTE: Gets a list of all tournaments.
    fastify.get('/', {
        schema: {
            response: {
                200: {
                    type: 'array',
                    $ref: 'tournamentDetail#'
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
                200: { $ref: 'tournamentDetail#' },
                404: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
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
                                    displayName: true,
                                    avatarUrl: true
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

            // Map participants to match your response schema because we only need user details
            tournament.participants = tournament.participants.map(p => p.user);

            return tournament;
        } catch (error) {
            fastify.log.error(error, `Failed to fetch tournament with id ${tournamentId}`);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching the tournament.' };
        }
    });

    // ROUTE: Allows a user to create a new tournament.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'maxParticipants'],
                properties: {
                    name: { type: 'string', minLength: 3, maxLength: 100 },
                    maxParticipants: { type: 'integer', minimum: 2, maximum: 16 }
                }
            },
            response: {
                201: { $ref: 'tournamentDetail#' },
                400: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const { name, maxParticipants } = request.body;

        try {
            const newTournament = await fastify.prisma.tournament.create({
                data: {
                    name,
                    maxParticipants,
                }
            });

            reply.code(201);
            return { newTournament };
        } catch (error) {
            fastify.log.error(error, 'Failed to create tournament');
            reply.code(500);
            return { error: 'An unexpected error occurred while creating the tournament.' };
        }
    });

    // ROUTE: Allows a user to join an existing tournament.
    fastify.post('/:id/join', {
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
                    userId: { type: 'integer' }
                },
                required: ['userId']
            },
            response: {
                200: { $ref: 'tournamentDetail#' },
                400: { $ref: 'errorResponse#' },
                403: { $ref: 'errorResponse#' },
                404: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            },
            preHandler: [fastify.lobbyAuth]
        }
    }, async (request, reply) => {
        const tournamentId = request.params.id;
        const { userId } = request.body;
        const lobby = fastify.getLobby();

        // Check if user is authenticated
        if (lobby && !lobby.participants.has(userId)) {
            reply.code(403);
            return { error: 'User must be logged in to join a tournament.' };
        }

        try {
            // Use a transaction to ensure data integrity
            const updatedTournament = await fastify.prisma.$transaction(async (prisma) => {
                // Fetch the tournament and its participants in a single query
                const tournament = await fastify.prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    include: { participants: true }
                });

                // Check if tournament exists and is open for joining
                if (!tournament || tournament.status !== TournamentStatus.PENDING) {
                    reply.code(404);
                    return { error: 'Tournament not found or is not open for joining.' };
                }

                // Check if the tournament is full
                if (tournament.participants.length >= tournament.maxParticipants) {
                    reply.code(403);
                    return { error: 'Tournament is full. You cannot join at this time.' };
                }

                // Check if the user is already in the tournament
                if (tournament.participants.some(p => p.userId === userId)) {
                    reply.code(400);
                    return { error: 'You are already participating in this tournament.' };
                }

                // Add the user to the tournament
                await prisma.tournamentParticipant.create({
                    data: {
                        userId,
                        tournamentId
                    }
                });

                // Fetch the updated tournament with all necessary details for the response
                return prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    include: {
                        winner: { select: { id: true, displayName: true, avatarUrl: true } },
                        participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
                        matches: true
                    }
                });
            });

            return updatedTournament;
        } catch (error) {
            fastify.log.error(error, 'Failed to join tournament');
            reply.code(500);
            return { error: 'An unexpected error occurred while joining the tournament.' };
        }
    });

    // ROUTE: Starts the tournament when the required number of participants have joined.
    fastify.patch('/:id/start', {

    }, async (request, reply) => {
        const tournamentId = request.params.id;
    });

    // ROUTE: Cancels a tournament, either by the creator or automatically if conditions are not met.
    fastify.delete('/:id/cancel', {

    }, async (request, reply) => {
        const tournamentId = request.params.id;
    });
}
