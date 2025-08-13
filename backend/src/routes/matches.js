const AI_PLAYER_ID = 0;

export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);

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

        // The user making the API call must be the host of the active lobby.
        const hostId = request.user.id;
        const lobby = fastify.getLobby();

        if (!lobby || lobby.host.id !== hostId) {
            reply.code(403);
            return { error: 'You are not the host of the active lobby.' };
        }

        // Ensure both players are part of the lobby participants
        const isPlayerOneValid = lobby.participants.has(playerOneId);
        const isPlayerTwoValid = lobby.participants.has(playerTwoId);

        if (!isPlayerOneValid || !isPlayerTwoValid) {
            reply.code(403);
            return { error: 'Match cannot be reported. One or both players are not verified in the current lobby.' };
        }

        // Update the match record in the database
        try {
            // Create an array to hold our database operations
            const operations = [];

            // 1. Add the 'create match' operation
            operations.push(
                fastify.prisma.match.create({
                    data: {
                        playerOneId,
                        playerTwoId,
                        playerOneScore,
                        playerTwoScore,
                        winnerId,
                        tournamentId
                    }
                })
            );

            // 2. Conditionally add the 'update winner' operation
            if (winnerId !== AI_PLAYER_ID) {
                operations.push(
                    fastify.prisma.user.update({
                        where: { id: winnerId },
                        data: { wins: { increment: 1 } }
                    })
                );
            }

            // 3. Conditionally add the 'update loser' operation
            const loserId = winnerId === playerOneId ? playerTwoId : playerOneId;
            if (loserId !== AI_PLAYER_ID) {
                operations.push(
                    fastify.prisma.user.update({
                        where: { id: loserId },
                        data: { losses: { increment: 1 } }
                    })
                );
            }

            // Execute all operations in a single, safe transaction
            const transactionResult = await fastify.prisma.$transaction(operations);

            // The result of the first operation is the newly created match
            const newMatch = transactionResult[0];

            reply.code(201);
            return { id: newMatch.id, message: 'Match created successfully' };

        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An error occurred while creating the match record.' };
        }
    });
}
