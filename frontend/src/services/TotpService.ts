/**
 * TOTP Service
 * Handles Two-Factor Authentication operations
 * Matches the existing backend routes in users.js
 */

import { apiService, User } from './ApiService.js';

export interface TotpSetupResponse {
  qrCodeUrl: string;
}

class TotpService {
  /**
   * Initiates TOTP setup for a user
   * Calls POST /users/:userId/totp/setup
   * Uses direct fetch to avoid Content-Type header issue
   */
  async setupTotp(userId: number): Promise<{ data?: TotpSetupResponse; error?: string }> {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/users/${userId}/totp/setup`, {
        method: 'POST',
        credentials: 'include',
        // No Content-Type header, no body
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data?.message || 'Failed to setup TOTP' };
      }

      return { data: data };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Verifies TOTP token and enables 2FA
   * Calls POST /users/:userId/totp/verify
   */
  async verifyAndEnable(userId: number, token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiService.request<{ user: User }>(`/users/${userId}/totp/verify`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true, user: response.data?.user };
  }

  /**
   * Disables TOTP for a user
   * Calls POST /users/:userId/totp/disable
   * Requires password for verification
   */
  async disableTotp(userId: number, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiService.request<{ user: User }>(`/users/${userId}/totp/disable`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true, user: response.data?.user };
  }
}

export const totpService = new TotpService();
export default totpService;