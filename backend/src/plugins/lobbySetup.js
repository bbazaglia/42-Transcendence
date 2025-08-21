import fp from 'fastify-plugin';

export default fp(async function (fastify, opts) {
    let activeLobby = null;
    const AI_PLAYER_ID = 0;
    const AI_CREATED_AT = new Date();
    const AI_PLAYER = {
        id: AI_PLAYER_ID,
        displayName: 'AI Bot',
        avatarUrl: '/avatars/ai-avatar.png',
        wins: 0,
        losses: 0,
        createdAt: AI_CREATED_AT
    };

    function getLobby() {
        return activeLobby;
    }

    function setLobby(lobby) {
        activeLobby = lobby;
    }

    async function lobbyAuth(request, reply) {
        const lobby = fastify.getLobby();
        if (!lobby) {
            return reply.forbidden('No active lobby session.');
        }
        if (lobby.host.id !== request.user.id) {
            return reply.forbidden('You are not the host of the active lobby.');
        }
    }

    // expose decorators globally (safe single source of truth)
    fastify.decorate('getLobby', getLobby);
    fastify.decorate('setLobby', setLobby);
    fastify.decorate('lobbyAuth', lobbyAuth);
    fastify.decorate('AI_PLAYER_ID', AI_PLAYER_ID);
    fastify.decorate('AI_PLAYER', AI_PLAYER);
});
