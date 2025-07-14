/**
 * TwoFAModal - ModalManager를 사용하는 2FA 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { TwoFAInitResponse } from '../../types/types.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import { authStore } from '../../store/index.js';
import i18n from '../../services/i18n.js';

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
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private lastUsedToken: string = '';
  private tokenUsageTimestamp: number = 0;

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
    this.cleanup();
    this.modalManager.hide();
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isRefreshing = false;
  }

  private async initializeTwoFA(): Promise<void> {
    try {
      this.twoFAData = await this.apiClient.auth.initTwoFA();
      // 4분 후에 자동으로 새로운 토큰을 요청 (만료 1분 전)
      this.scheduleRefresh();
    } catch (error) {
      console.error('[TwoFAModal] Failed to initialize 2FA:', error);
      // 초기화 에러 시 모달을 닫지 않고 에러 상태 표시
      this.twoFAData = null;
    }
  }

  /**
   * 토큰 갱신 스케줄링 (4분 후)
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(async () => {
      if (this.currentStep === 'setup' && !this.isRefreshing) {
        await this.refreshTwoFAData();
      }
    }, 4 * 60 * 1000); // 4분
  }

  /**
   * 2FA 데이터 새로고침
   */
  private async refreshTwoFAData(): Promise<void> {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    try {
      const newData = await this.apiClient.auth.initTwoFA();
      this.twoFAData = newData;
      
      // UI 업데이트
      this.updateQRCodeAndSecret();
      
      // 다음 갱신 스케줄링
      this.scheduleRefresh();
      
      // 사용자에게 알림
      this.showRefreshNotification();
    } catch (error) {
      console.error('[TwoFAModal] Failed to refresh 2FA data:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * QR 코드와 시크릿 업데이트
   */
  private updateQRCodeAndSecret(): void {
    if (!this.twoFAData) return;
    
    // QR 코드 업데이트
    const qrCodeContainer = document.querySelector('#qr-code-container');
    if (qrCodeContainer) {
      // 기존 이미지 제거
      qrCodeContainer.innerHTML = '';
      // 새 이미지 추가
      const qrImg = document.createElement('img');
      qrImg.src = this.twoFAData.qrCodeUrl;
      qrImg.alt = '2FA QR Code';
      qrImg.className = 'w-32 h-32';
      qrCodeContainer.appendChild(qrImg);
    }
    
    // 시크릿 코드 업데이트
    const secretCodeContainer = document.querySelector('#secret-code-container');
    if (secretCodeContainer) {
      secretCodeContainer.textContent = this.twoFAData.secret;
    }
  }

  /**
   * 갱신 알림 표시
   */
  private showRefreshNotification(): void {
    const container = document.querySelector('.space-y-4');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'bg-terminal-green bg-opacity-10 border border-terminal-green rounded-lg p-3 text-sm text-terminal-green';
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>🔄</span>
        <span>${i18n.t('twoFAModal.qr_code_refreshed')}</span>
      </div>
    `;
    
    container.prepend(notification);
    
    // 3초 후 알림 제거
    setTimeout(() => {
      notification.remove();
    }, 3000);
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

    // Use DOM manipulation to avoid XSS
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
              <div class="bg-white p-2 rounded-lg" id="qr-code-container">
                <!-- QR Code will be inserted here -->
              </div>
            </div>
            <div class="text-sm text-terminal-gray">
              <p class="mb-2">${i18n.t('twoFAModal.manual_entry_code')}</p>
              <div class="bg-terminal-black border border-terminal-gray rounded px-3 py-2 font-mono text-xs" id="secret-code-container">
                <!-- Secret code will be inserted here -->
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

    // Safely insert QR code
    const qrCodeContainer = container.querySelector('#qr-code-container');
    if (qrCodeContainer) {
      const qrImg = document.createElement('img');
      qrImg.src = this.twoFAData.qrCodeUrl;
      qrImg.alt = '2FA QR Code';
      qrImg.className = 'w-32 h-32';
      qrCodeContainer.appendChild(qrImg);
    }

    // Safely insert secret code
    const secretCodeContainer = container.querySelector('#secret-code-container');
    if (secretCodeContainer) {
      secretCodeContainer.textContent = this.twoFAData.secret;
    }

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
    // Modal cleanup logic can be added here if needed
  }

  private handleCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, ''); // 숫자만 허용
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Enter 키 처리 - 현재 단계에 따라 적절한 동작 실행
    if (event.key === 'Enter') {
      event.preventDefault();
      
      switch (this.currentStep) {
        case 'setup':
          this.handleEnable();
          break;
        case 'verify':
          this.handleVerify();
          break;
        case 'disable':
          this.handleDisable();
          break;
      }
      return;
    }

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

    // 토큰 재사용 방지 체크
    if (this.isTokenRecentlyUsed(code)) {
      this.showTokenReuseWarning();
      return;
    }
    
    DOMUpdater.toggleLoading('#enable-btn', true, i18n.t('twoFAModal.enabling_2fa'));

    try {
      await this.apiClient.auth.enableTwoFA({
        tmpToken: this.twoFAData.token,
        token: code
      });
      this.callbacks.onComplete(code);
      this.hide();
      this.refreshUserData(true); // 2FA 활성화 후 사용자 데이터 새로고침
    } catch (error) {
      console.error('[TwoFAModal] Failed to enable 2FA:', error);
      
      // 토큰 사용 기록 (실패해도 기록하여 재사용 방지)
      this.recordTokenUsage(code);
      
      // 에러 메시지 추출 및 특별 처리
      let errorMessage: string;
      if (error instanceof Error && error.message.includes('Invalid 2FA token')) {
        errorMessage = i18n.t('twoFAModal.invalid_token_wait_new');
      } else {
        errorMessage = error instanceof Error ? error.message : i18n.t('common.error_occurred_try_again');
      }
      this.showVerificationError(errorMessage);
      
      // 입력 필드 클리어하여 새 토큰 입력 유도
      codeInput.value = '';
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
      this.callbacks.onComplete(code);
      this.hide();
    } catch (error) {
      console.error('[TwoFAModal] Failed to verify 2FA code:', error);
      
      // 에러 메시지 추출 (타입 안전)
      const errorMessage = error instanceof Error ? error.message : i18n.t('common.error_occurred_try_again');
      this.showVerificationError(errorMessage);
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

    // 토큰 재사용 방지 체크
    if (this.isTokenRecentlyUsed(code)) {
      this.showTokenReuseWarning();
      return;
    }

    DOMUpdater.toggleLoading('#disable-btn', true, i18n.t('twoFAModal.disabling_2fa'));

    try {
      await this.apiClient.auth.disableTwoFA({ token: code });
      this.callbacks.onComplete(code);
      this.hide();
      this.refreshUserData(false); // 2FA 비활성화 후 사용자 데이터 새로고침
    } catch (error) {
      console.error('[TwoFAModal] Failed to disable 2FA:', error);
      
      // 토큰 사용 기록 (실패해도 기록하여 재사용 방지)
      this.recordTokenUsage(code);
      
      // 에러 메시지 추출 및 특별 처리
      let errorMessage: string;
      if (error instanceof Error && error.message.includes('Invalid 2FA token')) {
        errorMessage = i18n.t('twoFAModal.invalid_token_wait_new');
      } else {
        errorMessage = error instanceof Error ? error.message : i18n.t('common.error_occurred_try_again');
      }
      this.showVerificationError(errorMessage);
      
      // 입력 필드 클리어하여 새 토큰 입력 유도
      codeInput.value = '';
    } finally {
      DOMUpdater.toggleLoading('#disable-btn', false);
    }
  }

  private async handleCancel(): Promise<void> {
    // 설정 중이었다면 클라이언트 데이터만 정리 (백엔드는 자동으로 만료됨)
    if (this.currentStep === 'setup') {
      console.info('[TwoFAModal] 2FA setup cancelled - temp data will auto-expire in 5 minutes');
    }
    
    this.hide();
    this.callbacks.onCancel();
  }

  /**
   * 2FA 상태 변경 후 사용자 데이터를 새로고침하고 UI에 반영
   * @param isEnabled 새로 설정된 2FA 상태 (활성화/비활성화)
   */
  private async refreshUserData(isEnabled: boolean): Promise<void> {
    try {
      const updatedUser = await this.apiClient.user.getProfile();
      const userWithTwoFA = { ...updatedUser, twoFactorEnabled: isEnabled };
      authStore.updateUser(userWithTwoFA);
    } catch (error) {
      console.error('[TwoFAModal] Error refreshing user data after 2FA change:', error);
    }
  }

  /**
   * 토큰이 최근에 사용되었는지 확인
   */
  private isTokenRecentlyUsed(token: string): boolean {
    const now = Date.now();
    const timeDiff = now - this.tokenUsageTimestamp;
    
    // 같은 토큰을 60초 이내에 재사용하려는 경우
    return this.lastUsedToken === token && timeDiff < 60000;
  }

  /**
   * 토큰 사용 기록
   */
  private recordTokenUsage(token: string): void {
    this.lastUsedToken = token;
    this.tokenUsageTimestamp = Date.now();
  }

  /**
   * 토큰 재사용 경고 표시
   */
  private showTokenReuseWarning(): void {
    this.showVerificationError(i18n.t('twoFAModal.token_already_used_wait'));
    
    // 입력 필드 클리어
    const codeInput = document.getElementById('verification-code-input') as HTMLInputElement;
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
  }

  private showVerificationError(message: string): void {
    const errorElement = document.querySelector('#verification-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      setTimeout(() => {
        errorElement.classList.add('hidden');
      }, 5000); // 에러 메시지를 더 오래 표시
    }
  }
}
