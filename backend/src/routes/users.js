import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (fastify, opts) {
    // Apply authentication hook to all routes in this plugin
    fastify.addHook('preHandler', fastify.authenticate);

    // Gets the public profile (stats, display name) of any user by their ID.
    fastify.get('/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    displayName: { type: 'string' },
                    avatarUrl: { type: 'string', nullable: true },
                    wins: { type: 'integer' },
                    losses: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            404: { $ref: 'errorResponse#' },
            500: { $ref: 'errorResponse#' }
        }
    }, async (request, reply) => {
        const userId = request.params.id;
        const query = `
            SELECT id, display_name, avatar_url, wins, losses, created_at
            FROM users
            WHERE id = ?
            `;

        try {
            const user = await fastify.sqlite.get(query, [userId]);
            if (!user) {
                reply.code(404)
                return { error: 'User not found' };
            }

            return {
                id: user.id,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                wins: user.wins,
                losses: user.losses,
                createdAt: user.created_at
            };
        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching the user profile.' };
        }
    });

    // Gets the match history for a specific user.
    fastify.get('/:id/history', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        matchId: { type: 'integer' },
                        playerOneId: { type: 'integer' },
                        playerTwoId: { type: 'integer' },
                        playerOneScore: { type: 'integer' },
                        playerTwoScore: { type: 'integer' },
                        winnerId: { type: 'integer' },
                        playedAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
            500: { $ref: 'errorResponse#' }
        }
    }, async (request, reply) => {
        const userId = request.params.id;
        const query = `
            SELECT m.id, m.player_one_id, m.player_two_id, m.player_one_score, m.player_two_score, m.winner_id, m.played_at
            FROM matches AS m
            WHERE m.player_one_id = ? OR m.player_two_id = ?
            ORDER BY m.played_at DESC
        `;

        try {
            const matches = await fastify.sqlite.all(query, [userId, userId]);
            return matches.map(match => ({
                matchId: match.id,
                playerOneId: match.player_one_id,
                playerTwoId: match.player_two_id,
                playerOneScore: match.player_one_score,
                playerTwoScore: match.player_two_score,
                winnerId: match.winner_id,
                playedAt: match.played_at
            }));
        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { error: 'An unexpected error occurred while fetching match history.' };
        }
    });
}
