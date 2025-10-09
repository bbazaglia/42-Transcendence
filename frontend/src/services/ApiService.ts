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
  isTwoFaEnabled: boolean; // Changed from totpEnabled to isTwoFaEnabled
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  participants?: User[];
  twoFactorChallenge?: {
    tempToken: string;
  };
}

export interface Match {
  id: number;
  playerOneId: number;
  playerTwoId: number;
  playerOneScore: number;
  playerTwoScore: number;
  winnerId: number | null;
  playedAt: string;
  playerOne?: {
    id: number;
    displayName: string;
    avatarUrl: string;
  };
  playerTwo?: {
    id: number;
    displayName: string;
    avatarUrl: string;
  };
  winner?: {
    id: number;
    displayName: string;
    avatarUrl: string;
  };
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
    // In both development and production, we use a relative path.
    // In dev, Vite's proxy handles it.
    // In prod, Nginx handles it.
    this.baseUrl = '/api';
  }

  /**
   * Gets the base URL for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
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
      console.log('ApiService: Making request to:', url, 'with options:', options);

      const defaultOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for cookies
      };

      const finalOptions = { ...defaultOptions, ...options };
      console.log('ApiService: Final request options:', finalOptions);

      const response = await fetch(url, finalOptions);
      console.log('ApiService: Received response:', response.status, response.statusText);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;

        // Don't show notification for 401 error (not authenticated) - this is normal
        if (response.status !== 401) {
          console.error('API error:', errorMessage);
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
      console.error('Connection error:', errorMessage);

      return {
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Authentication - User registration
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Authentication - User login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/session/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Verifies the TOTP code during the second step of login.
   */
  async verifyTotp(code: string, tempToken: string): Promise<ApiResponse<{ participants: User[] }>> {
    return this.request<{ participants: User[] }>('/session/login/totp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tempToken}`,
      },
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Gets public profile of a user
   */
  async getUserProfile(userId: number): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(`/users/${userId}`);
  }

  /**
   * Backend health check
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  /**
   * Checks if the session is authenticated
   * (makes a request that requires authentication)
   */
  async checkAuth(): Promise<boolean> {
    const response = await this.request('/session');
    return response.status === 200;
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
  async getUserMatchHistory(userId: number): Promise<ApiResponse<{ matches: Match[] }>> {
    return this.request<{ matches: Match[] }>(`/users/${userId}/history`);
  }

  /**
   * Updates user profile information
   */
  async updateUserProfile(userId: number, profileData: { displayName?: string; avatarUrl?: string }): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Searches for users by display name
   */
  async searchUsers(query: string): Promise<ApiResponse<{ users: User[] }>> {
    return this.request<{ users: User[] }>(`/users/search?search=${encodeURIComponent(query)}`);
  }

  /**
   * Logs out the user
   */
  async logout(userId: number): Promise<ApiResponse<{ participants: User[] }>> {
    return this.request<{ participants: User[] }>('/session/logout', {
      method: 'POST',
      body: JSON.stringify({ actorId: userId }),
    });
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;
