import { matchDetailSelect } from "../lib/prismaSelects";

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);
    fastify.addHook('preHandler', fastify.lobbyAuth);

    const AI_PLAYER_ID = fastify.AI_PLAYER_ID;

    // ROUTE: Creates a new quick match record after a game is finished.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    playerOneId: { type: 'integer' },
                    playerTwoId: { type: 'integer' },
                    playerOneScore: { type: 'integer' },
                    playerTwoScore: { type: 'integer' },
                    winnerId: { type: 'integer' },
                },
                required: ['playerOneId', 'playerTwoId', 'playerOneScore', 'playerTwoScore', 'winnerId']
            },
            response: {
                201: { $ref: 'matchDetail#' },
                403: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const {
                playerOneId,
                playerTwoId,
                playerOneScore,
                playerTwoScore,
                winnerId
            } = request.body;

            const lobby = fastify.getLobby();

            // Ensure both players are part of the lobby participants
            const isPlayerOneValid = lobby.participants.has(playerOneId);
            const isPlayerTwoValid = lobby.participants.has(playerTwoId);

            if (!isPlayerOneValid || !isPlayerTwoValid) {
                throw fastify.httpErrors.forbidden('Match cannot be reported. One or both players are not verified in the current lobby.');
            }

            if (playerOneId === playerTwoId) {
                throw fastify.httpErrors.forbidden('A player cannot play against themselves.');
            }

            if (winnerId !== playerOneId && winnerId !== playerTwoId && winnerId !== AI_PLAYER_ID) {
                throw fastify.httpErrors.forbidden('Winner must be one of the players in the match');
            }

            // Execute all operations in a single, safe transaction
            const newMatch = await fastify.prisma.$transaction(async (prisma) => {
                // Create the match record
                const createdMatch = await prisma.match.create({
                    data: {
                        playerOneId,
                        playerTwoId,
                        playerOneScore,
                        playerTwoScore,
                        winnerId
                    },
                    select: matchDetailSelect
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

                return createdMatch;
            });

            reply.code(201);
            return newMatch;

        } catch (error) {
            fastify.log.error(error, 'Error creating match record');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An error occurred while creating the match record.');
        }
    });
}
