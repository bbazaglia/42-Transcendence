import fp from 'fastify-plugin';

export default fp(async function (fastify, opts) {
    let activeLobby = null;
    const AI_PLAYER_ID = 0;

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

    function toPublicUser(user) {
        if (!user) {
            return null;
        }

        return {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            wins: user.wins,
            losses: user.losses,
            createdAt: user.createdAt.toISOString()
        };
    }

    // expose decorators globally (safe single source of truth)
    fastify.decorate('getLobby', getLobby);
    fastify.decorate('setLobby', setLobby);
    fastify.decorate('lobbyAuth', lobbyAuth);
    fastify.decorate('AI_PLAYER_ID', AI_PLAYER_ID);
    fastify.decorate('toPublicUser', toPublicUser);
});
