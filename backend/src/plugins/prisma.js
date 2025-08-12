import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

async function prisma(fastify, opts) {
    const prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
}

export default fp(prisma);
