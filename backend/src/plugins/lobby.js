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

// Helper function to strip sensitive info and ensure consistent naming.
function toPublicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        displayName: user.display_name || user.displayName, // Handle both snake_case and camelCase
        avatarUrl: user.avatar_url || user.avatarUrl
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
                guests: new Map(), // Real players who log in after the Host
                participants: new Map() // All active entities, including Host and AI
            };

            activeLobby.participants.set(hostUser.id, hostUser);
            activeLobby.participants.set(AI_PLAYER_ID, { id: AI_PLAYER_ID, displayName: 'AI Bot' });

            fastify.log.info(`Lobby created by host: ${hostUser.displayName}`);

            const publicParticipants = Array.from(activeLobby.participants.values()).map(toPublicUser);
            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.LOBBY_CREATED, payload: { host: toPublicUser(hostUser), participants: publicParticipants } }));
        } catch (err) {
            return connection.socket.close(1008, 'Authentication failed.');
        }

        connection.socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                switch (data.type) {
                    case MESSAGE_TYPES.GUEST_AUTH: {
                        const { username, password } = data.payload;
                        const guestUser = await fastify.sqlite.get('SELECT * FROM users WHERE display_name = ?', [username]);
                        const isPasswordValid = guestUser && await bcrypt.compare(password, guestUser.password_hash);

                        if (isPasswordValid && activeLobby) {
                            if (activeLobby.participants.has(guestUser.id)) {
                                connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_JOIN_FAILURE, payload: { error: 'User is already in the lobby.' } }));
                                break;
                            }

                            activeLobby.guests.set(guestUser.id, guestUser);
                            activeLobby.participants.set(guestUser.id, guestUser);

                            broadcastLobbyState(MESSAGE_TYPES.GUEST_JOIN_SUCCESS);
                        } else {
                            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_JOIN_FAILURE, payload: { error: 'Invalid credentials' } }));
                        }
                        break;
                    }

                    case MESSAGE_TYPES.GUEST_LOGOUT: {
                        const { guestId } = data.payload;

                        if (activeLobby && activeLobby.guests.has(guestId)) {
                            activeLobby.guests.delete(guestId);
                            activeLobby.participants.delete(guestId);

                            broadcastLobbyState(MESSAGE_TYPES.GUEST_LEAVE_SUCCESS);
                        } else {
                            connection.socket.send(JSON.stringify({ type: MESSAGE_TYPES.GUEST_LEAVE_FAILURE, payload: { error: 'Guest not found in lobby.' } }));
                        }
                        break;
                    }

                    case MESSAGE_TYPES.UPDATE_PARTICIPANT_PROFILE: {
                        const { userId, newDisplayName, newAvatarUrl } = data.payload;

                        if (activeLobby && activeLobby.participants.has(userId)) {
                            try {
                                const participant = activeLobby.participants.get(userId);

                                // Update display name if provided
                                if (newDisplayName) {
                                    await fastify.sqlite.run('UPDATE users SET display_name = ? WHERE id = ?', [newDisplayName, userId]);
                                    participant.display_name = newDisplayName;
                                    participant.displayName = newDisplayName; // Keep both consistent
                                }

                                // Update avatar URL if provided
                                if (newAvatarUrl) {
                                    await fastify.sqlite.run('UPDATE users SET avatar_url = ? WHERE id = ?', [newAvatarUrl, userId]);
                                    participant.avatar_url = newAvatarUrl;
                                    participant.avatarUrl = newAvatarUrl;
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
