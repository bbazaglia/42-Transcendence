/**
 * Serviço para comunicação com a API do backend
 * Centraliza todas as chamadas HTTP e tratamento de erros
 */

import { notificationService } from './NotificationService.js';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface User {
  id: number;
  displayName: string;
  email: string;
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
  playedAt: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // Em desenvolvimento, usa o proxy do Vite
    // Em produção, usa a URL do backend
    this.baseUrl = (import.meta as any).env?.DEV ? '/api' : 'http://localhost:3000/api';
  }

  /**
   * Faz uma requisição HTTP genérica
   */
  private async request<T>(
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
        credentials: 'include', // Importante para cookies
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Mostra notificação de erro para o usuário
        notificationService.error('Erro na API', errorMessage);
        
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
      
      // Mostra notificação de erro de rede
      notificationService.error('Erro de Conexão', errorMessage);
      
      return {
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Autenticação - Registro de usuário
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Autenticação - Login de usuário
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Busca perfil público de um usuário
   */
  async getUserProfile(userId: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${userId}`);
  }

  /**
   * Busca histórico de partidas de um usuário
   */
  async getUserMatchHistory(userId: number): Promise<ApiResponse<Match[]>> {
    return this.request<Match[]>(`/users/${userId}/history`);
  }

  /**
   * Health check do backend
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  /**
   * Verifica se o usuário está autenticado
   * (faz uma requisição que requer autenticação)
   */
  async checkAuth(): Promise<boolean> {
    try {
      // Tenta buscar o perfil do usuário atual
      // Se falhar, significa que não está autenticado
      const response = await this.request('/users/1'); // ID temporário
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Exporta uma instância singleton
export const apiService = new ApiService();
export default apiService;
