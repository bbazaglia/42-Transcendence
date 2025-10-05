/**
 * Authentication Modal (Login/Register)
 * Reusable component for authentication
 */

import { sessionService } from '../services/SessionService.js';

export class AuthModal {
  private modalElement: HTMLElement | null = null;
  private isLoginMode: boolean = true;
  private isAwaitingTotp: boolean = false;

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
                <label class="block text-white font-semibold mb-2">User Name:</label>
                <input type="text" id="displayName" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="Your user name" required>
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Email:</label>
                <input type="email" id="email" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="your@email.com" required>
              </div>

              <div>
                <label class="block text-white font-semibold mb-2">Password:</label>
                <input type="password" id="password" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="Your password" required>
              </div>

              <div id="totp-field" class="hidden">
                <label class="block text-white font-semibold mb-2">2FA Code:</label>
                <input type="text" id="totp-code" 
                       class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors"
                       placeholder="6-digit code" required>
              </div>

              <button type="submit" id="auth-submit-btn"
                      class="w-full py-4 bg-cyan-600/20 text-white border border-cyan-500/30 font-bold rounded-lg hover:bg-cyan-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <span id="submit-text">Entrar</span>
                <span id="loading-spinner" class="hidden">⏳ Carregando...</span>
              </button>
            </form>

            <!-- OR Divider-->
            <div id="google-auth-section">
              <div class="flex items-center my-6">
                <div class="flex-grow border-t border-white/20"></div>
                <span class="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                <div class="flex-grow border-t border-white/20"></div>
              </div>

              <!-- Google Sign-In -->
              <div class="text-center">
                <p id="google-auth-text" class="text-gray-300 text-sm mb-4">Sign in with Google</p>
                <button id="google-signin-btn"
                        class="w-full flex items-center justify-center py-3 bg-white/10 text-white border border-white/20 font-bold rounded-lg hover:bg-white/20 transition-colors">
                  <svg class="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.49,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                  Google
                </button>
              </div>
            </div>

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

    // Google Sign-In
    document.getElementById('google-signin-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleGoogleAuthentication();
    });

    // Listen to auth state changes
    sessionService.subscribe((state) => {
      if (state.isAuthenticated) {
        this.hide();
        this.showMessage('Logged in successfully!', 'success');
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
    const googleAuthText = document.getElementById('google-auth-text');

    const emailField = (document.getElementById('email') as HTMLInputElement).parentElement;
    const passwordField = (document.getElementById('password') as HTMLInputElement).parentElement;
    const totpField = document.getElementById('totp-field');
    const totpCodeInput = document.getElementById('totp-code') as HTMLInputElement;
    const toggleSection = document.querySelector('.text-center.mt-6');
    const googleSection = document.getElementById('google-auth-section');

    // Reset all fields first
    displayNameField!.classList.add('hidden');
    emailField!.classList.remove('hidden');
    passwordField!.classList.remove('hidden');
    totpField!.classList.add('hidden');
    toggleSection!.classList.remove('hidden');
    googleSection!.classList.remove('hidden');
    displayNameInput!.required = false;
    totpCodeInput!.required = false;

    if (this.isAwaitingTotp) {
      title!.textContent = 'Enter 2FA Code';
      submitText!.textContent = 'Verify Code';
      emailField!.classList.add('hidden');
      passwordField!.classList.add('hidden');
      totpField!.classList.remove('hidden');
      totpCodeInput!.required = true;
      toggleSection!.classList.add('hidden');
      googleSection!.classList.add('hidden');
    } else if (this.isLoginMode) {
      title!.textContent = 'Login';
      submitText!.textContent = 'Sign In';
      toggleText!.textContent = "Don't have an account?";
      toggleBtn!.textContent = 'Create an account';
      googleAuthText!.textContent = 'Sign in with Google';
    } else { // Register mode
      title!.textContent = 'Create Account';
      submitText!.textContent = 'Create Account';
      toggleText!.textContent = 'Already have an account?';
      toggleBtn!.textContent = 'Sign in';
      displayNameField!.classList.remove('hidden');
      displayNameInput!.required = true;
      googleAuthText!.textContent = 'Register with Google';
    }

    // Clear messages and fields
    this.hideMessage();
    this.clearForm();
  }

  /**
   * Handles form submission
   */
  private async handleSubmit(): Promise<void> {
    this.setLoading(true);

    try {
      let result;

      if (this.isAwaitingTotp) {
        const code = (document.getElementById('totp-code') as HTMLInputElement).value;
        result = await sessionService.submitTotp(code);
      } else if (this.isLoginMode) {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        result = await sessionService.login({ email, password });

        if (result.success && result.needsTotp) {
          this.isAwaitingTotp = true;
          this.updateUI();
          this.showMessage('Please enter your 2FA code.', 'success');
          this.setLoading(false);
          return; // Stop here and wait for TOTP submission
        }
      } else { // Register mode
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const displayName = (document.getElementById('displayName') as HTMLInputElement).value;
        if (!displayName.trim()) {
          this.showMessage('Username is required.', 'error');
          this.setLoading(false);
          return;
        }
        result = await sessionService.register({ displayName, email, password });
      }

      if (result.success) {
        this.showMessage(
          this.isLoginMode ? 'Logged in successfully!!' : 'Account successfully created!',
          'success'
        );
        // The modal will be closed automatically by the sessionService listener
      } else {
        this.showMessage(result.error || 'Authentication error', 'error');
        // If TOTP submission fails, go back to the login screen
        if (this.isAwaitingTotp) {
          this.isAwaitingTotp = false;
          this.updateUI();
        }
      }
    } catch (error) {
      this.showMessage('Unexpected error. Try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handles Google Authentication
   */
  private async handleGoogleAuthentication(): Promise<void> {
    sessionService.initiateGoogleLogin();
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
    messageElement.className = `mb-6 p-4 rounded-lg ${type === 'success'
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
    (document.getElementById('totp-code') as HTMLInputElement).value = '';
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
