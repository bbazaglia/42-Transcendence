import fp from 'fastify-plugin';

async function sharedSchemas(fastify, opts) {
    // The schema for a generic error response.
    fastify.addSchema({
        $id: 'errorResponse',
        type: 'object',
        properties: {
            error: { type: 'string' }
        }
    });

    // The schema for a user object that is safe to send to the client.
    fastify.addSchema({
        $id: 'publicUser',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri-reference' },
            wins: { type: 'integer' },
            losses: { type: 'integer' }
        }
    });

    // The schema for the entire lobby state object.
    fastify.addSchema({
        $id: 'lobbyState',
        type: 'object',
        properties: {
            host: { $ref: 'publicUser#' },
            participants: {
                type: 'array',
                items: { $ref: 'publicUser#' }
            }
        }
    });

    // The schema for a single match within a tournament.
    fastify.addSchema({
        $id: 'tournamentMatch',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            playerOneId: { type: 'integer' },
            playerTwoId: { type: 'integer' },
            playerOneScore: { type: 'integer' },
            playerTwoScore: { type: 'integer' },
            winnerId: { type: 'integer', nullable: true },
            tournamentId: { type: 'integer' },
            playedAt: { type: 'string', format: 'date-time' }
        }
    });
}

export default fp(sharedSchemas);
