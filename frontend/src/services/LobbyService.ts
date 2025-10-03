/**
 * Lobby Service
 * Manages lobby operations and state
 */

import { apiService, User } from './ApiService.js';
import { authService } from './AuthService.js';

export interface LobbyState {
  host: User;
  participants: User[];
}

export interface JoinLobbyRequest {
  email: string;
  password: string;
}

export interface LeaveLobbyRequest {
  userId: number;
}

export interface UpdateParticipantRequest {
  displayName?: string;
  avatarUrl?: string;
}

class LobbyService {
  private lobbyState: LobbyState | null = null;
  private listeners: Array<(state: LobbyState | null) => void> = [];

  /**
   * Adds a listener for lobby state changes
   */
  subscribe(listener: (state: LobbyState | null) => void): () => void {
    this.listeners.push(listener);
    
    // Returns function to remove the listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifies all listeners about state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.lobbyState));
  }

  /**
   * Creates a new lobby
   */
  async createLobby(): Promise<{ success: boolean; lobby?: LobbyState; error?: string }> {
    try {
      const response = await apiService.request<LobbyState>('/lobby/create', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      if (response.error) {
        console.error('Failed to create lobby:', response.error);
        return { success: false, error: response.error };
      }

      this.lobbyState = response.data!;
      this.notifyListeners();
      
      console.log('Lobby created successfully');
      return { success: true, lobby: this.lobbyState };

    } catch (error) {
      console.error('Error creating lobby:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create lobby' 
      };
    }
  }

  /**
   * Joins an existing lobby
   */
  async joinLobby(credentials: JoinLobbyRequest): Promise<{ success: boolean; lobby?: LobbyState; error?: string }> {
    try {
      const response = await apiService.request<LobbyState>('/lobby/join', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.error) {
        console.error('Failed to join lobby:', response.error);
        return { success: false, error: response.error };
      }

      this.lobbyState = response.data!;
      this.notifyListeners();
      
      console.log('Successfully joined lobby');
      return { success: true, lobby: this.lobbyState };

    } catch (error) {
      console.error('Error joining lobby:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join lobby' 
      };
    }
  }

  /**
   * Leaves the current lobby
   */
  async leaveLobby(): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await apiService.request<LobbyState>('/lobby/leave', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (response.error) {
        console.error('Failed to leave lobby:', response.error);
        return { success: false, error: response.error };
      }

      this.lobbyState = response.data!;
      this.notifyListeners();
      
      console.log('Successfully left lobby');
      return { success: true };

    } catch (error) {
      console.error('Error leaving lobby:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to leave lobby' 
      };
    }
  }

  /**
   * Deletes the current lobby (host only)
   */
  async deleteLobby(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiService.request('/lobby', {
        method: 'DELETE',
      });

      if (response.error) {
        console.error('Failed to delete lobby:', response.error);
        return { success: false, error: response.error };
      }

      this.lobbyState = null;
      this.notifyListeners();
      
      console.log('Lobby deleted successfully');
      return { success: true };

    } catch (error) {
      console.error('Error deleting lobby:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete lobby' 
      };
    }
  }

  /**
   * Updates a participant's profile
   */
  async updateParticipant(participantId: number, updateData: UpdateParticipantRequest): Promise<{ success: boolean; lobby?: LobbyState; error?: string }> {
    try {
      const response = await apiService.request<LobbyState>(`/lobby/participants/${participantId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      if (response.error) {
        console.error('Failed to update participant:', response.error);
        return { success: false, error: response.error };
      }

      this.lobbyState = response.data!;
      this.notifyListeners();
      
      console.log('Participant updated successfully');
      return { success: true, lobby: this.lobbyState };

    } catch (error) {
      console.error('Error updating participant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update participant' 
      };
    }
  }

  /**
   * Gets current lobby state
   */
  getLobbyState(): LobbyState | null {
    return this.lobbyState;
  }

  /**
   * Checks if user is in a lobby
   */
  isInLobby(): boolean {
    return this.lobbyState !== null;
  }

  /**
   * Checks if user is the host
   */
  isHost(): boolean {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.id || !this.lobbyState) return false;
    
    return this.lobbyState.host.id === currentUser.id;
  }

  /**
   * Gets all participants
   */
  getParticipants(): User[] {
    return this.lobbyState?.participants || [];
  }

  /**
   * Gets the host
   */
  getHost(): User | null {
    return this.lobbyState?.host || null;
  }

  /**
   * Gets participant by ID
   */
  getParticipant(participantId: number): User | null {
    return this.lobbyState?.participants.find(p => p.id === participantId) || null;
  }

  /**
   * Checks if a user is a participant
   */
  isParticipant(userId: number): boolean {
    return this.lobbyState?.participants.some(p => p.id === userId) || false;
  }

  /**
   * Gets participant count
   */
  getParticipantCount(): number {
    return this.lobbyState?.participants.length || 0;
  }

  /**
   * Clears lobby state
   */
  clearLobby(): void {
    this.lobbyState = null;
    this.notifyListeners();
  }

  /**
   * Updates lobby state (for external updates)
   */
  updateLobbyState(newState: LobbyState | null): void {
    this.lobbyState = newState;
    this.notifyListeners();
  }
}

// Export a singleton instance
export const lobbyService = new LobbyService();
export default lobbyService;
