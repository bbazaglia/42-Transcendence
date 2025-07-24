import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({
  logger: true
});

// Register the CORS plugin
await fastify.register(cors, { 
  origin: ["http://localhost:5173", "http://localhost:8443"]
});

// Example API route
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok' };
});

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