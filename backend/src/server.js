import Fastify from 'fastify';
import { readFileSync } from 'fs';
import app from './app.js';

// Determine if we are in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Create the Fastify instance
const fastify = Fastify({
  ...(isProduction && {
    https: {
      allowHTTP1: true,
      key: readFileSync('/etc/ssl/private/nginx-selfsigned.key'),
      cert: readFileSync('/etc/ssl/certs/nginx-selfsigned.crt'),
    },
  }),
    logger: {
        level: isProduction ? 'info' : 'trace',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    }
});

// Register our main app plugin
await fastify.register(app);

// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();
