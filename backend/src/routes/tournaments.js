import pkg from '@prisma/client';
const { TournamentStatus } = pkg;
import { tournamentQueryTemplate } from '../lib/prismaQueryTemplates.js';
import xss from 'xss';

export default async function (fastify, opts) {
    // Ensure the sessionManager plugin is registered.
    if (!fastify.hasDecorator('session')) {
        throw new Error('sessionManager plugin must be registered before this file');
    }

    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.session.authorize);

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
            const tournamentsFromDb = await fastify.prisma.tournament.findMany({
                ...tournamentQueryTemplate,
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Map participants to include only user details
            const tournaments = tournamentsFromDb.map(t => ({
                ...t,
                participants: t.participants.map(p => p.user)
            }));

            return { tournaments: tournaments };

        } catch (error) {
            fastify.log.error(error, 'Failed to fetch tournaments');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred when trying to fetch tournaments');
        }
    });

    // ROUTE: Gets the details and status of a specific tournament, including the match bracket.
    fastify.get('/:tournamentId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    tournamentId: { type: 'integer' }
                },
                required: ['tournamentId']
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
            const tournamentId = request.params.tournamentId;

            const tournamentFromDb = await fastify.prisma.tournament.findUnique({
                where: { id: tournamentId },
                ...tournamentQueryTemplate
            });

            if (!tournamentFromDb) {
                throw fastify.httpErrors.notFound('Tournament not found');
            }

            // Map participants to include only user details
            const tournament = {
                ...tournamentFromDb,
                participants: tournamentFromDb.participants.map(p => p.user)
            };

            return { tournament: tournament };

        } catch (error) {
            fastify.log.error(error, `Failed to fetch tournament with id ${request.params.tournamentId}`);
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
                required: ['name', 'maxParticipants'],
                additionalProperties: false
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
            const name = xss(request.body.name);
            const { maxParticipants } = request.body;

            const newTournamentFromDb = await fastify.prisma.tournament.create({
                data: {
                    name,
                    maxParticipants,
                },
                ...tournamentQueryTemplate
            });

            const tournament = {
                ...newTournamentFromDb,
                participants: [] // A new tournament always starts with zero participants.
            };

            reply.code(201);
            return { tournament: tournament };

        } catch (error) {
            fastify.log.error(error, 'Failed to create tournament');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while creating the tournament.');
        }
    });

    // ROUTE: Allows a user to join an existing tournament.
    fastify.post('/:tournamentId/join', {
        preHandler: [fastify.session.authorizeParticipant],
        schema: {
            params: {
                type: 'object',
                properties: {
                    tournamentId: { type: 'integer' }
                },
                required: ['tournamentId']
            },
            body: {
                type: 'object',
                properties: {
                    actorId: { type: 'integer' }
                },
                required: ['actorId'],
                additionalProperties: false
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
            const tournamentId = request.params.tournamentId;
            const { actorId } = request.body;

            // Use a transaction to ensure data integrity
            const updatedTournamentFromDb = await fastify.prisma.$transaction(async (prisma) => {
                // Fetch the tournament and its participants in a single query
                const tournament = await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    include: { participants: true }
                });

                if (!tournament) {
                    throw fastify.httpErrors.notFound('Tournament not found.');
                }

                if (tournament.status !== TournamentStatus.PENDING) {
                    throw fastify.httpErrors.forbidden('Only pending tournaments can be started.');
                }

                if (tournament.participants.length >= t.maxParticipants) {
                    throw fastify.httpErrors.forbidden('Tournament is full. You cannot join at this time.');
                }

                if (tournament.participants.some(p => p.userId === actorId)) {
                    throw fastify.httpErrors.conflict('You are already participating in this tournament.');
                }

                // Add the user to the tournament
                await prisma.tournamentParticipant.create({
                    data: {
                        userId: actorId,
                        tournamentId: tournamentId
                    }
                });

                // Fetch the updated tournament with all necessary details for the response
                const result = await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    ...tournamentQueryTemplate
                });
                return result;
            });

            // Map participants to include only user details
            const tournamentResponse = {
                ...updatedTournamentFromDb,
                participants: updatedTournamentFromDb.participants.map(p => p.user)
            };
            return { tournament: tournamentResponse };

        } catch (error) {
            fastify.log.error(error, 'Failed to join tournament');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while joining the tournament.');
        }
    });

    // ROUTE: Starts the tournament when the required number of participants have joined.
    fastify.patch('/:tournamentId/start', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    tournamentId: { type: 'integer' }
                },
                required: ['tournamentId']
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
            const tournamentId = request.params.tournamentId;

            const updatedTournamentFromDb = await fastify.prisma.$transaction(async (prisma) => {
                const tournament = await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    include: {
                        participants: {
                            select: { userId: true }
                        }
                    }
                });

                if (!tournament) {
                    throw fastify.httpErrors.notFound('Tournament not found.');
                }

                if (tournament.status !== TournamentStatus.PENDING) {
                    throw fastify.httpErrors.forbidden('Only PENDING tournaments can be started.');
                }

                if (tournament.participants.length !== tournament.maxParticipants) {
                    throw fastify.httpErrors.forbidden('Tournament must have the exact number of participants to be started.');
                }

                // Check if all participants are still in the main app session.
                for (const participant of tournament.participants) {
                    if (!fastify.session.isParticipant(participant.userId)) {
                        throw fastify.httpErrors.forbidden('All tournament participants must be present in the session to start the tournament.');
                    }
                }

                // Shuffle participants for random pairing.
                const participantIds = tournament.participants.map(p => p.userId);
                for (let i = participantIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
                }

                // Create match data for the first round.
                const matchesToCreate = [];
                for (let i = 0; i < participantIds.length; i += 2) {
                    matchesToCreate.push({
                        playerOneId: participantIds[i],
                        playerTwoId: participantIds[i + 1],
                        tournamentId: tournament.id,
                        round: 1
                    });
                }

                // Create all first-round matches and update tournament status.
                await prisma.match.createMany({
                    data: matchesToCreate,
                });

                await prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: TournamentStatus.IN_PROGRESS },
                });

                return await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    ...tournamentQueryTemplate
                });
            });

            const tournamentResponse = {
                ...updatedTournamentFromDb,
                participants: updatedTournamentFromDb.participants.map(p => p.user)
            };

            return { tournament: tournamentResponse };

        } catch (error) {
            fastify.log.error(error, 'Failed to start tournament');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while starting the tournament.');
        }
    });

    // ROUTE: Updates a tournament match and advances the bracket if necessary.
    fastify.patch('/:tournamentId/matches/:matchId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    tournamentId: { type: 'integer' },
                    matchId: { type: 'integer' }
                },
                required: ['tournamentId', 'matchId']
            },
            body: {
                type: 'object',
                properties: {
                    playerOneScore: { type: 'integer' },
                    playerTwoScore: { type: 'integer' },
                    winnerId: { type: 'integer' }
                },
                required: ['playerOneScore', 'playerTwoScore', 'winnerId'],
                additionalProperties: false
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
            const { tournamentId, matchId } = request.params;
            const { playerOneScore, playerTwoScore, winnerId } = request.body;

            const updatedTournamentFromDb = await fastify.prisma.$transaction(async (prisma) => {
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
                const updatedMatch = await prisma.match.update({
                    where: { id: matchId },
                    data: { playerOneScore, playerTwoScore, winnerId, playedAt: new Date() },
                });

                // 3. Update player stats (wins/losses)
                const loserId = winnerId === updatedMatch.playerOneId ? updatedMatch.playerTwoId : updatedMatch.playerOneId;
                await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
                await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });

                // 4. Check if the current round is over
                const currentRoundNumber = updatedMatch.round;
                const currentRoundMatches = await prisma.match.findMany({
                    where: { tournamentId, round: currentRoundNumber }
                });

                const isRoundOver = currentRoundMatches.every(m => m.winnerId !== null);

                if (isRoundOver) {
                    // 5. Check if the tournament is over or create the next round
                    const roundWinners = currentRoundMatches.map(m => m.winnerId);

                    if (roundWinners.length === 1) {
                        // This was the final match, the tournament is over.
                        await prisma.tournament.update({
                            where: { id: tournamentId },
                            data: { status: TournamentStatus.COMPLETED, winnerId: roundWinners[0] }
                        });
                    } else {
                        // Create matches for the next round.
                        const nextRoundMatches = [];
                        for (let i = 0; i < roundWinners.length; i += 2) {
                            nextRoundMatches.push({
                                playerOneId: roundWinners[i],
                                playerTwoId: roundWinners[i + 1],
                                tournamentId: tournamentId,
                                round: currentRoundNumber + 1 // Increment the round number
                            });
                        }
                        await prisma.match.createMany({ data: nextRoundMatches });
                    }
                }

                // 6. Return the full, updated tournament state
                return await prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    ...tournamentQueryTemplate
                });
            });

            // Map participants to include only user details
            const tournamentResponse = {
                ...updatedTournamentFromDb,
                participants: updatedTournamentFromDb.participants.map(p => p.user)
            };
            return { tournament: tournamentResponse };

        } catch (error) {
            fastify.log.error(error, `Failed to update tournament match ${request.params.matchId} for tournament ${request.params.tournamentId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while updating the tournament match.');
        }
    });

    // ROUTE: Cancels a tournament
    fastify.patch('/:tournamentId/cancel', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    tournamentId: { type: 'integer' }
                },
                required: ['tournamentId']
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
            const tournamentId = request.params.tournamentId;

            const updatedTournamentFromDb = await fastify.prisma.$transaction(async (prisma) => {
                const existing = await prisma.tournament.findFirst({
                    where: {
                        id: tournamentId,
                        status: { notIn: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED] }
                    },
                    select: {
                        id: true,
                        participants: { select: { userId: true } }
                    }
                });

                if (!existing) {
                    throw fastify.httpErrors.notFound('Tournament not found or already completed/cancelled.');
                }

                // Check if all participants are still in the main app session.
                for (const participant of existing.participants) {
                    if (!fastify.session.isParticipant(participant.userId)) {
                        throw fastify.httpErrors.forbidden('All tournament participants must be present in the session to cancel the tournament.');
                    }
                }

                return await prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: TournamentStatus.CANCELLED },
                    ...tournamentQueryTemplate
                });
            });

            const tournamentResponse = {
                ...updatedTournamentFromDb,
                participants: updatedTournamentFromDb.participants.map(p => p.user)
            };

            return { tournament: tournamentResponse };

        } catch (error) {
            fastify.log.error(error, `Failed to cancel tournament ${request.params.tournamentId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while canceling the tournament.');
        }
    });
}
