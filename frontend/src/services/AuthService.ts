/**
 * Authentication service
 * Manages logged user state and auth operations
 */

import { apiService, User, LoginRequest, RegisterRequest } from './ApiService.js';
import { notificationService } from './NotificationService.js';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    // Does not check authentication automatically on initialization
    // Verification only happens when user tries to login
  }

  /**
   * Adds a listener for auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
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
   * Updates internal state
   */
  private setState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Returns current state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Checks if the user is authenticated
   * Public method to be called when needed
   */
  async checkAuthStatus(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      // Checks if there is a valid token by making an authenticated request
      const isAuth = await apiService.checkAuth();
      
      if (isAuth) {
        // If authenticated, you can fetch current user data
        // For now, we will simulate that user is logged in
        this.setState({
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
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
   * Logs in the user
   */
  async login(credentials: LoginRequest): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true });

    try {
      const response = await apiService.login(credentials);

      if (response.error) {
        this.setState({ isLoading: false });
        return { success: false, error: response.error };
      }

      // Successful login
      this.setState({
        user: response.data!,
        isAuthenticated: true,
        isLoading: false,
      });

      notificationService.success('Login realizado!', `Bem-vindo, ${response.data!.displayName}!`);
      return { success: true };
    } catch (error) {
      this.setState({ isLoading: false });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  /**
   * Logs out the user
   */
  async logout(): Promise<void> {
    const userName = this.state.user?.displayName;
    
    // Clears the cookie by making a logout request (if endpoint exists)
    // For now, just clears local state
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    notificationService.info('Logout realizado', userName ? `Até logo, ${userName}!` : 'Logout realizado com sucesso!');

    // Optional: make request to clear cookie on server
    // await apiService.logout();
  }

  /**
   * Returns the current user
   */
  getCurrentUser(): User | null {
    return this.state.user;
  }

  /**
   * Checks if authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Checks if loading
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;
