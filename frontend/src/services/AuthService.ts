/**
 * Authentication service
 * Manages logged user state and auth operations
 */

import { apiService, User, LoginRequest, RegisterRequest } from './ApiService.js';

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
    // Restore authentication state from localStorage on initialization
    this.restoreAuthState();
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
    this.persistAuthState();
    this.notifyListeners();
  }

  /**
   * Persists authentication state to localStorage
   */
  private persistAuthState(): void {
    try {
      console.log('Persisting auth state to localStorage:', this.state);
      localStorage.setItem('authState', JSON.stringify(this.state));
    } catch (error) {
      console.error('Error persisting auth state:', error);
    }
  }

  /**
   * Restores authentication state from localStorage
   */
  private restoreAuthState(): void {
    try {
      const savedState = localStorage.getItem('authState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log('Restoring auth state from localStorage:', parsedState);
        this.state = { ...this.state, ...parsedState };
        this.notifyListeners();
      } else {
        console.log('No saved auth state found in localStorage');
      }
    } catch (error) {
      console.error('Error restoring auth state:', error);
      // Clear corrupted data
      localStorage.removeItem('authState');
    }
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
        // If authenticated, keep the current user data
        this.setState({
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Only clear auth state if we were previously authenticated
        // This prevents clearing the state when just checking on app load
        if (this.state.isAuthenticated) {
          this.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } else {
          this.setState({
            isLoading: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Only clear auth state if we were previously authenticated
      if (this.state.isAuthenticated) {
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        this.setState({
          isLoading: false,
        });
      }
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

      console.log(`Login realizado! Bem-vindo, ${response.data!.displayName}!`);
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
    
    try {
      // Make request to clear cookie on server
      await apiService.logout();
    } catch (error) {
      console.error('Error during logout request:', error);
      // Continue with local logout even if server request fails
    }

    // Clear local state
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Clear localStorage
    localStorage.removeItem('authState');

    console.log(userName ? `Logout realizado. Até logo, ${userName}!` : 'Logout realizado com sucesso!');
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

  /**
   * Updates user stats after a match
   */
  updateUserStats(wins: number, losses: number): void {
    if (this.state.user) {
      this.setState({
        user: {
          ...this.state.user,
          wins: this.state.user.wins + wins,
          losses: this.state.user.losses + losses,
        }
      });
    }
  }

  /**
   * Updates user profile information
   */
  updateUserProfile(userData: any): void {
    if (this.state.user) {
      this.setState({
        user: {
          ...this.state.user,
          ...userData,
        }
      });
    }
  }

  /**
   * Debug method to check current auth state
   */
  debugAuthState(): void {
    console.log('Current auth state:', this.state);
    console.log('localStorage authState:', localStorage.getItem('authState'));
    console.log('Is authenticated:', this.isAuthenticated());
    console.log('Current user:', this.getCurrentUser());
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;
