import fp from 'fastify-plugin';
import prisma from '../lib/prisma.js';

async function prisma(fastify, opts) {

    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
}

export default fp(prisma);
