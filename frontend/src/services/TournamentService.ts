/**
 * Tournament Service
 * Manages tournament operations and state
 */

import { apiService } from './ApiService.js';
import { authService } from './AuthService.js';

export interface Tournament {
  id: number;
  name: string;
  maxParticipants: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  winnerId?: number;
  participants: Array<{
    id: number;
    displayName: string;
    email: string;
    wins: number;
    losses: number;
    avatarUrl: string;
  }>;
  matches?: Array<{
    id: number;
    playerOneId: number;
    playerTwoId: number;
    playerOneScore?: number;
    playerTwoScore?: number;
    winnerId?: number;
    playedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTournamentRequest {
  name: string;
  maxParticipants: number;
}

export interface JoinTournamentRequest {
  userId: number;
}

export interface UpdateMatchRequest {
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: number;
}

class TournamentService {
  private tournaments: Tournament[] = [];
  private currentTournament: Tournament | null = null;

  /**
   * Gets all tournaments
   */
  async getTournaments(): Promise<Tournament[]> {
    try {
      const response = await apiService.request<Tournament[]>('/tournaments');
      
      if (response.error) {
        console.error('Failed to fetch tournaments:', response.error);
        return [];
      }

      this.tournaments = response.data || [];
      return this.tournaments;

    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
  }

  /**
   * Gets a specific tournament by ID
   */
  async getTournament(tournamentId: number): Promise<Tournament | null> {
    try {
      const response = await apiService.request<Tournament>(`/tournaments/${tournamentId}`);
      
      if (response.error) {
        console.error('Failed to fetch tournament:', response.error);
        return null;
      }

      this.currentTournament = response.data || null;
      return this.currentTournament;

    } catch (error) {
      console.error('Error fetching tournament:', error);
      return null;
    }
  }

  /**
   * Creates a new tournament
   */
  async createTournament(tournamentData: CreateTournamentRequest): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const response = await apiService.request<Tournament>('/tournaments', {
        method: 'POST',
        body: JSON.stringify(tournamentData),
      });

      if (response.error) {
        console.error('Failed to create tournament:', response.error);
        return { success: false, error: response.error };
      }

      const tournament = response.data!;
      this.tournaments.unshift(tournament);
      console.log('Tournament created successfully:', tournament.name);
      return { success: true, tournament };

    } catch (error) {
      console.error('Error creating tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create tournament' 
      };
    }
  }

  /**
   * Joins a tournament
   */
  async joinTournament(tournamentId: number): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await apiService.request<Tournament>(`/tournaments/${tournamentId}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (response.error) {
        console.error('Failed to join tournament:', response.error);
        return { success: false, error: response.error };
      }

      const tournament = response.data!;
      // Update local tournaments list
      const index = this.tournaments.findIndex(t => t.id === tournamentId);
      if (index !== -1) {
        this.tournaments[index] = tournament;
      }
      
      console.log('Successfully joined tournament:', tournament.name);
      return { success: true, tournament };

    } catch (error) {
      console.error('Error joining tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join tournament' 
      };
    }
  }

  /**
   * Starts a tournament
   */
  async startTournament(tournamentId: number): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const response = await apiService.request<Tournament>(`/tournaments/${tournamentId}/start`, {
        method: 'PATCH',
      });

      if (response.error) {
        console.error('Failed to start tournament:', response.error);
        return { success: false, error: response.error };
      }

      const tournament = response.data!;
      // Update local tournaments list
      const index = this.tournaments.findIndex(t => t.id === tournamentId);
      if (index !== -1) {
        this.tournaments[index] = tournament;
      }
      
      console.log('Tournament started successfully:', tournament.name);
      return { success: true, tournament };

    } catch (error) {
      console.error('Error starting tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start tournament' 
      };
    }
  }

  /**
   * Updates a tournament match
   */
  async updateMatch(tournamentId: number, matchId: number, matchData: UpdateMatchRequest): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const response = await apiService.request<Tournament>(`/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PATCH',
        body: JSON.stringify(matchData),
      });

      if (response.error) {
        console.error('Failed to update match:', response.error);
        return { success: false, error: response.error };
      }

      const tournament = response.data!;
      // Update local tournaments list
      const index = this.tournaments.findIndex(t => t.id === tournamentId);
      if (index !== -1) {
        this.tournaments[index] = tournament;
      }
      
      console.log('Match updated successfully');
      return { success: true, tournament };

    } catch (error) {
      console.error('Error updating match:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update match' 
      };
    }
  }

  /**
   * Cancels a tournament
   */
  async cancelTournament(tournamentId: number): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const response = await apiService.request<Tournament>(`/tournaments/${tournamentId}/cancel`, {
        method: 'DELETE',
      });

      if (response.error) {
        console.error('Failed to cancel tournament:', response.error);
        return { success: false, error: response.error };
      }

      const tournament = response.data!;
      // Update local tournaments list
      const index = this.tournaments.findIndex(t => t.id === tournamentId);
      if (index !== -1) {
        this.tournaments[index] = tournament;
      }
      
      console.log('Tournament cancelled successfully:', tournament.name);
      return { success: true, tournament };

    } catch (error) {
      console.error('Error cancelling tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel tournament' 
      };
    }
  }

  /**
   * Gets local tournaments list
   */
  getLocalTournaments(): Tournament[] {
    return [...this.tournaments];
  }

  /**
   * Gets current tournament
   */
  getCurrentTournament(): Tournament | null {
    return this.currentTournament;
  }

  /**
   * Sets current tournament
   */
  setCurrentTournament(tournament: Tournament | null): void {
    this.currentTournament = tournament;
  }

  /**
   * Clears local data
   */
  clearLocalData(): void {
    this.tournaments = [];
    this.currentTournament = null;
  }

  /**
   * Checks if user is participating in a tournament
   */
  isUserParticipating(tournamentId: number): boolean {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return false;

    const tournament = this.tournaments.find(t => t.id === tournamentId);
    return tournament?.participants.some(p => p.id === currentUser.id) || false;
  }

  /**
   * Gets tournaments where user is participating
   */
  getUserTournaments(): Tournament[] {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    return this.tournaments.filter(t => 
      t.participants.some(p => p.id === currentUser.id)
    );
  }
}

// Export a singleton instance
export const tournamentService = new TournamentService();
export default tournamentService;
