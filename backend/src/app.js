import fastifyPlugin from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';

import path from 'path';
import { fileURLToPath } from 'url';

import sharedSchemas from './schemas/sharedSchemas.js'
import jwtSetup from './plugins/jwtSetup.js';
import lobby from './plugins/lobby.js';
import prisma from './plugins/prisma.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import matchesRoutes from './routes/matches.js';
import tournamentsRoutes from './routes/tournaments.js';

// This function will contain all our application's setup logic
async function app(fastify, opts) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Register plugins
    await fastify.register(fastifyCors, { origin: ["http://localhost:5173", "http://localhost:8443"] });
    await fastify.register(sharedSchemas);
    await fastify.register(fastifyWebsocket);
    await fastify.register(fastifyMultipart);
    await fastify.register(fastifyCookie, { secret: process.env.COOKIE_SECRET });
    await fastify.register(fastifyStatic, { root: path.join(__dirname, '..', 'public'), prefix: '/', });
    await fastify.register(jwtSetup);
    await fastify.register(lobby);
    await fastify.register(prisma);

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/api/health' });
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(usersRoutes, { prefix: '/api/users' });
    await fastify.register(friendsRoutes, { prefix: '/api/friends' });
    await fastify.register(matchesRoutes, { prefix: '/api/matches' });
    await fastify.register(tournamentsRoutes, { prefix: '/api/tournaments' });
}

// Wrap the plugin with fastify-plugin to avoid encapsulation issues
export default fastifyPlugin(app);
