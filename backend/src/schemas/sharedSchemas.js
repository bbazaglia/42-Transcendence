import fp from 'fastify-plugin';

async function sharedSchemas(fastify, opts) {
    const errorResponseSchema = {
        $id: 'errorResponse',
        type: 'object',
        properties: {
            error: { type: 'string' }
        }
    };
    fastify.addSchema(errorResponseSchema);
}

export default fp(sharedSchemas);
