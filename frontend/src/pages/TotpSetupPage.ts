/**
 * TOTP Setup Page Component
 * Allows users to enable Two-Factor Authentication
 * Works with existing backend routes in users.js
 */

import { totpService } from '../services/TotpService.ts';
import { sessionService } from '../services/SessionService.ts';

export class TotpSetupPage {
  private qrCodeUrl: string = '';
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
              Setup Two-Factor Authentication
            </h1>
            <p class="text-gray-300">Secure your account with 2FA</p>
          </div>

          <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            
            <!-- Loading State -->
            <div id="totp-loading" class="text-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p class="text-white">Generating QR code...</p>
            </div>

            <!-- Setup Content -->
            <div id="totp-content" class="hidden">
              <!-- Step 1 -->
              <div class="mb-8">
                <h2 class="text-2xl font-bold text-white mb-4">
                  <span class="bg-cyan-600 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">1</span>
                  Scan QR Code
                </h2>
                <p class="text-gray-300 mb-4">
                  Use Google Authenticator, Authy, or any TOTP app
                </p>
                <div class="bg-white p-6 rounded-lg mb-4">
                  <img id="qr-image" src="" alt="QR Code" class="mx-auto" style="max-width: 250px;">
                </div>
              </div>

              <!-- Step 2 -->
              <div>
                <h2 class="text-2xl font-bold text-white mb-4">
                  <span class="bg-cyan-600 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">2</span>
                  Verify Code
                </h2>
                <p class="text-gray-300 mb-4">
                  Enter the 6-digit code from your authenticator app
                </p>

                <div id="verify-message" class="hidden mb-4 p-4 rounded-lg"></div>

                <form id="verify-form" class="space-y-4">
                  <input 
                    type="text" 
                    id="verification-code" 
                    maxlength="6"
                    class="w-full p-4 text-center text-2xl tracking-widest rounded-xl bg-white/10 text-white border border-white/20 placeholder-white/50 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                    placeholder="000000"
                    required
                    autocomplete="off">
                  
                  <button 
                    type="submit" 
                    id="verify-btn"
                    class="w-full py-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <span id="verify-text">Enable 2FA</span>
                    <span id="verify-spinner" class="hidden">⏳ Verifying...</span>
                  </button>
                </form>
              </div>
            </div>

            <!-- Error State -->
            <div id="totp-error" class="hidden text-center py-12">
              <div class="text-red-400 text-6xl mb-4">⚠️</div>
              <p class="text-white text-xl mb-2">Setup Failed</p>
              <p id="error-message" class="text-gray-300 mb-6"></p>
              <button 
                id="retry-btn"
                class="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors">
                Try Again
              </button>
            </div>
          </div>

          <div class="text-center mt-6">
            <button 
              id="back-btn"
              class="text-gray-400 hover:text-white transition-colors">
              ← Back
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = pageHTML;
    this.setupEventListeners();
    this.initializeSetup();
  }

  private setupEventListeners(): void {
    document.getElementById('verify-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleVerification();
    });

    const codeInput = document.getElementById('verification-code') as HTMLInputElement;
    codeInput?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value.length === 6) {
        this.handleVerification();
      }
    });

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.initializeSetup();
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
      window.history.back();
    });
  }

  private async initializeSetup(): Promise<void> {
    this.showLoading();

    try {
      // Get current user from session
      const participants = sessionService.getParticipants();
      if (participants.length === 0) {
        this.showError('Please log in first');
        return;
      }

      this.userId = participants[0].id; // Get first participant (current user)

      const result = await totpService.setupTotp(this.userId);

      if (result.error) {
        this.showError(result.error);
        return;
      }

      if (result.data) {
        this.qrCodeUrl = result.data.qrCodeUrl;
        this.displayQRCode();
      }
    } catch (error) {
      this.showError('An unexpected error occurred');
    }
  }

  private displayQRCode(): void {
    document.getElementById('totp-loading')?.classList.add('hidden');
    document.getElementById('totp-error')?.classList.add('hidden');
    document.getElementById('totp-content')?.classList.remove('hidden');

    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    if (qrImage) qrImage.src = this.qrCodeUrl;
  }

  private async handleVerification(): Promise<void> {
    const codeInput = document.getElementById('verification-code') as HTMLInputElement;
    const token = codeInput.value.trim();

    if (token.length !== 6) {
      this.showVerifyMessage('Please enter a valid 6-digit code', 'error');
      return;
    }

    this.setVerifyLoading(true);

    try {
      const result = await totpService.verifyAndEnable(this.userId, token);

      if (result.success) {
        this.showVerifyMessage('2FA enabled successfully!', 'success');
        setTimeout(() => {
          window.location.href = '/settings';
        }, 2000);
      } else {
        this.showVerifyMessage(result.error || 'Invalid code', 'error');
      }
    } catch (error) {
      this.showVerifyMessage('An unexpected error occurred', 'error');
    } finally {
      this.setVerifyLoading(false);
    }
  }

  private showLoading(): void {
    document.getElementById('totp-loading')?.classList.remove('hidden');
    document.getElementById('totp-error')?.classList.add('hidden');
    document.getElementById('totp-content')?.classList.add('hidden');
  }

  private showError(message: string): void {
    document.getElementById('totp-loading')?.classList.add('hidden');
    document.getElementById('totp-content')?.classList.add('hidden');
    document.getElementById('totp-error')?.classList.remove('hidden');
    
    const errorMsg = document.getElementById('error-message');
    if (errorMsg) errorMsg.textContent = message;
  }

  private setVerifyLoading(loading: boolean): void {
    const btn = document.getElementById('verify-btn') as HTMLButtonElement;
    const text = document.getElementById('verify-text');
    const spinner = document.getElementById('verify-spinner');

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

  private showVerifyMessage(message: string, type: 'success' | 'error'): void {
    const messageEl = document.getElementById('verify-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `mb-4 p-4 rounded-lg ${
      type === 'success'
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`;
    messageEl.classList.remove('hidden');

    if (type === 'success') {
      setTimeout(() => messageEl.classList.add('hidden'), 3000);
    }
  }
}