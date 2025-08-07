export default async function (fastify, opts) {
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
        const {
            player_one_id,
            player_two_id,
            player_one_score,
            player_two_score,
            winner_id,
            tournament_id
        } = request.body;

        try {
            const query = `
                INSERT INTO matches (player_one_id, player_two_id, player_one_score, player_two_score, winner_id, tournament_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await fastify.sqlite.run(query, [player_one_id, player_two_id, player_one_score, player_two_score, winner_id, tournament_id]);
            
            await fastify.sqlite.run('UPDATE users SET wins = wins + 1 WHERE id = ?', [winner_id]);
            const loser_id = winner_id === player_one_id ? player_two_id : player_one_id;
            await fastify.sqlite.run('UPDATE users SET losses = losses + 1 WHERE id = ?', [loser_id]);

            reply.code(201)
            return { id: result.lastID, message: 'Match created successfully' };
        } catch (err) {
            fastify.log.error(err);
            throw new Error('Internal Server Error');
        }
    });
}
