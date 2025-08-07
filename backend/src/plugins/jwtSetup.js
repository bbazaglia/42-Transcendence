import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

export default fp(async function (fastify, opts) {
    fastify.register(jwt, {
        secret: process.env.JWT_SECRET
    });

    // Accessible through fastify.authenticate
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            // This verifies the token from the Authorization header.
            // If valid, it attaches the decoded user info to `request.user`.
            await request.jwtVerify();
        } catch (err) {
            // If the token is missing or invalid, send a 401 Unauthorized error.
            reply.code(401).send({ message: 'Unauthorized' });
        }
    });
});
