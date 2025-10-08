-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "avatar_url" TEXT NOT NULL DEFAULT '/avatars/default-avatar.png',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "google_id" TEXT,
    "two_fa_secret" TEXT,
    "is_two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "friends" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_one_id" INTEGER NOT NULL,
    "user_two_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "action_user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "friends_user_one_id_fkey" FOREIGN KEY ("user_one_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "friends_user_two_id_fkey" FOREIGN KEY ("user_two_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "friends_action_user_id_fkey" FOREIGN KEY ("action_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "player_one_id" INTEGER NOT NULL,
    "player_two_id" INTEGER NOT NULL,
    "player_one_score" INTEGER NOT NULL,
    "player_two_score" INTEGER NOT NULL,
    "winner_id" INTEGER,
    "played_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "matches_player_one_id_fkey" FOREIGN KEY ("player_one_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "matches_player_two_id_fkey" FOREIGN KEY ("player_two_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_display_name_key" ON "users"("display_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "friends_user_one_id_user_two_id_key" ON "friends"("user_one_id", "user_two_id");
