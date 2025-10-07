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
   */
  async setupTotp(userId: number): Promise<{ data?: TotpSetupResponse; error?: string }> {
    const response = await apiService.request<TotpSetupResponse>(`/users/${userId}/totp/setup`, {
      method: 'POST',
    });

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
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