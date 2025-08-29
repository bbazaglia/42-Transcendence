import fp from 'fastify-plugin';
import prisma from '../lib/prismaClients.js';

async function prismaPlugin(fastify, opts) {

    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
}

export default fp(prismaPlugin);
