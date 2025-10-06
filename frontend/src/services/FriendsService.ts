/**
 * Friends Service
 * Manages friend requests and friendships
 */

import { apiService } from './ApiService.js';
import { sessionService } from './SessionService.js';

//TODO: remove all currentUser related code as it is obsolete
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
  async getFriends(userId?: number): Promise<Friend[]> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser || !currentUser.id) {
          console.warn('No authenticated user found, cannot fetch friends');
          return [];
        }
        targetUserId = currentUser.id;
      }

      const response = await apiService.request<{ friendships: Friend[] }>(`/friends/${targetUserId}`);
      
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
   * Gets pending friend requests (incoming)
   */
  async getPendingRequests(userId?: number): Promise<FriendRequest[]> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser || !currentUser.id) {
          console.warn('No authenticated user found, cannot fetch pending requests');
          return [];
        }
        targetUserId = currentUser.id;
      }

      const response = await apiService.request<{ friendships: FriendRequest[] }>(`/friends/pending/incoming/${targetUserId}`);
      
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
   * Gets sent friend requests (pending sent)
   */
  async getSentRequests(userId?: number): Promise<FriendRequest[]> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser || !currentUser.id) {
          console.warn('No authenticated user found, cannot fetch sent requests');
          return [];
        }
        targetUserId = currentUser.id;
      }

      const response = await apiService.request<{ friendships: FriendRequest[] }>(`/friends/pending/sent/${targetUserId}`);
      
      if (response.error) {
        console.error('Failed to fetch sent requests:', response.error);
        return [];
      }

      return response.data?.friendships || [];

    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return [];
    }
  }

  /**
   * Sends a friend request
   */
  async sendFriendRequest(friendId: number, senderId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      let targetSenderId = senderId;
      
      if (!targetSenderId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser) {
          return { success: false, error: 'User not authenticated' };
        }
        targetSenderId = currentUser.id;
      }

      const response = await apiService.request('/friends', {
        method: 'POST',
        body: JSON.stringify({
          actorId: targetSenderId,
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
  async acceptFriendRequest(friendshipId: number, acceptorId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      let targetAcceptorId = acceptorId;
      
      if (!targetAcceptorId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser) {
          return { success: false, error: 'User not authenticated' };
        }
        targetAcceptorId = currentUser.id;
      }

      const response = await apiService.request(`/friends/${friendshipId}/accept`, {
        method: 'PATCH',
        body: JSON.stringify({
          actorId: targetAcceptorId
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
   * Rejects a friend request
   */
  async rejectFriendRequest(friendshipId: number, rejectorId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      let targetRejectorId = rejectorId;
      
      if (!targetRejectorId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser) {
          return { success: false, error: 'User not authenticated' };
        }
        targetRejectorId = currentUser.id;
      }

      const response = await apiService.request(`/friends/${friendshipId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          actorId: targetRejectorId
        })
      });

      if (response.error) {
        console.error('Failed to reject friend request:', response.error);
        return { success: false, error: response.error };
      }

      console.log('Friend request rejected successfully');
      return { success: true };

    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject friend request' 
      };
    }
  }

  /**
   * Cancels a sent friend request
   */
  async cancelFriendRequest(friendshipId: number, senderId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      let targetSenderId = senderId;
      
      if (!targetSenderId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser) {
          return { success: false, error: 'User not authenticated' };
        }
        targetSenderId = currentUser.id;
      }

      const response = await apiService.request(`/friends/${friendshipId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          actorId: targetSenderId
        })
      });

      if (response.error) {
        console.error('Failed to cancel friend request:', response.error);
        return { success: false, error: response.error };
      }

      console.log('Friend request canceled successfully');
      return { success: true };

    } catch (error) {
      console.error('Error canceling friend request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel friend request' 
      };
    }
  }

  /**
   * Removes a friend
   */
  async removeFriend(friendshipId: number, removerId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      let targetRemoverId = removerId;
      
      if (!targetRemoverId) {
        // Get the current user based on the current URL
        const participants = sessionService.getParticipants();
        const currentUser = participants.find(p => window.location.pathname === `/profile/${p.id}` || window.location.pathname === '/profile');
        if (!currentUser) {
          return { success: false, error: 'User not authenticated' };
        }
        targetRemoverId = currentUser.id;
      }

      const response = await apiService.request(`/friends/${friendshipId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          actorId: targetRemoverId
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
