/**
 * Match Service
 * Manages match creation and history
 */

import { apiService, Match, CreateMatchRequest } from './ApiService.js';
import { sessionService } from './SessionService.js';

export interface MatchResult {
  playerOneId: number;
  playerTwoId: number;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: number;
}

class MatchService {
  private matchHistory: Match[] = [];

  /**
   * Creates a new match record in the backend
   */
  async createMatch(matchResult: MatchResult): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if session is authenticated
      if (!sessionService.isAuthenticated()) {
        console.log('Session not authenticated, skipping match creation');
        return { success: false, error: 'Session not authenticated' };
      }

      const matchData: CreateMatchRequest = {
        playerOneId: matchResult.playerOneId,
        playerTwoId: matchResult.playerTwoId,
        playerOneScore: matchResult.playerOneScore,
        playerTwoScore: matchResult.playerTwoScore,
        winnerId: matchResult.winnerId,
      };

      const response = await apiService.createMatch(matchData);

      if (response.error) {
        console.error('Failed to create match:', response.error);
        return { success: false, error: response.error };
      }

      // Add to local history
      if (response.data) {
        this.matchHistory.unshift(response.data);
      }

      //// Update user stats locally
      //this.updateLocalUserStats(matchResult);

      console.log('Match created successfully:', response.data);
      return { success: true };

    } catch (error) {
      console.error('Error creating match:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create match'
      };
    }
  }

  /**
   * Gets match history for a user
   */
  async getUserMatchHistory(userId: number): Promise<Match[]> {
    try {
      const response = await apiService.getUserMatchHistory(userId);

      if (response.error) {
        console.error('Failed to fetch match history:', response.error);
        return [];
      }

      this.matchHistory = response.data?.matches || [];
      return this.matchHistory;

    } catch (error) {
      console.error('Error fetching match history:', error);
      return [];
    }
  }

  // TODO: Remove after we test is not needed
  ///**
  // * Gets local match history
  // */
  //getLocalMatchHistory(): Match[] {
  //  return [...this.matchHistory];
  //}

  ///**
  // * Clears local match history
  // */
  //clearLocalHistory(): void {
  //  this.matchHistory = [];
  //}

  /**
   * Creates a match result from game data
   */
  createMatchResult(
    player1Name: string,
    player2Name: string,
    score1: number,
    score2: number,
    winner: string
  ): MatchResult | null {
    //TODO: Remove after we make sure AI games are not calling createMatch
    //// Skip AI games - we don't need to save statistics for AI matches
    //if (player2Name === 'AI') {
    //  console.log('Skipping AI match - no statistics to save');
    //  return null;
    //}

    const participants = sessionService.getParticipants();

    // Find both players by their display names
    const player1 = participants.find(p => p.displayName === player1Name);
    const player2 = participants.find(p => p.displayName === player2Name);

    if (!player1 || !player2) {
      console.error('Could not find both players in session participants:', { player1Name, player2Name, participants });
      return null;
    }

    // Determine winner ID based on winner name
    let winnerId: number;
    if (winner === player1Name) {
      winnerId = player1.id;
    } else if (winner === player2Name) {
      winnerId = player2.id;
    } else {
      console.error('Winner name does not match players:', { winner, player1Name, player2Name });
      return null;
    }

    const playerOneId = player1.id;
    const playerTwoId = player2.id;

    return {
      playerOneId,
      playerTwoId,
      playerOneScore: score1,
      playerTwoScore: score2,
      winnerId,
    };
  }

  // TODO: Remove after we test is not needed
  ///**
  // * Updates local user stats after a match
  // */
  //private updateLocalUserStats(matchResult: MatchResult): void {
  //  // Note: User stats are updated on the backend when the match is saved
  //  // This method is kept for potential future local caching needs
  //  console.log('Match result processed:', matchResult);
  //}
}

// Export a singleton instance
export const matchService = new MatchService();
export default matchService;
