import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

async function jwtPlugin(fastify, opts) {
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET,
        cookie: {
            cookieName: 'token',
            signed: true // Tells fastify-jwt to look for a signed cookie
        }
    });
};

export default fp(jwtPlugin);
