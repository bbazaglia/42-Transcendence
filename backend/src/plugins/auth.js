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

        // The ID of the user being authorized can be in the URL parameters or in the request body.
        // We prioritize the ID from the URL params if it exists, otherwise we check the body.
        let participantId = request.params?.userId;
        if (participantId === undefined) {
            participantId = request.body?.actorId;
        }

        if (participantId === undefined) {
            throw fastify.httpErrors.badRequest('Request must include a participantId in the URL params or as actorId in the body.');
        }

        // Ensure the ID is an integer before checking for inclusion.
        const participantIdInt = parseInt(participantId, 10);
        if (isNaN(participantIdInt)) {
            throw fastify.httpErrors.badRequest('Participant ID must be an integer.');
        }

        const actorIsParticipant = request.sessionData.participants.includes(participantIdInt);

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
