/**
 * Includes all scalar fields for a Match, plus the full
 * User objects for the players and winner.
 */
export const matchQueryTemplate = {
    include: {
        playerOne: true,
        playerTwo: true,
        winner: true
    }
};

/**
 * Includes all scalar fields for a Tournament, plus all its related
 * data: the winner, the participants (and their user data), and all
 * matches (including their player data).
 */
export const tournamentQueryTemplate = {
    include: {
        winner: true,
        participants: {
            include: {
                user: true
            }
        },
        matches: matchQueryTemplate
    }
};
