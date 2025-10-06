/**
 * Match Service
 * Manages match creation and history
 */

import { apiService, Match, CreateMatchRequest } from './ApiService.js';
import { sessionService } from './SessionService.js';

//TODO: remove all currentUser related code as it is obsolete
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
      // Check if user is authenticated
      if (!sessionService.isAuthenticated()) {
        console.log('User not authenticated, skipping match creation');
        return { success: false, error: 'User not authenticated' };
      }

      const participants = sessionService.getParticipants();
      const currentUser = participants.find(p => p.id);
      if (!currentUser) {
        return { success: false, error: 'User not found' };
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

      // Update user stats locally
      this.updateLocalUserStats(matchResult);

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
        console.error('Falha ao carregar histórico de partidas');
        return [];
      }

      this.matchHistory = response.data?.matches || [];
      return this.matchHistory;

    } catch (error) {
      console.error('Error fetching match history:', error);
      console.error('Falha ao carregar histórico de partidas');
      return [];
    }
  }

  /**
   * Gets local match history
   */
  getLocalMatchHistory(): Match[] {
    return [...this.matchHistory];
  }

  /**
   * Clears local match history
   */
  clearLocalHistory(): void {
    this.matchHistory = [];
  }

  /**
   * Creates a match result from game data
   */
  createMatchResult(
    _player1Name: string,
    _player2Name: string,
    score1: number,
    score2: number,
    winner: string
  ): MatchResult | null {
    // For now, we'll use placeholder IDs since we don't have a user management system
    // In a real implementation, you'd look up user IDs by name or have them passed in
    const participants = sessionService.getParticipants();
    const currentUser = participants.find(p => p.id);
    if (!currentUser || !currentUser.id) {
      return null;
    }

    // Determine winner ID based on winner name
    const isPlayer1Winner = winner === 'Player 1';
    const winnerId = isPlayer1Winner ? currentUser.id : 2; // Placeholder for player 2
    const playerOneId = currentUser.id;
    const playerTwoId = 2; // Placeholder for player 2

    return {
      playerOneId,
      playerTwoId,
      playerOneScore: score1,
      playerTwoScore: score2,
      winnerId,
    };
  }

  /**
   * Updates local user stats after a match
   */
  private updateLocalUserStats(matchResult: MatchResult): void {
    const participants = sessionService.getParticipants();
    const currentUser = participants.find(p => p.id);
    if (!currentUser || !currentUser.id) return;

    // Determine if current user won or lost
    const isCurrentUserWinner = matchResult.winnerId === currentUser.id;
    
    if (isCurrentUserWinner) {
      sessionService.updateUserStats(1, 0); // +1 win, +0 losses
    } else {
      sessionService.updateUserStats(0, 1); // +0 wins, +1 loss
    }
  }
}

// Export a singleton instance
export const matchService = new MatchService();
export default matchService;
