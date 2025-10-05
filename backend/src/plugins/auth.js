import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

async function authPlugin(fastify, opts) {
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        cookie: {
            cookieName: 'token',
            signed: true // Tells fastify-jwt to look for a signed cookie
        }
    });

    const authorize = async (request, reply) => {
        try {
            // Verification will populate request.user with the decoded token
            // payload (which should include sessionId)
            await request.jwtVerify();

            const sessionId = request.user.sessionId;
            if (!sessionId) {
                throw new Error('JWT is missing sessionId');
            }

            const sessionData = await request.sessionStore.get(sessionId);
            if (!sessionData) {
                throw new Error('Session not found on server.');
            }

            // Attach the real session data to the request for use in routes.
            request.sessionData = sessionData;

            // Attach a helper to save the session data easily
            request.saveSession = () => request.sessionStore.set(sessionId, request.sessionData);

        } catch (err) {
            throw fastify.httpErrors.unauthorized('Invalid or expired session.');
        }
    };

    const authorizeParticipant = async (request, reply) => {
        await authorize(request, reply);

        // We check for userId in params (for GET/DELETE) or actorId in body (for POST/PUT)
        const participantId = request.params?.userId ?? request.body?.actorId;

        if (participantId === undefined) {
            throw fastify.httpErrors.badRequest('Request must include an participantId.');
        }

        const actorIsParticipant = request.sessionData.participants.includes(parseInt(participantId, 10));

        if (!actorIsParticipant) {
            throw fastify.httpErrors.forbidden('The specified actor is not part of this session.');
        }
    };

    // Helper to get the full participant profiles from an array of IDs
    async function getHydratedParticipants(participantIds = []) {
        if (participantIds.length === 0) {
            return [];
        }
        return fastify.prisma.user.findMany({
            where: { id: { in: participantIds } },
            select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                wins: true,
                losses: true,
                createdAt: true,
            }
        });
    };

    fastify.decorate('authorize', authorize);
    fastify.decorate('authorizeParticipant', authorizeParticipant);
    fastify.decorate('getHydratedParticipants', getHydratedParticipants);
};

export default fp(authPlugin);
