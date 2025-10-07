
import { totpService } from '../services/TotpService.ts';
import { sessionService } from '../services/SessionService.ts';

/**
 * TotpSetupModal Component
 * Renders a modal for enabling Two-Factor Authentication.
 */
export class TotpSetupModal {
    private qrCodeUrl: string = '';
    private userId: number = 0;
    private onClose: () => void;
    private modalElement: HTMLElement | null = null;

    constructor(onClose: () => void) {
        this.onClose = onClose;
    }

    /**
     * Renders the modal's HTML structure as a string.
     */
    public render(): string {
        return `
          <div id="totp-setup-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-2xl w-full">
              <div class="flex justify-between items-center mb-4">
                  <h1 class="text-3xl font-black text-cyan-400 orbitron-font">
                    Setup Two-Factor Authentication
                  </h1>
                  <button id="totp-modal-close-btn" class="text-gray-400 hover:text-white transition-colors text-3xl">&times;</button>
              </div>
              <p class="text-gray-300 mb-6">Secure your account by linking it to an authenticator app.</p>

              <div id="totp-modal-content">
                <!-- Loading State -->
                <div id="totp-loading" class="text-center py-12">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                  <p class="text-white">Generating QR code...</p>
                </div>

                <!-- Setup Content (hidden by default) -->
                <div id="totp-content" class="hidden">
                  <div class="mb-8">
                    <h2 class="text-2xl font-bold text-white mb-4">1. Scan QR Code</h2>
                    <div class="bg-white p-6 rounded-lg mb-4">
                      <img id="qr-image" src="" alt="QR Code" class="mx-auto" style="max-width: 250px;">
                    </div>
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-white mb-4">2. Verify Code</h2>
                    <div id="verify-message" class="hidden mb-4 p-4 rounded-lg"></div>
                    <form id="verify-form" class="space-y-4">
                      <input type="text" id="verification-code" maxlength="6" class="w-full p-4 text-center text-2xl tracking-widest rounded-xl bg-white/10 text-white border border-white/20 font-mono" placeholder="000000" required autocomplete="off">
                      <button type="submit" id="verify-btn" class="w-full py-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50" disabled>
                        <span id="verify-text">Enable 2FA</span>
                        <span id="verify-spinner" class="hidden">Verifying...</span>
                      </button>
                    </form>
                  </div>
                </div>

                <!-- Error State (hidden by default) -->
                <div id="totp-error" class="hidden text-center py-12">
                  <p id="error-message" class="text-red-400 mb-6"></p>
                  <button id="retry-btn" class="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg">Try Again</button>
                </div>
              </div>
            </div>
          </div>
        `;
    }

    /**
     * Attaches event listeners to the modal elements and starts the setup process.
     */
    public setupEventListeners(modalElement: HTMLElement): void {
        this.modalElement = modalElement;

        const closeButton = this.modalElement.querySelector('#totp-modal-close-btn');
        const verifyForm = this.modalElement.querySelector('#verify-form');
        const codeInput = this.modalElement.querySelector('#verification-code') as HTMLInputElement;
        const retryButton = this.modalElement.querySelector('#retry-btn');

        closeButton?.addEventListener('click', () => this.onClose());
        retryButton?.addEventListener('click', () => this.initializeSetup());

        verifyForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVerification();
        });

        codeInput?.addEventListener('input', () => {
            const verifyBtn = this.modalElement?.querySelector('#verify-btn') as HTMLButtonElement;
            verifyBtn.disabled = codeInput.value.length !== 6;
        });

        this.initializeSetup();
    }

    private async initializeSetup(): Promise<void> {
        this.showLoading();
        const participants = sessionService.getParticipants();
        if (participants.length === 0) {
            this.showError('Please log in first.');
            return;
        }
        this.userId = participants[0].id;

        const result = await totpService.setupTotp(this.userId);
        if (result.error) {
            this.showError(result.error);
        } else if (result.data) {
            this.qrCodeUrl = result.data.qrCodeUrl;
            this.displayQRCode();
        }
    }

    private displayQRCode(): void {
        this.showContent();
        const qrImage = this.modalElement?.querySelector('#qr-image') as HTMLImageElement;
        if (qrImage) qrImage.src = this.qrCodeUrl;
    }

    private async handleVerification(): Promise<void> {
        const codeInput = this.modalElement?.querySelector('#verification-code') as HTMLInputElement;
        if (!codeInput) return;

        const token = codeInput.value.trim();
        if (token.length !== 6) {
            this.showVerifyMessage('Please enter a valid 6-digit code.', 'error');
            return;
        }

        this.setVerifyLoading(true);
        const result = await totpService.verifyAndEnable(this.userId, token);
        this.setVerifyLoading(false);

        if (result.success) {
            this.showVerifyMessage('2FA enabled successfully!', 'success');
            setTimeout(() => this.onClose(true), 1500); // Close modal on success
        } else {
            this.showVerifyMessage(result.error || 'Invalid code', 'error');
        }
    }

    // UI state helpers
    private showLoading(): void {
        this.modalElement?.querySelector('#totp-loading')?.classList.remove('hidden');
        this.modalElement?.querySelector('#totp-content')?.classList.add('hidden');
        this.modalElement?.querySelector('#totp-error')?.classList.add('hidden');
    }

    private showContent(): void {
        this.modalElement?.querySelector('#totp-loading')?.classList.add('hidden');
        this.modalElement?.querySelector('#totp-content')?.classList.remove('hidden');
        this.modalElement?.querySelector('#totp-error')?.classList.add('hidden');
    }

    private showError(message: string): void {
        this.modalElement?.querySelector('#totp-loading')?.classList.add('hidden');
        this.modalElement?.querySelector('#totp-content')?.classList.add('hidden');
        this.modalElement?.querySelector('#totp-error')?.classList.remove('hidden');
        const errorMsg = this.modalElement?.querySelector('#error-message');
        if (errorMsg) errorMsg.textContent = message;
    }

    private setVerifyLoading(isLoading: boolean): void {
        const btn = this.modalElement?.querySelector('#verify-btn') as HTMLButtonElement;
        if (btn) btn.disabled = isLoading;
        this.modalElement?.querySelector('#verify-text')?.classList.toggle('hidden', isLoading);
        this.modalElement?.querySelector('#verify-spinner')?.classList.toggle('hidden', !isLoading);
    }

    private showVerifyMessage(message: string, type: 'success' | 'error'): void {
        const msgEl = this.modalElement?.querySelector('#verify-message');
        if (!msgEl) return;
        msgEl.textContent = message;
        msgEl.className = `p-4 rounded-lg ${type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;
        msgEl.classList.remove('hidden');
    }
}
