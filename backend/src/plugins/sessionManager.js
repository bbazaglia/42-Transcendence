import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

async function sessionManager(fastify, opts) {
    let activeSession = null;

    const sessionService = {
        get() {
            return activeSession;
        },

        set(session) {
            activeSession = session;
        },

        create(firstUser) {
            const newSession = {
                sessionId: randomUUID(),
                participants: new Map()
            };
            newSession.participants.set(firstUser.id, firstUser);
            activeSession = newSession;
            return activeSession;
        },

        isParticipant(userId) {
            const session = this.get();
            return session ? session.participants.has(userId) : false;
        },

        async authorize(request, reply) {
            try {
                await request.jwtVerify();
            } catch (err) {
                // The token is malformed, expired, or has a bad signature.
                throw fastify.httpErrors.unauthorized('Invalid token');
            }

            const session = this.get();

            // If there's no session or the session IDs don't match, the token is for a dead session.
            if (!session || request.user.sessionId !== session.sessionId) {
                throw fastify.httpErrors.unauthorized('Invalid or expired session. Please log in.');
            }
        },

        async authorizeParticipant(request, reply) {
            await this.authorize(request, reply);

            const userId = request.params.userId ?? request.body.actorId;

            if (userId === undefined) {
                // This is a server-side configuration error.
                fastify.log.warn('authorizeParticipant was used on a route without a userId in params or body.');
                throw fastify.httpErrors.internalServerError();
            }

            if (!this.isParticipant(parseInt(userId, 10))) {
                throw fastify.httpErrors.forbidden('The specified user is not part of the current session.');
            }
        }
    };

    fastify.decorate('session', sessionService);
};

export default fp(sessionManager);
