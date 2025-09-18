/**
 * Service for backend API communication
 * Centralizes all HTTP calls and error handling
 */


export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface User {
  id: number;
  displayName: string;
  email: string;
  wins: number;
  losses: number;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface Match {
  id: number;
  playerOneId: number;
  playerTwoId: number;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: number | null;
  playedAt: string;
}

export interface CreateMatchRequest {
  playerOneId: number;
  playerTwoId: number;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // In development, uses Vite proxy
    // In production, uses backend URL
    this.baseUrl = (import.meta as any).env?.DEV ? '/api' : 'http://localhost:3000/api';
  }

  /**
   * Makes a generic HTTP request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for cookies
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Don't show notification for 401 error (not authenticated) - this is normal
        if (response.status !== 401) {
          console.error('Erro na API:', errorMessage);
        }
        
        return {
          error: errorMessage,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      // Show network error notification
      console.error('Erro de Conexão:', errorMessage);
      
      return {
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Authentication - User registration
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Authentication - User login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Gets public profile of a user
   */
  async getUserProfile(userId: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${userId}`);
  }

  /**
   * Backend health check
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  /**
   * Checks if the user is authenticated
   * (makes a request that requires authentication)
   */
  async checkAuth(): Promise<boolean> {
    try {
      // Tries to get the health endpoint which requires authentication
      // If it fails, it means the user is not authenticated
      const response = await this.request('/health');
      return response.status === 200;
    } catch (error) {
      // If it's a 401 error (not authenticated), it's not a real error
      // Just returns false silently
      return false;
    }
  }

  /**
   * Creates a new match record
   */
  async createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<Match>> {
    return this.request<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  }

  /**
   * Gets match history of a user
   */
  async getUserMatchHistory(userId: number): Promise<ApiResponse<Match[]>> {
    return this.request<Match[]>(`/users/${userId}/history`);
  }

  /**
   * Updates user profile information
   */
  async updateUserProfile(userId: number, profileData: { displayName?: string; avatarUrl?: string }): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Searches for users by display name
   */
  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Logs out the user
   */
  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;
