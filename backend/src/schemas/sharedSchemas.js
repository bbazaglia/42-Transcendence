import fp from 'fastify-plugin';

async function sharedSchemas(fastify, opts) {
    // The schema for a user object that is safe to send to the client.
    fastify.addSchema({
        $id: 'publicUser',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri-reference' },
            wins: { type: 'integer' },
            losses: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            isOnline: { type: 'boolean' }
        },
        required: ['id', 'displayName', 'avatarUrl', 'wins', 'losses', 'createdAt']
    });

    // The schema for a friendship object.
    fastify.addSchema({
        $id: 'friendshipDetail',
        type: 'object',
        properties: {
            friendshipId: { type: 'integer' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'BLOCKED'] },
            createdAt: { type: 'string', format: 'date-time' },
            user: { $ref: 'publicUser#' }
        },
        required: ['friendshipId', 'status', 'createdAt', 'user']
    });

    // The schema for the entire session state object.
    fastify.addSchema({
        $id: 'sessionState',
        type: 'object',
        properties: {
            participants: {
                type: 'array',
                items: { $ref: 'publicUser#' }
            }
        },
        required: ['participants']
    });

    // The schema for a single match within a tournament.
    fastify.addSchema({
        $id: 'matchDetail',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            playerOne: { $ref: 'publicUser#' },
            playerTwo: { $ref: 'publicUser#' },
            winner: { $ref: 'publicUser#' },
            playerOneScore: { type: 'integer' },
            playerTwoScore: { type: 'integer' },
            tournamentId: { type: 'integer', nullable: true },
            playedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'playerOne', 'playerTwo', 'winner', 'playerOneScore', 'playerTwoScore', 'playedAt']
    });

    // The schema for a tournament object.
    fastify.addSchema({
        $id: 'tournamentDetail',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            maxParticipants: { type: 'integer' },
            winner: { $ref: 'publicUser#', nullable: true },
            participants: { type: 'array', items: { $ref: 'publicUser#' } },
            matches: { type: 'array', items: { $ref: 'matchDetail#' } },
            createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'status', 'maxParticipants', 'participants', 'matches', 'createdAt']
    });
}

export default fp(sharedSchemas);
