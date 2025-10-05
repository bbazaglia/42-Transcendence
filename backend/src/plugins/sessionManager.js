import fp from 'fastify-plugin';
import { randomUUID, createHmac } from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/app/data';
const SESSION_FILE = path.join(DATA_DIR, 'session.json');
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_SECRET = process.env.SESSION_SECRET;

async function sessionManager(fastify, opts) {
    if (!SESSION_SECRET) {
        throw new Error('SESSION_SECRET is not defined. The application cannot start securely.');
    }

    let activeSession = null;

    // --- Load and VERIFY session on startup ---
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(SESSION_FILE)) {
            const fileContent = fs.readFileSync(SESSION_FILE, 'utf-8');
            if (fileContent) {
                const { data, signature } = JSON.parse(fileContent);

                const expectedSignature = createHmac('sha256', SESSION_SECRET)
                    .update(JSON.stringify(data))
                    .digest('hex');

                if (signature !== expectedSignature) {
                    throw new Error('Session file signature mismatch. File may have been tampered with.');
                }

                activeSession = { ...data, participants: new Map(data.participants) };
                fastify.log.info(`Verified and loaded active session ${activeSession.sessionId} from file.`);
            }
        }
    } catch (err) {
        fastify.log.error(err, 'Failed to load or verify session file. Starting fresh.');
        activeSession = null;
    }

    const sessionService = {
        get() {
            if (!activeSession) return null;
            const isExpired = (Date.now() - activeSession.lastActivity) > SESSION_TIMEOUT_MS;
            if (isExpired) {
                fastify.log.info(`Session ${activeSession.sessionId} has expired. Clearing.`);
                sessionService.set(null);
                return null;
            }
            activeSession.lastActivity = Date.now();
            return activeSession;
        },

        set(session) {
            if (session) {
                session.lastActivity = Date.now();
            }
            activeSession = session;

            try {
                if (session) {
                    const serializableData = { ...session, participants: Array.from(session.participants.entries()) };
                    const signature = createHmac('sha256', SESSION_SECRET)
                        .update(JSON.stringify(serializableData))
                        .digest('hex');
                    const payload = JSON.stringify({ data: serializableData, signature }, null, 2);
                    fs.writeFileSync(SESSION_FILE, payload);
                } else {
                    if (fs.existsSync(SESSION_FILE)) {
                        fs.unlinkSync(SESSION_FILE);
                    }
                }
            } catch (err) {
                fastify.log.error(err, 'Failed to save session to file.');
            }
        },

        create(firstUser) {
            const newSession = {
                sessionId: randomUUID(),
                participants: new Map(),
                lastActivity: Date.now()
            };
            newSession.participants.set(firstUser.id, firstUser);
            sessionService.set(newSession);
            return newSession;
        },

        isParticipant(userId) {
            const session = sessionService.get();
            return session ? session.participants.has(userId) : false;
        },

        async updateSessionActivity(request, reply) {
            const session = activeSession; // Access the raw session without triggering expiry check
            if (session) {
                session.lastActivity = Date.now();
                // We don't need to save to file here, just keep it alive in memory.
                // The next call to set() will persist the new timestamp.
            }
        },

        async authorize(request, reply) {
            try {
                await request.jwtVerify();
            } catch (err) {
                // The token is malformed, expired, or has a bad signature.
                throw fastify.httpErrors.unauthorized('Invalid token');
            }

            const session = sessionService.get();

            // If there's no session or the session IDs don't match, the token is for a dead session.
            if (!session || request.user.sessionId !== session.sessionId) {
                throw fastify.httpErrors.unauthorized('Invalid or expired session. Please log in.');
            }

            fastify.log.info(`Session ${session.sessionId} authorized`);
        },

        async authorizeParticipant(request, reply) {
            await sessionService.authorize(request, reply);

            const userId = request.params.userId ?? request.body.actorId;

            if (userId === undefined) {
                // This is a server-side configuration error.
                fastify.log.warn('authorizeParticipant was used on a route without a userId in params or body.');
                throw fastify.httpErrors.internalServerError();
            }

            if (!sessionService.isParticipant(parseInt(userId, 10))) {
                throw fastify.httpErrors.forbidden('The specified user is not part of the current session.');
            }

            fastify.log.info(`User ${userId} authorized for session ${sessionService.get().sessionId}`);
        }
    };

    fastify.decorate('session', sessionService);
};

export default fp(sessionManager);
