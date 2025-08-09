import fastifyPlugin from 'fastify-plugin';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';

import path from 'path';
import { fileURLToPath } from 'url';

import jwtSetup from './plugins/jwtSetup.js';
import lobby from './lobby.js';
import sqlite from 'fastify-sqlite';

import {
    createUserTableSQL,
    createFriendsTableSQL,
    createMatchesTableSQL,
    createTournamentsTableSQL,
    createTournamentParticipantsTableSQL
} from './schema.js';

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
    await fastify.register(cors, { origin: ["http://localhost:5173", "http://localhost:8443"] });
    await fastify.register(websocket);
    await fastify.register(jwtSetup);
    await fastify.register(lobby);
    await fastify.register(sqlite, { database: path.join(__dirname, '..', 'data', 'mydb.sqlite') });
    await fastify.register(multipart);
    await fastify.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/',
    });

    // Initialize databases
    await fastify.sqlite.exec('PRAGMA foreign_keys = ON;');
    await fastify.sqlite.exec(createUserTableSQL);
    await fastify.sqlite.exec(createFriendsTableSQL);
    await fastify.sqlite.exec(createMatchesTableSQL);
    await fastify.sqlite.exec(createTournamentsTableSQL);
    await fastify.sqlite.exec(createTournamentParticipantsTableSQL);

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
