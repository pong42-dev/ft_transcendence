import { ApiClient } from '../services/ApiClient.js';
import { TwoFAInitResponse } from '../types/types.js';
import { BaseModal } from './BaseModal.js';

export class TwoFAModal extends BaseModal {
  private apiClient: ApiClient;
  private currentStep: 'setup' | 'verify' | 'disable' = 'setup';
  private twoFAData: TwoFAInitResponse | null = null;
  private onComplete: (code?: string) => void;
  private onCancel: () => void;

  constructor(
    apiClient: ApiClient, 
    mode: 'enable' | 'disable' | 'login' = 'enable',
    onComplete: (code?: string) => void = () => {},
    onCancel: () => void = () => {}
  ) {
    super();
    this.apiClient = apiClient;
    this.currentStep = mode === 'enable' ? 'setup' : mode === 'disable' ? 'disable' : 'verify';
    this.onComplete = onComplete;
    this.onCancel = onCancel;
  }

  public async show(): Promise<void> {
    if (this.currentStep === 'setup') {
      await this.initializeTwoFA();
    }
    super.show();
  }

  protected async onShow(): Promise<void> {
    this.focusInput('verification-code-input');
  }

  protected onClose(): void {
    this.onCancel();
  }

  protected setupModal(): void {
    super.setupModal();
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-6 rounded-lg w-[500px] max-w-[95%] max-h-[80vh] overflow-y-auto flex flex-col';
  }

  private async initializeTwoFA(): Promise<void> {
    try {
      this.twoFAData = await this.apiClient.auth.initTwoFA();
    } catch (error) {
      // 409 Conflict: 2FA가 이미 활성화된 경우
      if (error instanceof Error && error.message.includes('409')) {
        this.handleError(error, 'TwoFAModal.initializeTwoFA', 
          '2FA is already enabled on your account. Please refresh the page to see the current status.');
      } else {
        this.handleError(error, 'TwoFAModal.initializeTwoFA', 'Failed to initialize 2FA setup. Please try again.');
      }
    }
  }

  protected render(): void {
    switch (this.currentStep) {
      case 'setup':
        this.renderSetupStep();
        break;
      case 'verify':
        this.renderVerifyStep();
        break;
      case 'disable':
        this.renderDisableStep();
        break;
    }
  }

  private renderSetupStep(): void {
    if (!this.twoFAData) {
      this.contentElement.innerHTML = `
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-terminal-green text-xl font-bold">Enable Two-Factor Authentication</h3>
          <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
            ✕
          </button>
        </div>
        
        <div class="flex items-center justify-center py-8">
          <div class="text-terminal-green">Setting up 2FA...</div>
        </div>
      `;
      this.attachCloseListener();
      return;
    }

    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Enable Two-Factor Authentication</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <div class="text-center">
          <p class="text-terminal-green mb-4">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div class="flex justify-center mb-4">
            <img src="${this.twoFAData.qrCodeUrl}" alt="2FA QR Code" class="border border-terminal-gray rounded-lg" />
          </div>
          <div class="text-xs text-terminal-gray mb-4">
            Can't scan? Manual entry key: <code class="bg-terminal-gray bg-opacity-20 px-2 py-1 rounded">${this.twoFAData.secret}</code>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">
            Enter 6-digit code from your authenticator app
          </label>
          <input 
            type="text" 
            id="verification-code-input" 
            class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded text-terminal-green focus:outline-none focus:border-terminal-green text-center text-lg tracking-widest"
            placeholder="000000"
            maxlength="6"
            autocomplete="off"
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="verification-code-error"></div>
        </div>
        
        <div id="general-error" class="hidden text-terminal-red text-sm"></div>
        
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="cancel-btn">
            Cancel
          </button>
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all" id="verify-btn">
            Enable 2FA
          </button>
        </div>
      </div>
    `;

    this.attachSetupEventListeners();
  }

  private renderVerifyStep(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Two-Factor Authentication</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <div class="text-center">
          <p class="text-terminal-green mb-4">
            Enter the 6-digit code from your authenticator app to complete login
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">
            Verification Code
          </label>
          <input 
            type="text" 
            id="verification-code-input" 
            class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded text-terminal-green focus:outline-none focus:border-terminal-green text-center text-lg tracking-widest"
            placeholder="000000"
            maxlength="6"
            autocomplete="off"
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="verification-code-error"></div>
        </div>
        
        <div id="general-error" class="hidden text-terminal-red text-sm"></div>
        
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="cancel-btn">
            Cancel
          </button>
          <button class="px-4 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all" id="verify-btn">
            Verify
          </button>
        </div>
      </div>
    `;

    this.attachVerifyEventListeners();
  }

  private renderDisableStep(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Disable Two-Factor Authentication</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <div class="text-center">
          <p class="text-terminal-yellow mb-4">
            ⚠️ Warning: Disabling 2FA will make your account less secure.
          </p>
          <p class="text-terminal-green mb-4">
            Enter the current 6-digit code from your authenticator app to disable 2FA
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">
            Current Verification Code
          </label>
          <input 
            type="text" 
            id="verification-code-input" 
            class="w-full px-3 py-2 bg-terminal-black border border-terminal-gray rounded text-terminal-green focus:outline-none focus:border-terminal-green text-center text-lg tracking-widest"
            placeholder="000000"
            maxlength="6"
            autocomplete="off"
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="verification-code-error"></div>
        </div>
        
        <div id="general-error" class="hidden text-terminal-red text-sm"></div>
        
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 border border-terminal-gray text-terminal-gray rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-all" id="cancel-btn">
            Cancel
          </button>
          <button class="px-4 py-2 bg-terminal-red text-terminal-black rounded hover:bg-opacity-80 transition-all" id="disable-btn">
            Disable 2FA
          </button>
        </div>
      </div>
    `;

    this.attachDisableEventListeners();
  }

  private attachCloseListener(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => this.close());
  }

  private attachSetupEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const cancelBtn = this.contentElement.querySelector('#cancel-btn');
    const verifyBtn = this.contentElement.querySelector('#verify-btn');
    const codeInput = this.contentElement.querySelector('#verification-code-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Setup numeric input formatting
    this.setupNumericInput('verification-code-input', 6);

    const handleVerify = async () => {
      const code = codeInput?.value.trim();
      if (!code || code.length !== 6) {
        this.showFieldError('verification-code', 'Please enter a valid 6-digit code');
        return;
      }
      
      if (!this.twoFAData) {
        this.handleError(new Error('2FA not initialized'), 'TwoFAModal.handleVerify');
        return;
      }

      try {
        this.setButtonLoading('verify-btn', true, 'Enabling...');
        await this.apiClient.auth.enableTwoFA({
          token: code,
          tmpToken: this.twoFAData.token
        });
        
        this.showSuccess();
      } catch (error) {
        this.handleError(error, 'TwoFAModal.enableTwoFA', 'Failed to enable 2FA. Please check your code and try again.');
      } finally {
        this.setButtonLoading('verify-btn', false);
      }
    };

    verifyBtn?.addEventListener('click', handleVerify);
    this.setupEnterKeyHandler('verification-code-input', handleVerify);
  }

  private attachVerifyEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const cancelBtn = this.contentElement.querySelector('#cancel-btn');
    const verifyBtn = this.contentElement.querySelector('#verify-btn');
    const codeInput = this.contentElement.querySelector('#verification-code-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Setup numeric input formatting
    this.setupNumericInput('verification-code-input', 6);

    const handleVerify = () => {
      const code = codeInput?.value.trim();
      if (!code || code.length !== 6) {
        this.showFieldError('verification-code', 'Please enter a valid 6-digit code');
        return;
      }

      // For login mode, pass the code back to the caller
      // For other modes, call the completion callback
      this.onComplete(code);
    };

    verifyBtn?.addEventListener('click', handleVerify);
    this.setupEnterKeyHandler('verification-code-input', handleVerify);
  }

  private attachDisableEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const cancelBtn = this.contentElement.querySelector('#cancel-btn');
    const disableBtn = this.contentElement.querySelector('#disable-btn');
    const codeInput = this.contentElement.querySelector('#verification-code-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Setup numeric input formatting
    this.setupNumericInput('verification-code-input', 6);

    const handleDisable = async () => {
      const code = codeInput?.value.trim();
      if (!code || code.length !== 6) {
        this.showFieldError('verification-code', 'Please enter a valid 6-digit code');
        return;
      }

      try {
        this.setButtonLoading('disable-btn', true, 'Disabling...');
        await this.apiClient.auth.disableTwoFA({ token: code });
        this.showSuccess('2FA has been disabled successfully');
      } catch (error) {
        this.handleError(error, 'TwoFAModal.disableTwoFA', 'Failed to disable 2FA. Please check your code and try again.');
      } finally {
        this.setButtonLoading('disable-btn', false);
      }
    };

    disableBtn?.addEventListener('click', handleDisable);
    this.setupEnterKeyHandler('verification-code-input', handleDisable);
  }

  public getVerificationCode(): string {
    const codeInput = this.contentElement.querySelector('#verification-code-input') as HTMLInputElement;
    return codeInput?.value.trim() || '';
  }

  public setVerifyMode(): void {
    this.currentStep = 'verify';
  }


  private showSuccess(message: string = '2FA has been enabled successfully!'): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Success!</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="text-center py-8">
        <div class="text-terminal-green text-lg mb-4">✅ ${message}</div>
        <p class="text-terminal-gray mb-6">
          Your account is now protected with two-factor authentication.
        </p>
        <button class="px-6 py-2 bg-terminal-green text-terminal-black rounded hover:bg-opacity-80 transition-all" id="done-btn">
          Done
        </button>
      </div>
    `;

    const closeBtn = this.contentElement.querySelector('#close-btn');
    const doneBtn = this.contentElement.querySelector('#done-btn');
    
    const handleSuccess = () => {
      this.close();
      this.onComplete();
    };
    
    closeBtn?.addEventListener('click', handleSuccess);
    doneBtn?.addEventListener('click', handleSuccess);
    
    // Show success notification
    this.errorHandler.showSuccess(message);
  }
}