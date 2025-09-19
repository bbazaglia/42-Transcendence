import { PrismaClient } from '@prisma/client';

const privatePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// TODO: use single prisma client and use "omit: { key: false }" in the query when needed
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    omit: {
        user: {
            email: true,
            passwordHash: true,
            twoFaSecret: true,
            googleId: true,
        },
    },
});

// Export the client with secrets under a specific, named export.
export { privatePrisma };

// Export the safe, extended client as the default export.
export default prisma;
