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
                    items: { $ref: 'tournamentDetail#' }
                },
            },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const tournaments = await fastify.prisma.tournament.findMany({
                select: {
                    id: true,
                    name: true,
                    status: true,
                    maxParticipants: true,
                    winner: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
                    participants: { select: { user: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } } } },
                    matches: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return tournaments;
        } catch (error) {
            fastify.log.error(error, 'Failed to fetch tournaments');
            return reply.internalServerError('An unexpected error occured when trying to fetch tournaments');
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
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;

            const tournament = await fastify.prisma.tournament.findUnique({
                where: { id: tournamentId },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    maxParticipants: true,
                    winner: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
                    participants: { select: { user: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } } } },
                    matches: true,
                    createdAt: true
                }
            });

            if (!tournament) {
                throw fastify.httpErrors.notFound('Tournament not found');
            }

            // Map participants to include only user details
            tournament.participants = tournament.participants.map(p => p.user);
            return tournament;
        } catch (error) {
            fastify.log.error(error, `Failed to fetch tournament with id ${tournamentId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching the tournament.');
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
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { name, maxParticipants } = request.body;

            const dbTournament = await fastify.prisma.tournament.create({
                data: {
                    name,
                    maxParticipants,
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    maxParticipants: true,
                    createdAt: true
                }
            });

            // Build the tournamentDetail-shaped response without querying empty relations
            const newTournament = {
                ...dbTournament,
                winner: null,             // no winner at creation
                participants: [],         // empty participants array
                matches: []               // empty matches array
            };

            reply.code(201);
            return newTournament;
        } catch (error) {
            fastify.log.error(error, 'Failed to create tournament');
            return reply.internalServerError('An unexpected error occurred while creating the tournament.');
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
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            },
            preHandler: [fastify.lobbyAuth]
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;
            const { userId } = request.body;
            const lobby = fastify.getLobby();

            // Check if user is authenticated
            if (!lobby.participants.has(userId)) {
                throw reply.forbidden('User must be logged in to join a tournament.');
            }

            // Use a transaction to ensure data integrity
            const updatedTournament = await fastify.prisma.$transaction(async (prisma) => {
                // Fetch the tournament and its participants in a single query
                const t = await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: {
                        id: true,
                        status: true,
                        maxParticipants: true,
                        participants: { select: { userId: true } }
                    }
                });

                if (!t) {
                    throw fastify.httpErrors.notFound('Tournament not found.');
                }

                if (t.status !== TournamentStatus.PENDING) {
                    throw fastify.httpErrors.forbidden('Only pending tournaments can be started.');
                }

                if (t.participants.length >= t.maxParticipants) {
                    throw fastify.httpErrors.forbidden('Tournament is full. You cannot join at this time.');
                }

                if (t.participants.some(p => p.userId === userId)) {
                    throw fastify.httpErrors.conflict('You are already participating in this tournament.');
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
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        maxParticipants: true,
                        winner: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
                        participants: { select: { user: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } } } },
                        matches: true,
                        createdAt: true
                    }
                });
            });

            updatedTournament.participants = updatedTournament.participants.map(p => p.user);

            return updatedTournament;
        } catch (error) {
            fastify.log.error(error, 'Failed to join tournament');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while joining the tournament.');
        }
    });

    // ROUTE: Starts the tournament when the required number of participants have joined.
    fastify.patch('/:id/start', {
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
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            },
            preHandler: [fastify.lobbyAuth]
        }

    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;

            // Check if all participants are still in the lobby
            const tournamentParticipants = await fastify.prisma.tournamentParticipant.findMany({
                where: { tournamentId },
                select: { userId: true }
            });

            const lobby = fastify.getLobby();
            for (const participant of tournamentParticipants) {
                if (!lobby.participants.has(participant.userId)) {
                    throw reply.forbidden('All tournament participants must be present in the lobby to start the tournament.');
                }
            }

            const tournament = await fastify.prisma.$transaction(async (prisma) => {
                // Fetch the tournament and its participants
                const t = await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: {
                        id: true,
                        status: true,
                        maxParticipants: true,
                        participants: { select: { userId: true } }
                    }
                });

                if (!t) {
                    throw fastify.httpErrors.notFound('Tournament not found.');
                }

                if (t.status !== TournamentStatus.PENDING) {
                    throw fastify.httpErrors.forbidden('Only pending tournaments can be started.');
                }

                if (t.participants.length != t.maxParticipants) {
                    throw fastify.httpErrors.forbidden('Tournament must have the exact number of participants to be started.');
                }

                // Update the tournament status to IN_PROGRESS
                return prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: TournamentStatus.IN_PROGRESS },
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        maxParticipants: true,
                        winner: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } },
                        participants: { select: { user: { select: { id: true, displayName: true, avatarUrl: true, wins: true, losses: true, createdAt: true } } } },
                        matches: true,
                        createdAt: true
                    }
                });
            });

            // Map participants to inclde only user details
            tournament.participants = tournament.participants.map(p => p.user);
            return tournament;
        } catch (err) {
            fastify.log.error(err, 'Failed to start tournament');
            if (err && err.statusCode) {
                return reply.send(err);
            }
            return reply.internalServerError('An unexpected error occurred while starting the tournament.');
        }
    });

    // ROUTE: Cancels a tournament, either by the creator or automatically if conditions are not met.
    fastify.delete('/:id/cancel', {

    }, async (request, reply) => {
        const tournamentId = request.params.id;
    });
}
