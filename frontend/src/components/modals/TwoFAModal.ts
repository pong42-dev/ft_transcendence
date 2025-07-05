/**
 * TwoFAModal - ModalManager를 사용하는 2FA 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { TwoFAInitResponse } from '../../types/types.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import { authStore } from '../../store/index.js';
import { i18n } from '../../services/i18n';

export interface TwoFAModalCallbacks {
  onComplete: (code?: string) => void;
  onCancel: () => void;
}

export class TwoFAModal {
  private apiClient: ApiClient;
  private currentStep: 'setup' | 'verify' | 'disable' = 'setup';
  private twoFAData: TwoFAInitResponse | null = null;
  private callbacks: TwoFAModalCallbacks;
  private modalManager: ModalManager;
  private isCompleted: boolean = false;

  constructor(
    apiClient: ApiClient, 
    mode: 'enable' | 'disable' | 'login' = 'enable',
    callbacks: TwoFAModalCallbacks
  ) {
    this.apiClient = apiClient;
    this.currentStep = mode === 'enable' ? 'setup' : mode === 'disable' ? 'disable' : 'verify';
    this.callbacks = callbacks;
    this.modalManager = ModalManager.getInstance();
  }

  /**
   * 모달 표시
   */
  public async show(): Promise<void> {
    if (this.currentStep === 'setup') {
      await this.initializeTwoFA();
    }

    const modalContent: ModalContent = {
      title: undefined, // 커스텀 헤더 사용
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true, // ESC 키로 닫을 수 있도록 변경
        closeOnOutsideClick: true,
        sizeClass: 'w-[500px] max-w-[95%] max-h-[90vh]',
        animated: true
      }
    };

    this.modalManager.show(modalContent);
  }

  /**
   * 모달 숨기기
   */
  public hide(): void {
    this.modalManager.hide();
  }

  private async initializeTwoFA(): Promise<void> {
    try {
      this.twoFAData = await this.apiClient.auth.initTwoFA();
      console.log('[TwoFAModal] 2FA initialized:', {
        hasQrCode: !!this.twoFAData?.qrCodeUrl,
        hasSecret: !!this.twoFAData?.secret,
        hasToken: !!this.twoFAData?.token,
        secretLength: this.twoFAData?.secret?.length,
        tokenLength: this.twoFAData?.token?.length,
        secretPreview: this.twoFAData?.secret?.substring(0, 8) + '...'
      });
    } catch (error) {
      console.error('TwoFA initialization error:', error);
    }
  }

  /**
   * 모달 콘텐츠 생성
   */
  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col h-full';

    switch (this.currentStep) {
      case 'setup':
        container.appendChild(this.createSetupStep());
        break;
      case 'verify':
        container.appendChild(this.createVerifyStep());
        break;
      case 'disable':
        container.appendChild(this.createDisableStep());
        break;
    }

    return container;
  }

  private createSetupStep(): HTMLElement {
    const container = document.createElement('div');

    if (!this.twoFAData) {
      container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-terminal-green text-xl font-bold">${i18n.t('twoFAModal.enable_2fa_title')}</h3>
          <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
            ✕
          </button>
        </div>
        
        <div class="flex items-center justify-center py-8">
          <div class="text-terminal-green">${i18n.t('twoFAModal.setting_up_2fa')}</div>
        </div>
      `;
      
      this.setupEventListeners(container);
      return container;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${i18n.t('twoFAModal.enable_2fa_title')}</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-3">
              ${i18n.t('twoFAModal.scan_qr_code_instruction')}
            </p>
            <div class="flex justify-center mb-3">
              <div class="bg-white p-2 rounded-lg">
                <img src="${this.twoFAData.qrCodeUrl}" alt="2FA QR Code" class="w-32 h-32" />
              </div>
            </div>
            <div class="text-sm text-terminal-gray">
              <p class="mb-2">${i18n.t('twoFAModal.manual_entry_code')}</p>
              <div class="bg-terminal-black border border-terminal-gray rounded px-3 py-2 font-mono text-xs">
                ${this.twoFAData.secret}
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              ${i18n.t('twoFAModal.enter_verification_code')}
            </label>
            <input 
              type="text" 
              id="verification-code-input"
              class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green text-center text-lg tracking-widest focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
              placeholder="000000"
              maxlength="6"
              autocomplete="off"
            />
            <div class="text-xs text-terminal-red mt-1 hidden" id="verification-error"></div>
          </div>
        </div>
      </div>
      
      <div class="flex-shrink-0 pt-4 border-t border-terminal-gray">
        <div class="flex space-x-3">
          <button 
            id="cancel-btn"
            class="flex-1 px-4 py-3 border border-terminal-gray text-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-10 transition-all"
          >
            ${i18n.t('common.cancel')}
          </button>
          <button 
            id="enable-btn"
            class="flex-1 px-4 py-3 bg-terminal-green text-terminal-black rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            ${i18n.t('twoFAModal.enable_2fa_button')}
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  private createVerifyStep(): HTMLElement {
    const container = document.createElement('div');
    
    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${i18n.t('twoFAModal.two_factor_authentication_title')}</h3>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-4">
              ${i18n.t('twoFAModal.enter_6_digit_code')}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              ${i18n.t('twoFAModal.verification_code')}
            </label>
            <input 
              type="text" 
              id="verification-code-input"
              class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green text-center text-lg tracking-widest focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
              placeholder="000000"
              maxlength="6"
              autocomplete="off"
            />
            <div class="text-xs text-terminal-red mt-1 hidden" id="verification-error"></div>
          </div>
        </div>
      </div>
      
      <div class="flex-shrink-0 pt-4 border-t border-terminal-gray">
        <button 
          id="verify-btn"
          class="w-full px-4 py-3 bg-terminal-green text-terminal-black rounded-lg font-medium hover:bg-opacity-80 transition-all"
        >
          ${i18n.t('common.verify')}
        </button>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  private createDisableStep(): HTMLElement {
    const container = document.createElement('div');
    
    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">${i18n.t('twoFAModal.disable_2fa_title')}</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-4">
              ${i18n.t('twoFAModal.enter_code_to_disable')}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              ${i18n.t('twoFAModal.current_verification_code')}
            </label>
            <input 
              type="text" 
              id="verification-code-input"
              class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green text-center text-lg tracking-widest focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
              placeholder="000000"
              maxlength="6"
              autocomplete="off"
            />
            <div class="text-xs text-terminal-red mt-1 hidden" id="verification-error"></div>
          </div>
        </div>
      </div>
      
      <div class="flex-shrink-0 pt-4 border-t border-terminal-gray">
        <div class="flex space-x-3">
          <button 
            id="cancel-btn"
            class="flex-1 px-4 py-3 border border-terminal-gray text-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-10 transition-all"
          >
            ${i18n.t('common.cancel')}
          </button>
          <button 
            id="disable-btn"
            class="flex-1 px-4 py-3 bg-terminal-green text-terminal-black rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            ${i18n.t('twoFAModal.disable_2fa_button')}
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  private setupEventListeners(container: HTMLElement): void {
    const closeBtn = container.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => this.handleCancel());

    const cancelBtn = container.querySelector('#cancel-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    const enableBtn = container.querySelector('#enable-btn');
    enableBtn?.addEventListener('click', () => this.handleEnable());

    const verifyBtn = container.querySelector('#verify-btn');
    verifyBtn?.addEventListener('click', () => this.handleVerify());

    const disableBtn = container.querySelector('#disable-btn');
    disableBtn?.addEventListener('click', () => this.handleDisable());

    const codeInput = container.querySelector('#verification-code-input') as HTMLInputElement;
    codeInput?.addEventListener('input', this.handleCodeInput.bind(this));
    codeInput?.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private onShow(): void {
    // Prevent terminal from focusing while modal is open
    // This is handled by ModalManager
    this.modalManager.focusElement('#verification-code-input');
  }

  private onClose(): void {
    // Reset state when modal is closed
    this.isCompleted = false; // Reset completion state
    // this.twoFAData = null; // Don't clear data if we might need to re-show for retry
    // No need to call callbacks here, they are called when action is completed
  }

  private handleCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, ''); // 숫자만 허용
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Allow only numbers and specific control keys (backspace, arrow keys, etc.)
    if (!/^[0-9]$/.test(event.key) &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'Tab') {
      event.preventDefault();
    }
  }

  private async handleEnable(): Promise<void> {
    const codeInput = document.getElementById('verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();

    if (!code || code.length !== 6) {
      this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
      return;
    }

    if (!this.twoFAData?.token) {
      this.showVerificationError(i18n.t('twoFAModal.setup_data_not_found_error'));
      return;
    }
    
    DOMUpdater.toggleLoading('#enable-btn', true, i18n.t('twoFAModal.enabling_2fa'));

    try {
      await this.apiClient.auth.enableTwoFA(this.twoFAData.token, code);
      this.callbacks.onComplete();
      this.hide();
      this.refreshUserData(true); // 2FA 활성화 후 사용자 데이터 새로고침
    } catch (error: any) {
      console.error('2FA enable error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        if (error.response.data.message === 'Please enter a 6-digit code') {
          this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
        } else if (error.response.data.message === 'Setup data not found. Please refresh and try again.') {
          this.showVerificationError(i18n.t('twoFAModal.setup_data_not_found_error'));
        } else {
          this.showVerificationError(error.response.data.message);
        }
      } else {
        this.showVerificationError(i18n.t('common.error_occurred_try_again'));
      }
    } finally {
      DOMUpdater.toggleLoading('#enable-btn', false);
    }
  }

  private async handleVerify(): Promise<void> {
    const codeInput = document.getElementById('verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();

    if (!code || code.length !== 6) {
      this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
      return;
    }

    DOMUpdater.toggleLoading('#verify-btn', true, i18n.t('common.verifying'));

    try {
      // tmpToken이 있다면 로그인 시 2FA 인증, 없다면 일반 인증
      const tmpToken = authStore.getState().user?.tmpToken;
      if (tmpToken) {
        await this.apiClient.auth.verifyTwoFALogin(tmpToken, code);
        this.callbacks.onComplete(code); // 로그인 시에는 코드도 함께 전달
      } else {
        await this.apiClient.auth.verifyTwoFA(code);
        this.callbacks.onComplete();
      }
      this.hide();
      this.refreshUserData(true); // 2FA 인증 후 사용자 데이터 새로고침
    } catch (error: any) {
      console.error('2FA verification error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        if (error.response.data.message === 'Session refreshed. Please scan the new QR code and try again.') {
          this.showVerificationError(i18n.t('twoFAModal.session_refreshed_error'));
        } else if (error.response.data.message === 'Setup session expired. Please close and reopen 2FA setup.') {
          this.showVerificationError(i18n.t('twoFAModal.setup_session_expired_error'));
        } else if (error.response.data.message === 'Please enter a 6-digit code') {
          this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
        } else {
          this.showVerificationError(error.response.data.message);
        }
      } else {
        this.showVerificationError(i18n.t('common.error_occurred_try_again'));
      }
    } finally {
      DOMUpdater.toggleLoading('#verify-btn', false);
    }
  }

  private async handleDisable(): Promise<void> {
    const codeInput = document.getElementById('verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();

    if (!code || code.length !== 6) {
      this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
      return;
    }

    DOMUpdater.toggleLoading('#disable-btn', true, i18n.t('twoFAModal.disabling_2fa'));

    try {
      await this.apiClient.auth.disableTwoFA(code);
      this.callbacks.onComplete();
      this.hide();
      this.refreshUserData(false); // 2FA 비활성화 후 사용자 데이터 새로고침
    } catch (error: any) {
      console.error('2FA disable error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        if (error.response.data.message === 'Please enter a 6-digit code') {
          this.showVerificationError(i18n.t('twoFAModal.enter_6_digit_code_error'));
        } else {
          this.showVerificationError(error.response.data.message);
        }
      } else {
        this.showVerificationError(i18n.t('common.error_occurred_try_again'));
      }
    } finally {
      DOMUpdater.toggleLoading('#disable-btn', false);
    }
  }

  private handleCancel(): void {
    this.hide();
    this.callbacks.onCancel();
  }

  /**
   * 2FA 상태 변경 후 사용자 데이터를 새로고침하고 UI에 반영
   * @param isEnabled 새로 설정된 2FA 상태 (활성화/비활성화)
   */
  private async refreshUserData(isEnabled: boolean): Promise<void> {
    try {
      const response = await this.apiClient.users.getMe();
      if (response.status === 200) {
        const updatedUser = { ...response.data.user, twoFactorEnabled: isEnabled };
        authStore.getState().login(updatedUser, authStore.getState().accessToken);
        console.log('[TwoFAModal] User data refreshed after 2FA status change.');
        // UserProfileManager를 사용하여 UserProfile 컴포넌트 업데이트를 트리거합니다.
        // UserProfileManager.getInstance().updateUserProfile(updatedUser);
      } else {
        console.warn('[TwoFAModal] Failed to refresh user data after 2FA change.', response.status);
      }
    } catch (error) {
      console.error('[TwoFAModal] Error refreshing user data after 2FA change:', error);
    }
  }

  private showVerificationError(message: string): void {
    const errorElement = document.querySelector('#verification-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      setTimeout(() => {
        errorElement.classList.add('hidden');
      }, 3000);
    }
  }
}
