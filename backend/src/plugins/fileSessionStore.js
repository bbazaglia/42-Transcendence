import fp from 'fastify-plugin';
import fastifySession from '@fastify/session';

import { readFile, unlink, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

// In-memory cache for performance
const cache = {}

/**
 * A custom file-based session store that implements the SessionStore interface.
 * It uses an in-memory cache for fast reads and writes to disk for persistence.
 */
export class FileStore {

    constructor(directory) {
        this.directory = directory;
    }

    sessionFile(sessionId) {
        return this.directory + '/' + sessionId + '.json';
    }

    async set(sessionId, session, callback) {
        // Promisify wrapper for async/await consumers
        if (!callback) {
            return new Promise((resolve, reject) => {
                this.set(sessionId, session, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }

        try {
            const string = JSON.stringify(session);
            // Optimization: Don't write to disk if the session data hasn't changed.
            if (cache[sessionId] && (string === JSON.stringify(cache[sessionId]))) {
                return callback();
            }
            cache[sessionId] = session;
            const filePath = this.sessionFile(sessionId);

            // Ensure the directory exists before writing.
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, string, 'utf8');
            callback();
        } catch (error) {
            console.error(`[FileStore] Error setting session ${sessionId}:`, error);
            callback(error);
        }
    }

    async get(sessionId, callback) {
        // Promisify wrapper for async/await consumers
        if (!callback) {
            return new Promise((resolve, reject) => {
                this.get(sessionId, (err, session) => {
                    if (err) return reject(err);
                    resolve(session);
                });
            });
        }

        // First, try to get the session from the in-memory cache.
        if (cache[sessionId]) {
            return callback(null, cache[sessionId]);
        }

        try {
            const data = await readFile(this.sessionFile(sessionId), 'utf8');
            if (!data.length) {
                return callback(null); // File is empty.
            }
            const session = JSON.parse(data);
            cache[sessionId] = session; // Store in cache for next time.
            callback(null, session);

        } catch (error) {
            // This is the crucial part: If the file doesn't exist, it's not an error.
            // It simply means there is no session, so we return null.
            if (error.code === 'ENOENT') {
                return callback(null);
            }
            // For any other error (e.g., corrupted JSON), log it and treat as no session.
            console.error(`[FileStore] Error getting session ${sessionId}:`, error);
            callback(error);
        }
    }

    async destroy(sessionId, callback) {
        // Promisify wrapper for async/await consumers
        if (!callback) {
            return new Promise((resolve, reject) => {
                this.destroy(sessionId, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }

        try {
            delete cache[sessionId];
            await unlink(this.sessionFile(sessionId));
            callback();

        } catch (error) {
            // If the file doesn't exist, our job is already done.
            if (error.code === 'ENOENT') {
                return callback();
            }
            console.error(`[FileStore] Error destroying session ${sessionId}:`, error);
            callback(error);
        }
    }
}

async function sessionStorePlugin(fastify, opts) {
    // This plugin provides the server-side storage mechanism.
    // It does NOT handle cookies itself. It just manages the data store.
    fastify.register(fastifySession, {
        secret: process.env.SESSION_SECRET,
        store: new FileStore('/app/data/sessions'),
        // We disable the plugin's own cookie because our JWT will handle it.
        cookie: {
            maxAge: 0,
        },
        saveUninitialized: false,
    });
}

export default fp(sessionStorePlugin);