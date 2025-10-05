import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyPlugin from 'fastify-plugin';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';

import path from 'path';
import { fileURLToPath } from 'url';

import sharedSchemas from './schemas/sharedSchemas.js'
import sessionManager from './plugins/sessionManager.js';
import jwtPlugin from './plugins/jwt.js';
import oauthPlugin from './plugins/oauth.js';
import prismaPlugin from './plugins/prisma.js';
import totpPlugin from './plugins/totp.js';

import analyticsRoutes from './routes/analytics.js';
import friendsRoutes from './routes/friends.js';
import healthRoutes from './routes/health.js';
import matchesRoutes from './routes/matches.js';
import sessionRoutes from './routes/session.js';
import tournamentsRoutes from './routes/tournaments.js';
import usersRoutes from './routes/users.js';

// This function will contain all our application's setup logic
async function app(fastify, opts) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Register plugins
    await fastify.register(fastifyCookie, { secret: process.env.COOKIE_SECRET });
    await fastify.register(fastifyCors, { origin: [process.env.FRONTEND_URL], credentials: true });
    await fastify.register(fastifySensible, { sharedSchemaId: 'httpError' });
    await fastify.register(fastifyStatic, { root: path.join(__dirname, '..', 'public'), prefix: '/', });
    await fastify.register(sharedSchemas);
    await fastify.register(sessionManager);
    await fastify.register(jwtPlugin);
    await fastify.register(totpPlugin, { issuer: 'ft_transcendence' });
    await fastify.register(oauthPlugin);
    await fastify.register(prismaPlugin);

    // Register routes
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
    await fastify.register(friendsRoutes, { prefix: '/api/friends' });
    await fastify.register(healthRoutes, { prefix: '/api/health' });
    await fastify.register(matchesRoutes, { prefix: '/api/matches' });
    await fastify.register(sessionRoutes, { prefix: '/api/session' });
    await fastify.register(tournamentsRoutes, { prefix: '/api/tournaments' });
    await fastify.register(usersRoutes, { prefix: '/api/users' });
}

// Wrap the plugin with fastify-plugin to avoid encapsulation issues
export default fastifyPlugin(app);
