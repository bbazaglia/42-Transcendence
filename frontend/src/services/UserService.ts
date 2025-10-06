/**
 * User Service
 * Manages operations related to user data, such as profiles and stats.
 */

import { apiService, User } from './ApiService.js';
import { sessionService } from './SessionService.js';

class UserService {

  /**
   * Fetches the public profile of any user by their ID.
   */
  async getUserProfile(userId: number): Promise<{ user?: User; error?: string }> {
    const response = await apiService.getUserProfile(userId);
    return { user: response.data?.user, error: response.error };
  }

  /**
   * Updates a user's profile information (e.g., displayName, avatarUrl).
   * After a successful update, it triggers the SessionService to refetch the participants
   * to ensure the UI is updated everywhere.
   */
  async updateUserProfile(userId: number, profileData: { displayName?: string; avatarUrl?: string }): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.updateUserProfile(userId, profileData);
    if (response.error) {
      return { success: false, error: response.error };
    }

    // On success, tell the session service to refresh its state
    // to reflect the updated user data in the participants list.
    await sessionService.checkSessionStatus();
    return { success: true };
  }

  /**
   * Searches for users by their display name.
   */
  async searchUsers(query: string): Promise<{ users?: User[]; error?: string }> {
    const response = await apiService.searchUsers(query);
    return { users: response.data?.users, error: response.error };
  }
}

export const userService = new UserService();
export default userService;