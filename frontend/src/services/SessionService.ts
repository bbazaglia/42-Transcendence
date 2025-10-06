/**
 * Authentication service
 * Manages logged user state and auth operations
 */

import { apiService, User, LoginRequest, RegisterRequest } from './ApiService.js';

export interface SessionState {
  participants: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isAwaitingTotp: boolean;
}

class SessionService {
  private state: SessionState = {
    participants: [],
    isAuthenticated: false,
    isLoading: false,
    isAwaitingTotp: false,
  };

  private tempToken: string | null = null; // To store the temporary 2FA token
  private listeners: Array<(state: SessionState) => void> = [];

  constructor() {
    this.checkSessionStatus();
  }

  // --- Getters for easy access to state ---
  getState = (): SessionState => this.state;
  getParticipants = (): User[] => this.state.participants;
  getParticipantIds(): number[] { return this.state.participants.map(p => p.id); }
  getParticipantById(userId: number): User | undefined { return this.state.participants.find(p => p.id === userId); }
  isAuthenticated = (): boolean => this.state.isAuthenticated;
  isLoading = (): boolean => this.state.isLoading;

  /**
   * Updates internal state
   */
  private setState(newState: Partial<SessionState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Adds a listener for auth state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
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
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Checks the current session status with the backend on app load.
   */
  async checkSessionStatus(): Promise<void> {
    this.setState({ isLoading: true });
    try {
      const response = await apiService.request<{ participants: User[] }>('/session');

      if (response.data && response.data.participants.length > 0) {
        // If we get participants, the user is authenticated.
        this.setState({
          participants: response.data.participants,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // If we get an empty response, there's no active session.
        this.clearSession();
      }
    } catch (error) {
      // If the request fails (e.g., 401 Unauthorized), there's no active session.
      console.log('No active session found on server.');
      this.clearSession();
    }
  }

  /**
   * Registers a new user
   */
  async register(userData: RegisterRequest): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true });

    try {
      const response = await apiService.register(userData);

      if (response.error) {
        this.setState({ isLoading: false });
        return { success: false, error: response.error };
      }

      // After successful registration, automatically login
      return await this.login({
        email: userData.email,
        password: userData.password,
      });
    } catch (error) {
      this.setState({ isLoading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Logs in a user, which joins them to the session.
   */
  async login(credentials: LoginRequest): Promise<{ success: boolean; needsTotp?: boolean; error?: string }> {
    this.setState({ isLoading: true, isAwaitingTotp: false });
    this.tempToken = null; // Clear any previous temp token

    const response = await apiService.login(credentials);

    if (response.error || !response.data) {
      this.setState({ isLoading: false });
      return { success: false, error: response.error || 'Login failed' };
    }

    // Case 1: Login is complete, no 2FA needed.
    if (response.data.participants) {
      this.setState({
        participants: response.data.participants,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    // Case 2: 2FA is required.
    if (response.data.twoFactorChallenge) {
      this.tempToken = response.data.twoFactorChallenge.tempToken;
      this.setState({ isLoading: false, isAwaitingTotp: true });
      return { success: true, needsTotp: true };
    }

    // Fallback for unexpected response structure
    this.setState({ isLoading: false });
    return { success: false, error: 'Unexpected response from server.' };
  }

  /**
   * Submits the TOTP code to complete the login process.
   */
  async submitTotp(code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.tempToken) {
      return { success: false, error: 'No pending 2FA login.' };
    }

    this.setState({ isLoading: true });
    const response = await apiService.verifyTotp(code, this.tempToken);
    this.tempToken = null; // Consume the token

    if (response.error || !response.data) {
      this.setState({ isLoading: false, isAwaitingTotp: false });
      return { success: false, error: response.error || 'TOTP verification failed.' };
    }

    // Login is now complete.
    this.setState({
      participants: response.data.participants,
      isAuthenticated: true,
      isLoading: false,
      isAwaitingTotp: false,
    });

    return { success: true };
  }

  /**
   * Initiates Google OAuth login
   * Redirects to backend which handles the entire OAuth flow
   */
  initiateGoogleLogin(): void {
    // Use the base URL from ApiService for consistency
    const loginUrl = `${apiService.getBaseUrl()}/session/google`;
    window.location.href = loginUrl;
  }

  /**
   * Logs out a user from the session.
   * The component calling this must know which user ID to log out.
   */
  async logout(userId: number): Promise<void> {
    try {
      const response = await apiService.logout(userId);

      // If the response contains a new participant list, update the state.
      if (response.data && response.data.participants) {
        this.setState({ participants: response.data.participants });
      } else {
        // Otherwise (e.g., on a 204 No Content), the session is empty.
        this.clearSession();
      }
    } catch (error) {
      console.error('Server logout failed, clearing session locally as a fallback.', error);
      this.clearSession();
    }
  }

  /**
   * Clears the session state locally.
   */
  private clearSession(): void {
    this.setState({
      participants: [],
      isAuthenticated: false,
      isLoading: false,
    });
  }

  /**
   * Debug method to check current auth state
   */
  debugSessionState(): void {
    console.log('Current auth state:', this.state);
    console.log('Is authenticated:', this.isAuthenticated());
  }
}

// Export a singleton instance
export const sessionService = new SessionService();
export default sessionService;
