export const publicUserSelect = {
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
    playerOne: { select: publicUserSelect },
    playerTwo: { select: publicUserSelect },
    winner: { select: publicUserSelect },
    tournamentId: true
};

export const tournamentDetailSelect = {
    id: true,
    name: true,
    status: true,
    maxParticipants: true,
    createdAt: true,
    winner: { select: publicUserSelect },
    participants: { select: { user: { select: publicUserSelect } } },
    matches: { select: matchDetailSelect }
};
