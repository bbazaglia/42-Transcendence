import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

async function jwtPlugin(fastify, opts) {
    fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        cookie: {
            cookieName: 'token',
            signed: false // JWT is already signed, we don't need to sign the cookie also
        }
    });

    // Accessible through fastify.authenticate
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            // This verifies the token from the Authorization header.
            // If valid, it attaches the decoded user info to `request.user`.
            await request.jwtVerify();
        } catch (error) {
            // If the token is missing or invalid, send a 401 Unauthorized error.
            return reply.unauthorized('The host must be authenticated to access this resource.');
        }
    });
};

export default fp(jwtPlugin);
