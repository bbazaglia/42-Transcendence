import { PrismaClient } from '@prisma/client';

const privatePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const prisma = privatePrisma.$extends({
    result: {
        user: {
            email: { compute: () => undefined },
            passwordHash: { compute: () => undefined },
            twoFaSecret: { compute: () => undefined },
        },
    },
});

// Export the client with secrets under a specific, named export.
export { privatePrisma };

// Export the safe, extended client as the default export.
export default prisma;