interface Match {
  player1: string | null;
  player2: string | null;
  winner: string | null;
  score1: number;
  score2: number;
}

interface Tournament {
  players: string[];
  matches: Match[];
  winner: string | null;
  currentRound: number;
}

export class TournamentManager {
  private currentTournament: Tournament | null = null;

  startTournament(aliases: string[]): void {
    // Validate power of 2 players for proper tournament bracket
    if (aliases.length !== 4 && aliases.length !== 8 && aliases.length !== 16) {
      throw new Error(
        "Tournaments require exactly 4, 8, or 16 players for proper bracket structure"
      );
    }

    // Shuffle players for random seeding
    const shuffledPlayers = [...aliases].sort(() => Math.random() - 0.5);

    this.currentTournament = {
      players: shuffledPlayers,
      matches: this.generateBracket(shuffledPlayers),
      winner: null,
      currentRound: 1,
    };

    // Save tournament to localStorage
    this.saveTournament();
  }

  getCurrentTournament(): Tournament | null {
    // Try to load from localStorage if no current tournament
    if (!this.currentTournament) {
      this.loadTournament();
    }
    return this.currentTournament;
  }

  private saveTournament(): void {
    if (this.currentTournament) {
      localStorage.setItem(
        "currentTournament",
        JSON.stringify(this.currentTournament)
      );
    }
  }

  private loadTournament(): void {
    const saved = localStorage.getItem("currentTournament");
    if (saved) {
      try {
        this.currentTournament = JSON.parse(saved);
        console.log(
          "Tournament loaded from localStorage:",
          this.currentTournament
        );
      } catch (e) {
        console.error("Failed to load tournament from localStorage:", e);
        this.currentTournament = null;
      }
    } else {
      console.log("No tournament found in localStorage");
    }
  }

  private generateBracket(players: string[]): Match[] {
    const matches: Match[] = [];
    const playerCount = players.length;

    // Generate first round matches
    for (let i = 0; i < playerCount; i += 2) {
      matches.push({
        player1: players[i] || null,
        player2: players[i + 1] || null,
        winner: null,
        score1: 0,
        score2: 0,
      });
    }

    // Add placeholder matches for subsequent rounds
    const totalRounds = Math.ceil(Math.log2(playerCount));
    let currentRoundMatches = Math.ceil(playerCount / 2);

    for (let round = 2; round <= totalRounds; round++) {
      currentRoundMatches = Math.ceil(currentRoundMatches / 2);
      for (let i = 0; i < currentRoundMatches; i++) {
        matches.push({
          player1: null,
          player2: null,
          winner: null,
          score1: 0,
          score2: 0,
        });
      }
    }

    return matches;
  }

  recordMatchResult(player1: string, player2: string, winner: string): void {
    if (!this.currentTournament) return;

    // Helper function to normalize player names by trimming and converting to lowercase.
    const normalize = (name: string | null | undefined): string => {
      if (!name) return "";
      return name.trim().toLowerCase();
    };

    const normalizedP1 = normalize(player1);
    const normalizedP2 = normalize(player2);

    const match = this.currentTournament.matches.find((m) => {
      const normalizedM1 = normalize(m.player1);
      const normalizedM2 = normalize(m.player2);

      return (
        (normalizedP1 === normalizedM1 && normalizedP2 === normalizedM2) ||
        (normalizedP1 === normalizedM2 && normalizedP2 === normalizedM1)
      );
    });

    if (match) {
      console.log("✅ Found match, updating winner:", {
        p1: match.player1,
        p2: match.player2,
        winner,
      });
      match.winner = winner;
      this.advanceWinner(winner, match);
      this.saveTournament();
    } else {
      console.error("❌ No match found for players:", player1, player2);
    }
  }

  private advanceWinner(winner: string, currentMatch: Match): void {
    if (!this.currentTournament) return;

    console.log("Advancing winner:", winner, "from match:", currentMatch);

    // Find the next match in the bracket
    const currentMatchIndex =
      this.currentTournament.matches.indexOf(currentMatch);
    console.log("Current match index:", currentMatchIndex);

    // Calculate next match index based on bracket structure
    const firstRoundMatches = Math.ceil(
      this.currentTournament.players.length / 2
    );
    const nextMatchIndex =
      firstRoundMatches + Math.floor(currentMatchIndex / 2);

    console.log(
      "Next match index:",
      nextMatchIndex,
      "Total matches:",
      this.currentTournament.matches.length
    );

    if (nextMatchIndex < this.currentTournament.matches.length) {
      const nextMatch = this.currentTournament.matches[nextMatchIndex];
      console.log("Next match before update:", nextMatch);

      if (!nextMatch.player1) {
        nextMatch.player1 = winner;
      } else if (!nextMatch.player2) {
        nextMatch.player2 = winner;
      }
    } else {
      console.log("Next match index out of bounds");
    }

    const finalMatch =
      this.currentTournament.matches[this.currentTournament.matches.length - 1];
    if (finalMatch.winner) {
      this.currentTournament.winner = finalMatch.winner;
    }
  }

  getNextMatch(): Match | null {
    if (!this.currentTournament) {
      console.log("No current tournament");
      return null;
    }

    const nextMatch = this.currentTournament.matches.find(
      (match) => !match.winner && match.player1 && match.player2
    );
    return nextMatch || null;
  }

  resetTournament(): void {
    this.currentTournament = null;
    localStorage.removeItem("currentTournament");
  }

  debugSetMatchResult(matchIndex: number, winner: string): void {
    if (
      !this.currentTournament ||
      matchIndex >= this.currentTournament.matches.length
    )
      return;

    const match = this.currentTournament.matches[matchIndex];
    if (match.player1 && match.player2) {
      match.winner = winner;
      this.advanceWinner(winner, match);
      this.saveTournament();
      console.log(`Debug: Set match ${matchIndex} winner to ${winner}`);
    }
  }
}
