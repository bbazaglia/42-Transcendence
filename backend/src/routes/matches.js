import { matchQueryTemplate } from "../lib/prismaQueryTemplates.js";

export default async function (fastify, opts) {

    // All routes in this file require session authentication
    fastify.addHook('preHandler', fastify.authorize);

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
                required: ['playerOneId', 'playerTwoId', 'playerOneScore', 'playerTwoScore', 'winnerId'],
                additionalProperties: false
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        match: { $ref: 'matchDetail#' }
                    },
                    required: ['match']
                },
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
            fastify.log.debug(`Attempting to create match record: Player One ID ${playerOneId}, Player Two ID ${playerTwoId}, Player One Score ${playerOneScore}, Player Two Score ${playerTwoScore}, Winner ID ${winnerId}`);

            const onlineUserIds = new Set(request.sessionData.participants);
            const isPlayerOneValid = onlineUserIds.has(playerOneId);
            const isPlayerTwoValid = onlineUserIds.has(playerTwoId);

            if (!isPlayerOneValid || !isPlayerTwoValid) {
                throw fastify.httpErrors.forbidden('Match cannot be reported. One or both players are not verified in the current session.');
            }

            if (playerOneId === playerTwoId) {
                throw fastify.httpErrors.forbidden('A player cannot play against themselves.');
            }

            if (winnerId !== playerOneId && winnerId !== playerTwoId) {
                throw fastify.httpErrors.forbidden('Winner must be one of the players in the match');
            }

            // Execute all operations in a single, safe transaction
            const createdMatch = await fastify.prisma.$transaction(async (prisma) => {
                // Create the match record
                const match = await prisma.match.create({
                    data: {
                        playerOneId,
                        playerTwoId,
                        playerOneScore,
                        playerTwoScore,
                        winnerId
                    },
                    ...matchQueryTemplate
                });

                const loserId = winnerId === playerOneId ? playerTwoId : playerOneId;

                // Update winner stats
                await prisma.user.update({
                    where: { id: winnerId },
                    data: { wins: { increment: 1 } }
                });

                // Update loser stats
                await prisma.user.update({
                    where: { id: loserId },
                    data: { losses: { increment: 1 } }
                });


                return match;
            });

            fastify.log.debug(`Match record created successfully with ID ${createdMatch.id}`);
            reply.code(201);
            return { match: createdMatch };

        } catch (error) {
            if (error && error.statusCode) {
                return reply.send(error);
            }
            fastify.log.error(error, 'Error creating match record');
            return reply.internalServerError('An error occurred while creating the match record.');
        }
    });
}
