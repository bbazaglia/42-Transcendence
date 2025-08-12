import fp from 'fastify-plugin';
import bcrypt from 'bcrypt';

let activeLobby = null;
const AI_PLAYER_ID = 0;

const MESSAGE_TYPES = {
    GUEST_AUTH: 'guest_authenticate',
    GUEST_LOGOUT: 'guest_logout',
    GUEST_JOIN_SUCCESS: 'guest_join_success',
    GUEST_JOIN_FAILURE: 'guest_join_failure',
    GUEST_LEAVE_SUCCESS: 'guest_leave_success',
    GUEST_LEAVE_FAILURE: 'guest_leave_failure',
    UPDATE_PARTICIPANT_PROFILE: 'update_participant_profile',
    UPDATE_PROFILE_SUCCESS: 'update_profile_success',
    UPDATE_PROFILE_FAILURE: 'update_profile_failure',
    LOBBY_CREATED: 'lobby_created',
    ERROR: 'error'
};

function toPublicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        wins: user.wins,
        losses: user.losses
    };
}

async function lobby(fastify, opts) {
    fastify.decorate('getLobby', () => activeLobby);

    fastify.get('/lobby', { websocket: true }, async (connection, request) => {
        if (activeLobby) {
            fastify.log.error('Attempted to create a second lobby. Connection rejected.');
            return connection.socket.close(1013, 'A lobby is already in session.');
        }

        let hostUser = null;
        try {
            hostUser = await request.jwtVerify();

            activeLobby = {
                host: hostUser,
                participants: new Map() // All active entities, including Host and AI
            };

            activeLobby.participants.set(hostUser.id, hostUser);
            activeLobby.participants.set(AI_PLAYER_ID, {
                id: AI_PLAYER_ID,
                displayName: 'AI Bot',
                avatarUrl: '/avatars/ai-avatar.png',
                wins: 0,
                losses: 0
            });

            fastify.log.info(`Lobby created by host: ${hostUser.displayName}`);

            const publicParticipants = Array.from(activeLobby.participants.values()).map(toPublicUser);
            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.LOBBY_CREATED, payload: { host: toPublicUser(hostUser), participants: publicParticipants } }));
        } catch (err) {
            return connection.socket.close(1008, 'Authentication failed.');
        }

        function broadcastLobbyState(messageType) {
            if (!activeLobby) {
                fastify.log.warn('Attempted to broadcast state for a non-existent lobby.');
                return;
            }

            const publicParticipants = Array.from(activeLobby.participants.values()).map(toPublicUser);
            const payload = {
                host: toPublicUser(activeLobby.host),
                participants: publicParticipants
            };
            const message = JSON.stringify({ type: messageType, payload });

            // Send back the updated state.
            if (connection.socket.readyState === 1) { // 1 means WebSocket.OPEN
                connection.socket.send(message);
            }

            fastify.log.info(`Broadcasted lobby state with type: ${messageType}`);
        }

        connection.socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                switch (data.type) {
                    case MESSAGE_TYPES.GUEST_AUTH: {
                        const { username, password } = data.payload;

                        const guestUser = await fastify.prisma.user.findUnique({
                            where: { displayName: username }
                        });

                        const isPasswordValid = guestUser && await bcrypt.compare(password, guestUser.passwordHash);

                        if (isPasswordValid && activeLobby) {
                            if (guestUser.id === activeLobby.host.id) {
                                connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_JOIN_FAILURE, payload: { error: 'Host cannot join as a guest.' } }));
                                break;
                            }

                            if (activeLobby.participants.has(guestUser.id)) {
                                connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_JOIN_FAILURE, payload: { error: 'User is already in the lobby.' } }));
                                break;
                            }

                            activeLobby.participants.set(guestUser.id, guestUser);

                            broadcastLobbyState(MESSAGE_TYPES.GUEST_JOIN_SUCCESS);
                        } else {
                            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_JOIN_FAILURE, payload: { error: 'Invalid credentials' } }));
                        }
                        break;
                    }

                    case MESSAGE_TYPES.GUEST_LOGOUT: {
                        const { guestId } = data.payload;

                        if (activeLobby && guestId !== activeLobby.host.id && guestId !== AI_PLAYER_ID && activeLobby.participants.has(guestId)) {
                            activeLobby.participants.delete(guestId);

                            broadcastLobbyState(MESSAGE_TYPES.GUEST_LEAVE_SUCCESS);
                        } else {
                            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_LEAVE_FAILURE, payload: { error: 'Guest not found in lobby.' } }));
                        }
                        break;
                    }

                    case MESSAGE_TYPES.UPDATE_PARTICIPANT_PROFILE: {
                        const { userId, newDisplayName, newAvatarUrl } = data.payload;

                        if (activeLobby && userId !== AI_PLAYER_ID && activeLobby.participants.has(userId)) {
                            try {
                                const dataToUpdate = {};
                                if (newDisplayName) {
                                    dataToUpdate.displayName = newDisplayName;
                                }
                                if (newAvatarUrl) {
                                    dataToUpdate.avatarUrl = newAvatarUrl;
                                }

                                // Only run the update if there's something to change
                                if (Object.keys(dataToUpdate).length > 0) {
                                    // Update the user in the DB and get the fresh object back.
                                    const updatedUser = await fastify.prisma.user.update({
                                        where: { id: userId },
                                        data: dataToUpdate
                                    });

                                    // Update the in-memory state using the definitive data from the DB.
                                    activeLobby.participants.set(userId, updatedUser);

                                    // Also update the host reference if it was the host who changed.
                                    if (userId === activeLobby.host.id) {
                                        activeLobby.host = updatedUser;
                                    }
                                }

                                broadcastLobbyState(MESSAGE_TYPES.UPDATE_PROFILE_SUCCESS);
                            } catch (err) {
                                fastify.log.error({ err }, 'Failed to update participant profile');
                                connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.UPDATE_PROFILE_FAILURE, payload: { error: 'Profile update failed.' } }));
                            }
                        } else {
                            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.UPDATE_PROFILE_FAILURE, payload: { error: 'Participant not found in lobby.' } }));
                        }
                        break;
                    }
                }
            } catch (err) {
                fastify.log.error({ err }, 'Error processing message:');
                connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { error: 'Invalid message format' } }));
            }
        });

        connection.socket.on('close', () => {
            activeLobby = null;
            fastify.log.info(`Lobby reset. Host ${hostUser?.displayName} disconnected.`);
        });
    });
}

export default fp(lobby);
