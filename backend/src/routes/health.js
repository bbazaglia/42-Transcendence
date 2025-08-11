export default async function (fastify, opts) {
    // ROUTE: API health check route
    fastify.get('/', async (request, reply) => {
        return {
            status: 'ok',
            message: 'Server is running',
            timestamp: new Date().toISOString(),
            method: request.method,
            url: request.url,
            protocol: request.protocol,
            headers: request.headers,
            query: request.query,
            body: request.body
        };
    });
}
