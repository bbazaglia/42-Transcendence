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
};

export default fp(jwtPlugin);
