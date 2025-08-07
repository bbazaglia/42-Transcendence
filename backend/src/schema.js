export const createUserTableSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT,
    avatar_url TEXT DEFAULT '/default-avatar.png',
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    google_id TEXT,
    two_fa_secret TEXT,
    is_two_fa_enabled BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createFriendsTableSQL = `
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_one_id INTEGER NOT NULL,
    user_two_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    action_user_id INTEGER NOT NULL,
    FOREIGN KEY (user_one_id) REFERENCES users (id),
    FOREIGN KEY (user_two_id) REFERENCES users (id),
    FOREIGN KEY (action_user_id) REFERENCES users (id),
    UNIQUE (user_one_id, user_two_id) -- Ensures a friendship is only represented once
  );
`;

export const createMatchesTableSQL = `
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_one_id INTEGER NOT NULL,
    player_two_id INTEGER NOT NULL,
    player_one_score INTEGER NOT NULL,
    player_two_score INTEGER NOT NULL,
    winner_id INTEGER NOT NULL,
    tournament_id INTEGER, -- Can be NULL for non-tournament matches
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_one_id) REFERENCES users (id),
    FOREIGN KEY (player_two_id) REFERENCES users (id),
    FOREIGN KEY (winner_id) REFERENCES users (id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
  );
`;

export const createTournamentsTableSQL = `
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  );
`;

export const createTournamentParticipantsTableSQL = `
  CREATE TABLE IF NOT EXISTS tournament_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE (tournament_id, user_id) -- Ensures a user can only join a tournament once
  );
`;
