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

    // NOT USED AT THE MOMENT: logic changed to use WebSocket for profile updates
    // Gets the profile information of the currently logged-in user.
    fastify.get('/me', {
        schema: {
            params: { type: 'object', properties: {} },
            querystring: { type: 'object', properties: {} }
        }
    }, async (request, reply) => {
        const userId = request.user.id;
        const query = `
            SELECT id, display_name, email, avatar_url, wins, losses, created_at
            FROM users
            WHERE id = ?
        `;

        try {
            const user = await fastify.sqlite.get(query, [userId]);
            if (!user) {
                reply.code(404);
                return { error: 'User not found' };
            }

            return {
                id: user.id,
                displayName: user.display_name,
                email: user.email,
                avatarUrl: user.avatar_url,
                wins: user.wins,
                losses: user.losses,
                createdAt: user.created_at
            };
        } catch (err) {
            fastify.log.error(err);
            throw new Error('Internal Server Error');
        }
    });

    // NOT USED AT THE MOMENT: logic changed to use WebSocket for profile updates
    // Updates the profile information (like display name) of the logged-in user.
    fastify.put('/me', {
        schema: {
            body: {
                type: 'object',
                required: ['displayName'],
                properties: {
                    displayName: { type: 'string', minLength: 3, maxLength: 30 }
                }
            }
        }
    }, async (request, reply) => {
        const userId = request.user.id;
        const { displayName } = request.body;

        const updateQuery = `
            UPDATE users
            SET display_name = ?
            WHERE id = ?
        `;

        try {
            await fastify.sqlite.run(updateQuery, [displayName, userId]);
            return { message: 'Profile updated successfully' };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                reply.code(400);
                return { error: 'Display name already taken' };
            }
            fastify.log.error(err);
            throw new Error('Internal Server Error');
        }
    });

    // NOT USED AT THE MOMENT: logic changed to use WebSocket for profile updates
    // Handles uploading a new avatar image for the logged-in user.
    fastify.put('/me/avatar', async (request, reply) => {
        // file() method is added to the request by the @fastify/multipart plugin
        const data = await request.file();
        if (!data) {
            reply.code(400);
            return { error: 'No file uploaded.' };
        }

        // Delete the old avatar if it exists
        try {
            const currentAvatarQuery = `
                SELECT avatar_url
                FROM users
                WHERE id = ?   
            `;
            const user = await fastify.sqlite.get(currentAvatarQuery, [request.user.id]);

            // Check if there's an old avatar and it's not the default one
            if (user && user.avatar_url && !user.avatar_url.includes('default-avatar')) {
                const oldAvatarPath = path.join(__dirname, '..', '..', 'public', user.avatar_url);
                await fs.unlink(oldAvatarPath);
            }
        } catch (err) {
            // Log the error but don't stop the upload process if deletion fails
            fastify.log.warn(`Could not delete old avatar for user ${request.user.id}: ${err.message}`);
        }

        // Save the new avatar file
        const extension = path.extname(data.filename);
        const avatarFilename = `user-${request.user.id}-${Date.now()}${extension}`;
        const avatarPath = path.join(__dirname, '..', '..', 'public', 'avatars', avatarFilename);
        const avatarUrl = `/avatars/${avatarFilename}`;

        const updateQuery = `
            UPDATE users
            SET avatar_url = ?
            WHERE id = ?
            `;

        try {
            // Save the file to the filesystem
            await pump(data.file, fs.createWriteStream(avatarPath));

            // Update the user's avatar_url in the database
            await fastify.sqlite.run(updateQuery, [avatarUrl, request.user.id]);

            return { message: 'Avatar updated successfully', avatarUrl: avatarUrl };
        } catch (err) {
            fastify.log.error(err);
            throw new Error('Internal Server Error during file upload.');
        }
    });

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
            throw new Error('Internal Server Error');
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
            throw new Error('Internal Server Error');
        }
    });
}
