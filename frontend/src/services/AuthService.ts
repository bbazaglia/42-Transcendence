/**
 * Serviço de autenticação
 * Gerencia estado do usuário logado e operações de auth
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
    // Verifica se há um usuário logado ao inicializar
    this.checkAuthStatus();
  }

  /**
   * Adiciona um listener para mudanças no estado de auth
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Retorna função para remover o listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifica todos os listeners sobre mudanças no estado
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Atualiza o estado interno
   */
  private setState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Retorna o estado atual
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Verifica se o usuário está autenticado
   */
  private async checkAuthStatus(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      // Verifica se há um token válido fazendo uma requisição autenticada
      const isAuth = await apiService.checkAuth();
      
      if (isAuth) {
        // Se autenticado, você pode buscar dados do usuário atual
        // Por enquanto, vamos simular que está logado
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
   * Registra um novo usuário
   */
  async register(userData: RegisterRequest): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true });

    try {
      const response = await apiService.register(userData);

      if (response.error) {
        this.setState({ isLoading: false });
        return { success: false, error: response.error };
      }

      // Após registro bem-sucedido, fazer login automaticamente
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
   * Faz login do usuário
   */
  async login(credentials: LoginRequest): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true });

    try {
      const response = await apiService.login(credentials);

      if (response.error) {
        this.setState({ isLoading: false });
        return { success: false, error: response.error };
      }

      // Login bem-sucedido
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
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    const userName = this.state.user?.displayName;
    
    // Limpa o cookie fazendo uma requisição para logout (se existir endpoint)
    // Por enquanto, apenas limpa o estado local
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    notificationService.info('Logout realizado', userName ? `Até logo, ${userName}!` : 'Logout realizado com sucesso!');

    // Opcional: fazer requisição para limpar cookie no servidor
    // await apiService.logout();
  }

  /**
   * Retorna o usuário atual
   */
  getCurrentUser(): User | null {
    return this.state.user;
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Verifica se está carregando
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }
}

// Exporta uma instância singleton
export const authService = new AuthService();
export default authService;
