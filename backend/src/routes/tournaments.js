import pkg from '@prisma/client';
const { TournamentStatus } = pkg;
import { tournamentQueryTemplate } from '../lib/prismaQueryTemplates.js';

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobby.auth);

    // ROUTE: Gets a list of all tournaments.
    fastify.get('/', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        tournaments: {
                            type: 'array',
                            items: { $ref: 'tournamentDetail#' }
                        }
                    },
                    required: ['tournaments']
                },
            },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const tournaments = await fastify.prisma.tournament.findMany({
                select: tournamentQueryTemplate,
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Map participants for each tournament to ensure a consistent response shape
            tournaments.forEach(t => {
                t.participants = t.participants.map(p => p.user);
            });
            return { trounaments: tournaments };

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
                200: {
                    type: 'object',
                    properties: {
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;

            const tournament = await fastify.prisma.tournament.findUnique({
                where: { id: tournamentId },
                select: tournamentQueryTemplate
            });

            if (!tournament) {
                throw fastify.httpErrors.notFound('Tournament not found');
            }

            // Map participants to include only user details
            tournament.participants = tournament.participants.map(p => p.user);
            return { tournament: tournament };

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
                properties: {
                    name: { type: 'string', minLength: 3, maxLength: 100 },
                    maxParticipants: { type: 'integer', minimum: 2, maximum: 16 }
                },
                required: ['name', 'maxParticipants']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { name, maxParticipants } = request.body;

            const newTournament = await fastify.prisma.tournament.create({
                data: {
                    name,
                    maxParticipants,
                },
                select: tournamentQueryTemplate
            });

            newTournament.participants = newTournament.participants.map(p => p.user);
            reply.code(201);
            return { tournament: newTournament };

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
                200: {
                    type: 'object',
                    properties: {
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;
            const { userId } = request.body;
            const lobby = fastify.lobby.get();

            // Check if user is authenticated
            if (!lobby.isParticipant(userId)) {
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
                const tournament = prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: tournamentQueryTemplate
                });
                return { tournament: tournament };
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
                200: {
                    type: 'object',
                    properties: {
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;

            // Check if all participants are still in the lobby
            const tournamentParticipants = await fastify.prisma.tournamentParticipant.findMany({
                where: { tournamentId },
                select: { userId: true }
            });

            const lobby = fastify.lobby.get();
            for (const participant of tournamentParticipants) {
                if (!lobby.isParticipant(participant.userId)) {
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

                // 1. Shuffle participants for random pairing
                const participantIds = t.participants.map(p => p.userId);
                for (let i = participantIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
                }

                // 2. Create match data for the first round
                const matchesToCreate = [];
                for (let i = 0; i < participantIds.length; i += 2) {
                    if (i + 1 < participantIds.length) {
                        matchesToCreate.push({
                            playerOneId: participantIds[i],
                            playerTwoId: participantIds[i + 1],
                            tournamentId: t.id,
                            // winnerId is implicitly null
                        });
                    }
                }

                // 3. Create all first-round matches in the database
                await prisma.match.createMany({
                    data: matchesToCreate,
                });

                // 4. Update the tournament status to IN_PROGRESS
                await prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: TournamentStatus.IN_PROGRESS },
                });

                // 5. Fetch the complete tournament data for the response
                const tournament = prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: tournamentQueryTemplate
                });
                return { tournament: tournament }
            });

            // Map participants to include only user details
            tournament.participants = tournament.participants.map(p => p.user);
            return { tournament: tournament };

        } catch (error) {
            fastify.log.error(error, 'Failed to start tournament');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while starting the tournament.');
        }
    });

    // ROUTE: Updates a tournament match and advances the bracket if necessary.
    fastify.patch('/:id/matches/:matchId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    matchId: { type: 'integer' }
                },
                required: ['id', 'matchId']
            },
            body: {
                type: 'object',
                properties: {
                    playerOneScore: { type: 'integer' },
                    playerTwoScore: { type: 'integer' },
                    winnerId: { type: 'integer' }
                },
                required: ['playerOneScore', 'playerTwoScore', 'winnerId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { id: tournamentId, matchId } = request.params;
            const { playerOneScore, playerTwoScore, winnerId } = request.body;

            const updatedTournament = await fastify.prisma.$transaction(async (prisma) => {
                // 1. Validate match parameters
                const matchToUpdate = await prisma.match.findUnique({
                    where: { id: matchId }
                });

                if (!matchToUpdate || matchToUpdate.tournamentId !== tournamentId) {
                    throw fastify.httpErrors.notFound('Match not found in this tournament.');
                }

                if (matchToUpdate.winnerId !== null) {
                    throw fastify.httpErrors.conflict('This match has already been completed.');
                }

                if (winnerId !== matchToUpdate.playerOneId && winnerId !== matchToUpdate.playerTwoId) {
                    throw fastify.httpErrors.badRequest('The winner must be one of the two players in the match.');
                }

                // 2. Update the completed match
                const match = await prisma.match.update({
                    where: { id: matchId },
                    data: { playerOneScore, playerTwoScore, winnerId, playedAt: new Date() },
                    select: { playerOneId: true, playerTwoId: true, winnerId: true }
                });

                // 3. Update player stats (wins/losses)
                const loserId = winnerId === match.playerOneId ? match.playerTwoId : match.playerOneId;
                await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
                await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });

                // 4. Check if the current round is over
                const allMatches = await prisma.match.findMany({ where: { tournamentId } });
                const pendingMatches = allMatches.filter(m => m.winnerId === null);

                if (pendingMatches.length === 0) {
                    const winners = allMatches.filter(m => m.winnerId !== null).map(m => m.winnerId);
                    // 5. Check if the tournament is over or create the next round
                    if (winners.length === 1) {
                        await prisma.tournament.update({
                            where: { id: tournamentId },
                            data: { status: TournamentStatus.COMPLETED, winnerId: winners[0] }
                        });
                    } else {
                        const nextRoundMatches = [];
                        for (let i = 0; i < winners.length; i += 2) {
                            if (i + 1 < winners.length) {
                                nextRoundMatches.push({
                                    playerOneId: winners[i],
                                    playerTwoId: winners[i + 1],
                                    tournamentId: tournamentId,
                                });
                            }
                        }
                        await prisma.match.createMany({ data: nextRoundMatches });
                    }
                }

                // 6. Return the full, updated tournament state
                const tournament = prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: tournamentQueryTemplate
                });
                return { tournament: tournament }
            });

            updatedTournament.participants = updatedTournament.participants.map(p => p.user);
            return { tournament: updatedTournament };

        } catch (error) {
            fastify.log.error(error, `Failed to update tournament match ${request.params.matchId} for tournament ${request.params.id}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while updating the tournament match.');
        }
    });

    // ROUTE: Cancels a tournament
    fastify.delete('/:id/cancel', {
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
                        tournament: { $ref: 'tournamentDetail#' }
                    },
                    required: ['tournament']
                },
                404: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const tournamentId = request.params.id;

            const tournament = await fastify.prisma.$transaction(async (prisma) => {
                const existing = await prisma.tournament.findFirst({
                    where: { id: tournamentId, status: { notIn: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED] } },
                    select: { id: true }
                });

                if (!existing) {
                    throw fastify.httpErrors.notFound('Tournament not found or already completed/cancelled.');
                }

                return prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: TournamentStatus.CANCELLED },
                    select: tournamentQueryTemplate
                });
            });

            tournament.participants = tournament.participants.map(p => p.user);
            return { tournament: tournament };

        } catch (error) {
            fastify.log.error(error, `Failed to cancel tournament ${tournamentId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while canceling the tournament.');
        }
    });
}
