/**
 * Authentication Modal (Login/Register)
 * Reusable component for authentication
 */

import { authService } from '../services/AuthService.js';

export class AuthModal {
  private modalElement: HTMLElement | null = null;
  private isLoginMode: boolean = true;

  constructor() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * Renders the authentication modal
   */
  private render(): void {
    const modalHTML = `
      <div id="auth-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
            
            <!-- Header -->
            <div class="text-center mb-8">
              <h2 id="auth-title" class="text-3xl font-black mb-2 text-cyan-400 orbitron-font">
                Login
              </h2>
            </div>

            <!-- Error/Success Messages -->
            <div id="auth-message" class="hidden mb-6 p-4 rounded-lg"></div>

            <!-- Form -->
            <form id="auth-form" class="space-y-6">
              <div id="display-name-field" class="hidden">
                <label class="block text-white font-semibold mb-2">Nome de Usuário:</label>
                <input type="text" id="displayName" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="Seu nome de usuário" required>
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Email:</label>
                <input type="email" id="email" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="seu@email.com" required>
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Senha:</label>
                <input type="password" id="password" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="Sua senha" required>
              </div>

              <button type="submit" id="auth-submit-btn"
                      class="w-full py-4 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-lg hover:bg-cyan-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <span id="submit-text">Entrar</span>
                <span id="loading-spinner" class="hidden">⏳ Carregando...</span>
              </button>
            </form>

            <!-- Toggle Mode -->
            <div class="text-center mt-6">
              <p class="text-gray-300 text-sm">
                <span id="toggle-text">Não tem uma conta?</span>
                <button id="toggle-mode-btn" class="text-cyan-400 hover:text-cyan-300 font-semibold ml-1">
                  Criar conta
                </button>
              </p>
            </div>

            <!-- Close Button -->
            <button id="close-auth-modal" class="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add the modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modalElement = document.getElementById('auth-modal');
  }

  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Toggle between login and register
    document.getElementById('toggle-mode-btn')?.addEventListener('click', () => {
      this.toggleMode();
    });

    // Close modal
    document.getElementById('close-auth-modal')?.addEventListener('click', () => {
      this.hide();
    });

    // Close when clicking outside the modal
    this.modalElement?.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hide();
      }
    });

    // Form submit
    document.getElementById('auth-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Listen to auth state changes
    authService.subscribe((state) => {
      if (state.isAuthenticated) {
        this.hide();
        this.showMessage('Login realizado com sucesso!', 'success');
      }
    });
  }

  /**
   * Toggles between login and register mode
   */
  private toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.updateUI();
  }

  /**
   * Updates the interface based on the current mode
   */
  private updateUI(): void {
    const title = document.getElementById('auth-title');
    const submitText = document.getElementById('submit-text');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtn = document.getElementById('toggle-mode-btn');
    const displayNameField = document.getElementById('display-name-field');
    const displayNameInput = document.getElementById('displayName') as HTMLInputElement;

    if (this.isLoginMode) {
      title!.textContent = 'Login';
      submitText!.textContent = 'Entrar';
      toggleText!.textContent = 'Usuário novo?';
      toggleBtn!.textContent = 'Crie uma conta';
      displayNameField!.classList.add('hidden');
      displayNameInput!.required = false;
    } else {
      title!.textContent = 'Criar Conta';
      submitText!.textContent = 'Criar Conta';
      toggleText!.textContent = 'Já tem uma conta?';
      toggleBtn!.textContent = 'Faça login';
      displayNameField!.classList.remove('hidden');
      displayNameInput!.required = true;
    }

    // Clear messages and fields
    this.hideMessage();
    this.clearForm();
  }

  /**
   * Handles form submission
   */
  private async handleSubmit(): Promise<void> {
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const displayName = (document.getElementById('displayName') as HTMLInputElement).value;

    this.setLoading(true);

    try {
      let result;

      if (this.isLoginMode) {
        result = await authService.login({ email, password });
      } else {
        if (!displayName.trim()) {
          this.showMessage('Nome de usuário é obrigatório', 'error');
          this.setLoading(false);
          return;
        }
        result = await authService.register({ displayName, email, password });
      }

      if (result.success) {
        this.showMessage(
          this.isLoginMode ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!',
          'success'
        );
        // The modal will be closed automatically by the authService listener
      } else {
        this.showMessage(result.error || 'Erro na autenticação', 'error');
      }
    } catch (error) {
      this.showMessage('Erro inesperado. Tente novamente.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sets the loading state
   */
  private setLoading(loading: boolean): void {
    const submitBtn = document.getElementById('auth-submit-btn') as HTMLButtonElement;
    const submitText = document.getElementById('submit-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    submitBtn.disabled = loading;
    
    if (loading) {
      submitText!.classList.add('hidden');
      loadingSpinner!.classList.remove('hidden');
    } else {
      submitText!.classList.remove('hidden');
      loadingSpinner!.classList.add('hidden');
    }
  }

  /**
   * Shows a message in the modal
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageElement = document.getElementById('auth-message');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `mb-6 p-4 rounded-lg ${
      type === 'success' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`;
    messageElement.classList.remove('hidden');

    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        this.hideMessage();
      }, 3000);
    }
  }

  /**
   * Hides the message
   */
  private hideMessage(): void {
    const messageElement = document.getElementById('auth-message');
    if (messageElement) {
      messageElement.classList.add('hidden');
    }
  }

  /**
   * Clears the form
   */
  private clearForm(): void {
    (document.getElementById('email') as HTMLInputElement).value = '';
    (document.getElementById('password') as HTMLInputElement).value = '';
    (document.getElementById('displayName') as HTMLInputElement).value = '';
  }

  /**
   * Shows the modal
   */
  show(mode: 'login' | 'register' = 'login'): void {
    this.isLoginMode = mode === 'login';
    this.updateUI();
    this.modalElement?.classList.remove('hidden');
    this.clearForm();
    this.hideMessage();
  }

  /**
   * Hides the modal
   */
  hide(): void {
    this.modalElement?.classList.add('hidden');
    this.clearForm();
    this.hideMessage();
  }

  /**
   * Removes the modal from the DOM
   */
  destroy(): void {
    this.modalElement?.remove();
    this.modalElement = null;
  }
}
