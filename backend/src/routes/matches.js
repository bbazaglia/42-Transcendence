export default async function (fastify, opts) {
    // All routes in this file require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // Creates a new match record after a game is finished.
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['player_one_id', 'player_two_id', 'player_one_score', 'player_two_score', 'winner_id'],
                properties: {
                    player_one_id: { type: 'integer' },
                    player_two_id: { type: 'integer' },
                    player_one_score: { type: 'integer' },
                    player_two_score: { type: 'integer' },
                    winner_id: { type: 'integer' },
                    tournament_id: { type: 'integer' } // Optional
                }
            }
        }
    }, async (request, reply) => {
        // The user making the API call must be the host of the active lobby.
        const hostId = request.user.id;
        const lobby = fastify.getLobby();

        if (!lobby || lobby.host.id !== hostId) {
            reply.code(403);
            return { error: 'You are not the host of the active lobby.' };
        }

        // Ensure both players are part of the lobby participants
        const isPlayerOneValid = lobby.participants.has(player_one_id);
        const isPlayerTwoValid = lobby.participants.has(player_two_id);

        if (!isPlayerOneValid || !isPlayerTwoValid) {
            reply.code(403);
            return { error: 'Match cannot be reported. One or both players are not verified in the current lobby.' };
        }

        // Update the match record in the database
        const {
            player_one_id,
            player_two_id,
            player_one_score,
            player_two_score,
            winner_id,
            tournament_id
        } = request.body;

        const AI_PLAYER_ID = 0;
        try {
            const query = `
                INSERT INTO matches (player_one_id, player_two_id, player_one_score, player_two_score, winner_id, tournament_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await fastify.sqlite.run(query, [player_one_id, player_two_id, player_one_score, player_two_score, winner_id, tournament_id]);

            if (winner_id !== AI_PLAYER_ID) {
                await fastify.sqlite.run('UPDATE users SET wins = wins + 1 WHERE id = ?', [winner_id]);
            }

            const loser_id = winner_id === player_one_id ? player_two_id : player_one_id;
            if (loser_id !== AI_PLAYER_ID) {
                await fastify.sqlite.run('UPDATE users SET losses = losses + 1 WHERE id = ?', [loser_id]);
            }

            reply.code(201)
            return { id: result.lastID, message: 'Match created successfully' };
        } catch (err) {
            fastify.log.error(err);
            throw new Error('Internal Server Error');
        }
    });
}
