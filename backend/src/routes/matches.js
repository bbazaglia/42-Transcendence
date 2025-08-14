import { TournamentStatus } from '@prisma/client'

const AI_PLAYER_ID = 0;

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobbyAuth);

    // ROUTE: Creates a new match record after a game is finished.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['playerOneId', 'playerTwoId', 'playerOneScore', 'playerTwoScore', 'winnerId'],
                properties: {
                    playerOneId: { type: 'integer' },
                    playerTwoId: { type: 'integer' },
                    playerOneScore: { type: 'integer' },
                    playerTwoScore: { type: 'integer' },
                    winnerId: { type: 'integer' },
                    tournamentId: { type: 'integer' } // Optional
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        message: { type: 'string' }
                    }
                },
                403: { $ref: 'errorResponse#' },
                500: { $ref: 'errorResponse#' }
            }
        }
    }, async (request, reply) => {
        const {
            playerOneId,
            playerTwoId,
            playerOneScore,
            playerTwoScore,
            winnerId,
            tournamentId
        } = request.body;

        const lobby = fastify.getLobby();

        // Ensure both players are part of the lobby participants
        const isPlayerOneValid = lobby.participants.has(playerOneId);
        const isPlayerTwoValid = lobby.participants.has(playerTwoId);

        if (!isPlayerOneValid || !isPlayerTwoValid) {
            reply.code(403);
            return { error: 'Match cannot be reported. One or both players are not verified in the current lobby.' };
        }

        // Update the match record in the database
        try {

            if (tournamentId) {
                // Verify the tournament is in progress.
                const tournament = await fastify.prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    include: {
                        participants: {
                            select: { userId: true }
                        }
                    }
                });

                // Check if tournament exists and is in progress
                if (!tournament || tournament.status !== TournamentStatus.IN_PROGRESS) {
                    reply.code(403);
                    return { error: 'Match cannot be recorded for a tournament that is not in progress.' };
                }

                const participantIds = new Set(tournament.participants.map(p => p.userId));
                if (!participantIds.has(playerOneId) || !participantIds.has(playerTwoId)) {
                    reply.code(403);
                    return { error: 'Both players must be participants in the tournament to record a match.' };
                }
            }

            // Execute all operations in a single, safe transaction
            const transactionResult = await fastify.prisma.$transaction(async (prisma) => {
                // Create the match record
                const newMatch = await prisma.match.create({
                    data: {
                        playerOneId,
                        playerTwoId,
                        playerOneScore,
                        playerTwoScore,
                        winnerId,
                        tournamentId
                    }
                });

                const loserId = winnerId === playerOneId ? playerTwoId : playerOneId;

                // Update winner stats
                if (winnerId !== AI_PLAYER_ID) {
                    await prisma.user.update({
                        where: { id: winnerId },
                        data: { wins: { increment: 1 } }
                    });
                }

                // Update loser stats
                if (loserId !== AI_PLAYER_ID) {
                    await prisma.user.update({
                        where: { id: loserId },
                        data: { losses: { increment: 1 } }
                    });
                }

                return newMatch;
            });

            reply.code(201);
            return { id: transactionResult.id, message: 'Match created successfully' };

        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An error occurred while creating the match record.' };
        }
    });
}
