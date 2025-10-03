/**
 * Friends Service
 * Manages friend requests and friendships
 */

import { apiService } from './ApiService.js';
import { authService } from './AuthService.js';

export interface Friend {
  id: number;
  displayName: string;
  email: string;
  wins: number;
  losses: number;
  isOnline: boolean;
  avatarUrl: string;
}

export interface FriendRequest {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string;
  isOnline: boolean;
}

class FriendsService {
  private friends: Friend[] = [];
  private pendingRequests: FriendRequest[] = [];

  /**
   * Gets the current user's friends
   */
  async getFriends(): Promise<Friend[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        console.warn('No authenticated user found, cannot fetch friends');
        return [];
      }

      const response = await apiService.request<{ friendships: Friend[] }>(`/friends/${currentUser.id}`);
      
      if (response.error) {
        console.error('Failed to fetch friends:', response.error);
        console.error('Falha ao carregar lista de amigos');
        return [];
      }

      this.friends = response.data?.friendships || [];
      return this.friends;

    } catch (error) {
      console.error('Error fetching friends:', error);
      console.error('Falha ao carregar lista de amigos');
      return [];
    }
  }

  /**
   * Gets pending friend requests
   */
  async getPendingRequests(): Promise<FriendRequest[]> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        console.warn('No authenticated user found, cannot fetch pending requests');
        return [];
      }

      const response = await apiService.request<{ friendships: FriendRequest[] }>(`/friends/pending/incoming/${currentUser.id}`);
      
      if (response.error) {
        console.error('Failed to fetch pending requests:', response.error);
        return [];
      }

      this.pendingRequests = response.data?.friendships || [];
      return this.pendingRequests;

    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  /**
   * Sends a friend request
   */
  async sendFriendRequest(friendId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await apiService.request('/friends', {
        method: 'POST',
        body: JSON.stringify({
          actorId: currentUser.id,
          friendId: friendId
        })
      });

      if (response.error) {
        console.error('Failed to send friend request:', response.error);
        return { success: false, error: response.error };
      }

      console.log('Solicitação de amizade enviada com sucesso!');
      return { success: true };

    } catch (error) {
      console.error('Error sending friend request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send friend request' 
      };
    }
  }

  /**
   * Accepts a friend request
   */
  async acceptFriendRequest(senderId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await apiService.request('/friends/accept', {
        method: 'PATCH',
        body: JSON.stringify({
          actorId: currentUser.id,
          senderId: senderId
        })
      });

      if (response.error) {
        console.error('Failed to accept friend request:', response.error);
        return { success: false, error: response.error };
      }

      // Update local friends list
      await this.getFriends();

      console.log('Solicitação de amizade aceita!');
      return { success: true };

    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept friend request' 
      };
    }
  }

  /**
   * Removes a friend
   */
  async removeFriend(friendId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await apiService.request('/friends', {
        method: 'DELETE',
        body: JSON.stringify({
          actorId: currentUser.id,
          friendIdToRemove: friendId
        })
      });

      if (response.error) {
        console.error('Failed to remove friend:', response.error);
        return { success: false, error: response.error };
      }

      // Update local friends list
      await this.getFriends();

      console.log('Amigo removido da sua lista!');
      return { success: true };

    } catch (error) {
      console.error('Error removing friend:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove friend' 
      };
    }
  }

  /**
   * Gets local friends list
   */
  getLocalFriends(): Friend[] {
    return [...this.friends];
  }

  /**
   * Gets local pending requests
   */
  getLocalPendingRequests(): FriendRequest[] {
    return [...this.pendingRequests];
  }

  /**
   * Clears local data
   */
  clearLocalData(): void {
    this.friends = [];
    this.pendingRequests = [];
  }
}

// Export a singleton instance
export const friendsService = new FriendsService();
export default friendsService;
