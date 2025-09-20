import fp from 'fastify-plugin';

async function lobbySetup(fastify, opts) {
    // This state is now private to this plugin's scope.
    let activeLobby = null;

    // Define the single service object that will be decorated.
    const lobbyService = {
        // Constants
        AI_PLAYER_ID: 0,
        AI_PLAYER: {
            id: 0,
            displayName: 'AI Bot',
            avatarUrl: '/avatars/ai-avatar.png',
            wins: 0,
            losses: 0,
            createdAt: new Date()
        },

        // Methods
        get() {
            return activeLobby;
        },

        set(lobby) {
            activeLobby = lobby;
        },

        async auth(request, reply) {
            const lobby = this.get();
            if (!lobby) {
                return reply.forbidden('No active lobby session.');
            }

            if (lobby.host.id !== request.user.id) {
                return reply.forbidden('You are not the host of the active lobby.');
            }
        },

        isParticipant(userId) {
            const lobby = this.get();
            if (!lobby) {
                fastify.log.warn('No active lobby when checking participant.');
                return false;
            }

            if (lobby.host.id === userId) {
                return true;
            }

            return lobby.participants.some(p => p.id === userId);
        }
    };

    // Decorate the fastify instance with the single service object.
    fastify.decorate('lobby', lobbyService);
};

export default fp(lobbySetup);
