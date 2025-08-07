import Fastify from 'fastify';
import app from './app.js';

// Create the Fastify instance
const fastify = Fastify({
  logger: true
});

// Register our main app plugin
await fastify.register(app);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
