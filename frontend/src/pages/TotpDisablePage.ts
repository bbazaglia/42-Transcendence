/**
 * TOTP Disable Page Component
 * Allows users to disable Two-Factor Authentication
 * Works with existing backend routes in users.js
 */

import { totpService } from '../services/TotpService.ts';
import { sessionService } from '../services/SessionService.ts';

export class TotpDisablePage {
  private userId: number = 0;

  constructor() {
    this.render();
  }

  private render(): void {
    const pageHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-8">
        <div class="max-w-2xl mx-auto">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-black text-cyan-400 orbitron-font mb-2">
              Disable Two-Factor Authentication
            </h1>
            <p class="text-gray-300">Remove 2FA from your account</p>
          </div>

          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            
            <!-- Warning -->
            <div class="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p class="text-red-300 font-semibold mb-2">⚠️ Warning</p>
              <p class="text-gray-300 text-sm">
                Disabling 2FA will make your account less secure. You'll only need your password to log in.
              </p>
            </div>

            <!-- Message Display -->
            <div id="disable-message" class="hidden mb-4 p-4 rounded-lg"></div>

            <!-- Form -->
            <form id="disable-form" class="space-y-4">
              <div>
                <label class="block text-white font-semibold mb-2">
                  Enter your password to confirm:
                </label>
                <input 
                  type="password" 
                  id="disable-password" 
                  class="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-red-400 focus:outline-none transition-colors"
                  placeholder="Your password"
                  required
                  autocomplete="current-password">
              </div>
              
              <button 
                type="submit" 
                id="disable-btn"
                class="w-full py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <span id="disable-text">Disable 2FA</span>
                <span id="disable-spinner" class="hidden">⏳ Processing...</span>
              </button>

              <button 
                type="button"
                id="cancel-btn"
                class="w-full py-4 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors">
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = pageHTML;
    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners(): void {
    document.getElementById('disable-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleDisable();
    });

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      window.history.back();
    });
  }

  private initialize(): void {
    // Get current user from session
    const participants = sessionService.getParticipants();
    if (participants.length === 0) {
      this.showMessage('Please log in first', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return;
    }

    this.userId = participants[0].id;
  }

  private async handleDisable(): Promise<void> {
    const passwordInput = document.getElementById('disable-password') as HTMLInputElement;
    const password = passwordInput.value.trim();

    if (!password) {
      this.showMessage('Please enter your password', 'error');
      return;
    }

    this.setLoading(true);

    try {
      const result = await totpService.disableTotp(this.userId, password);

      if (result.success) {
        this.showMessage('2FA disabled successfully', 'success');
        setTimeout(() => {
          window.location.href = '/settings';
        }, 2000);
      } else {
        this.showMessage(result.error || 'Failed to disable 2FA', 'error');
      }
    } catch (error) {
      this.showMessage('An unexpected error occurred', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    const btn = document.getElementById('disable-btn') as HTMLButtonElement;
    const text = document.getElementById('disable-text');
    const spinner = document.getElementById('disable-spinner');

    if (btn && text && spinner) {
      btn.disabled = loading;
      if (loading) {
        text.classList.add('hidden');
        spinner.classList.remove('hidden');
      } else {
        text.classList.remove('hidden');
        spinner.classList.add('hidden');
      }
    }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageEl = document.getElementById('disable-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `mb-4 p-4 rounded-lg ${
      type === 'success'
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`;
    messageEl.classList.remove('hidden');
  }
}