export const userDetailSelect = {
    id: true,
    displayName: true,
    avatarUrl: true,
    wins: true,
    losses: true,
    createdAt: true
};

export const matchDetailSelect = {
    id: true,
    playerOneScore: true,
    playerTwoScore: true,
    playedAt: true,
    playerOne: true,
    playerTwo: true,
    winner: true,
    tournamentId: true
};

export const tournamentDetailSelect = {
    id: true,
    name: true,
    status: true,
    maxParticipants: true,
    createdAt: true,
    winner: true,
    participants: { select: { user: true } },
    matches: true
};
