/**
 * TwoFAModal - ModalManager를 사용하는 2FA 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { TwoFAInitResponse } from '../../types/types.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import { authStore } from '../../store/index.js';

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
          <h3 class="text-terminal-green text-xl font-bold">Enable Two-Factor Authentication</h3>
          <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
            ✕
          </button>
        </div>
        
        <div class="flex items-center justify-center py-8">
          <div class="text-terminal-green">Setting up 2FA...</div>
        </div>
      `;
      
      this.setupEventListeners(container);
      return container;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Enable Two-Factor Authentication</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-3">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div class="flex justify-center mb-3">
              <div class="bg-white p-2 rounded-lg">
                <img src="${this.twoFAData.qrCodeUrl}" alt="2FA QR Code" class="w-32 h-32" />
              </div>
            </div>
            <div class="text-sm text-terminal-gray">
              <p class="mb-2">Manual entry code:</p>
              <div class="bg-terminal-black border border-terminal-gray rounded px-3 py-2 font-mono text-xs">
                ${this.twoFAData.secret}
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              Enter verification code
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
            Cancel
          </button>
          <button 
            id="enable-btn"
            class="flex-1 px-4 py-3 bg-terminal-green text-terminal-black rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            Enable 2FA
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
        <h3 class="text-terminal-green text-xl font-bold">Two-Factor Authentication</h3>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-4">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              Verification code
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
          Verify
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
        <h3 class="text-terminal-green text-xl font-bold">Disable Two-Factor Authentication</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto px-1">
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-terminal-gray mb-4">
              Enter your current 2FA code to disable two-factor authentication
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-terminal-green">
              Current verification code
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
            Cancel
          </button>
          <button 
            id="disable-btn"
            class="flex-1 px-4 py-3 bg-terminal-red text-white rounded-lg font-medium hover:bg-opacity-80 transition-all"
          >
            Disable 2FA
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(container: HTMLElement): void {
    // 공통 이벤트
    const closeBtn = container.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    const cancelBtn = container.querySelector('#cancel-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    const codeInput = container.querySelector('#verification-code-input') as HTMLInputElement;
    codeInput?.addEventListener('input', (e) => this.handleCodeInput(e));
    codeInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 단계별 이벤트
    switch (this.currentStep) {
      case 'setup':
        const enableBtn = container.querySelector('#enable-btn');
        enableBtn?.addEventListener('click', () => this.handleEnable());
        break;
      case 'verify':
        const verifyBtn = container.querySelector('#verify-btn');
        verifyBtn?.addEventListener('click', () => this.handleVerify());
        break;
      case 'disable':
        const disableBtn = container.querySelector('#disable-btn');
        disableBtn?.addEventListener('click', () => this.handleDisable());
        break;
    }
  }

  /**
   * 모달이 표시될 때 호출
   */
  private onShow(): void {
    // 코드 입력 필드에 포커스
    this.modalManager.focusElement('#verification-code-input');
  }

  /**
   * 모달이 닫힐 때 호출
   */
  private onClose(): void {
    this.twoFAData = null;
    // 완료되지 않고 닫힌 경우 취소 콜백 호출
    if (!this.isCompleted) {
      this.callbacks.onCancel();
    }
    
    // 터미널 포커스 복원
    this.restoreTerminalFocus();
  }

  private handleCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // 숫자만 입력 허용
    input.value = input.value.replace(/[^0-9]/g, '');
    
    // 에러 메시지 숨기기
    DOMUpdater.hideError('#verification-error');
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Enter 키 처리
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const code = input.value.trim();
      
      if (code.length === 6) {
        // 현재 단계에 따라 적절한 핸들러 호출
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
      }
    }
  }

  private async handleEnable(): Promise<void> {
    const codeInput = document.querySelector('#verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
      DOMUpdater.showError('#verification-error', 'Please enter a 6-digit code');
      return;
    }

    if (!this.twoFAData?.token) {
      DOMUpdater.showError('#verification-error', 'Setup data not found. Please refresh and try again.');
      return;
    }

    console.log('[TwoFAModal] Attempting to enable 2FA:', {
      codeLength: code.length,
      tmpTokenLength: this.twoFAData.token.length,
      tmpToken: this.twoFAData.token.substring(0, 10) + '...'
    });

    DOMUpdater.toggleLoading('#enable-btn', true, 'Enabling...');
    
    try {
      await this.apiClient.auth.enableTwoFA({
        token: code,
        tmpToken: this.twoFAData.token
      });
      
      // 2FA 활성화 성공 시 사용자 데이터 새로고침
      await this.refreshUserData();
      
      this.isCompleted = true;
      this.callbacks.onComplete(code);
      this.hide();
      
      // onClose에서 이미 포커스 복원하므로 여기서는 중복 호출하지 않음
    } catch (error: any) {
      console.error('2FA enable error:', error);
      console.log('[TwoFAModal] Error details:', {
        status: error.status,
        message: error.message,
        data: error.data,
        isTokenError: error.message?.includes('token'),
        is2FAError: error.message?.includes('2FA')
      });
      
      // tmpToken 관련 오류인 경우 자동 재초기화 시도
      if (error.message?.includes('tmp token') || error.message?.includes('Invalid tmp token')) {
        console.log('[TwoFAModal] tmpToken expired, attempting to reinitialize...');
        
        try {
          // QR 코드 재생성
          await this.initializeTwoFA();
          
          // 컨텐츠를 다시 렌더링 (새로운 QR코드와 tmpToken으로)
          const container = document.querySelector('.modal-content');
          if (container) {
            const newContent = this.createContent();
            container.innerHTML = '';
            container.appendChild(newContent);
          }
          
          DOMUpdater.showError('#verification-error', 
            'Session refreshed. Please scan the new QR code and try again.'
          );
        } catch (reinitError) {
          console.error('Failed to reinitialize 2FA:', reinitError);
          DOMUpdater.showError('#verification-error', 
            'Setup session expired. Please close and reopen 2FA setup.'
          );
        }
      } else {
        DOMUpdater.showError('#verification-error', 
          error.message || 'Invalid code. Please try again.'
        );
      }
    } finally {
      DOMUpdater.toggleLoading('#enable-btn', false);
    }
  }

  private async handleVerify(): Promise<void> {
    const codeInput = document.querySelector('#verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
      DOMUpdater.showError('#verification-error', 'Please enter a 6-digit code');
      return;
    }

    DOMUpdater.toggleLoading('#verify-btn', true, 'Verifying...');
    
    try {
      // 2FA 로그인 검증의 경우 코드를 콜백으로 전달
      // 실제 검증은 App.ts의 콜백에서 처리됨
      this.isCompleted = true;
      this.callbacks.onComplete(code);
      // 성공 시 모달은 콜백에서 닫음
    } catch (error: any) {
      console.error('2FA verify error:', error);
      DOMUpdater.showError('#verification-error', 
        error.message || 'Invalid code. Please try again.'
      );
    } finally {
      DOMUpdater.toggleLoading('#verify-btn', false);
    }
  }

  private async handleDisable(): Promise<void> {
    const codeInput = document.querySelector('#verification-code-input') as HTMLInputElement;
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
      DOMUpdater.showError('#verification-error', 'Please enter a 6-digit code');
      return;
    }

    DOMUpdater.toggleLoading('#disable-btn', true, 'Disabling...');
    
    try {
      await this.apiClient.auth.disableTwoFA({ token: code });
      
      // 2FA 비활성화 성공 시 사용자 데이터 새로고침
      await this.refreshUserData();
      
      this.isCompleted = true;
      this.callbacks.onComplete(code);
      this.hide();
      
      // onClose에서 이미 포커스 복원하므로 여기서는 중복 호출하지 않음
    } catch (error: any) {
      console.error('2FA disable error:', error);
      DOMUpdater.showError('#verification-error', 
        error.message || 'Invalid code. Please try again.'
      );
    } finally {
      DOMUpdater.toggleLoading('#disable-btn', false);
    }
  }

  private handleCancel(): void {
    this.isCompleted = true; // 명시적 취소이므로 onClose에서 중복 호출 방지
    this.callbacks.onCancel();
    this.hide();
  }

  /**
   * 사용자 데이터 새로고침 (2FA 상태 변경 후 UI 업데이트용)
   */
  private async refreshUserData(): Promise<void> {
    try {
      console.log('[TwoFAModal] Refreshing user data after 2FA status change...');
      const currentUserBefore = authStore.getCurrentUser();
      console.log('[TwoFAModal] User 2FA status before refresh:', currentUserBefore?.twoFactorEnabled);
      
      const updatedUser = await this.apiClient.user.getProfile();
      console.log('[TwoFAModal] Fetched updated user data, 2FA status:', updatedUser.twoFactorEnabled);
      
      authStore.updateUser(updatedUser);
      
      const currentUserAfter = authStore.getCurrentUser();
      console.log('[TwoFAModal] User 2FA status after authStore update:', currentUserAfter?.twoFactorEnabled);
      
      // 강제 UI 업데이트 트리거 (여러 방법 시도)
      setTimeout(() => {
        console.log('[TwoFAModal] Triggering UI updates...');
        
        // 방법 1: 커스텀 이벤트 (안전한 방법)
        const event = new CustomEvent('userDataUpdated', { detail: { user: updatedUser } });
        window.dispatchEvent(event);
        
        // 직접 DOM 조작은 부작용이 클 수 있으므로 비활성화
        // authStore 업데이트와 커스텀 이벤트로 충분함
      }, 100);
      
      console.log('[TwoFAModal] User data refreshed successfully');
    } catch (error) {
      console.error('[TwoFAModal] Failed to refresh user data:', error);
      // 사용자 데이터 새로고침 실패해도 2FA 작업 자체는 성공한 상태이므로 에러를 throw하지 않음
    }
  }

  /**
   * UI의 2FA 상태를 직접 업데이트 (fallback 메커니즘)
   */
  private updateUI2FAStatus(isEnabled: boolean): void {
    try {
      console.log('[TwoFAModal] Updating UI 2FA status directly:', isEnabled);
      
      // UserProfile 영역으로 범위를 제한하여 더 정확하게 찾기
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) {
        console.warn('[TwoFAModal] Main content not found');
        return;
      }
      
      // 2FA 상태 텍스트를 더 정확하게 찾기
      const statusElements = mainContent.querySelectorAll('*');
      statusElements.forEach(element => {
        const textContent = element.textContent?.trim();
        
        // 정확히 "2FA Enabled" 또는 "2FA Disabled" 패턴만 매치
        if (textContent && /^2FA (Enabled|Disabled)(\s|$)/.test(textContent)) {
          const newText = `2FA ${isEnabled ? 'Enabled' : 'Disabled'}`;
          if (element.innerHTML && element.children.length === 0) { // 텍스트 노드만 있는 요소
            element.textContent = newText;
            console.log('[TwoFAModal] Updated 2FA text in element');
          }
        }
      });
      
      // 2FA 상태 표시 점(dot) 업데이트 - 더 정확한 선택자 사용
      const statusSection = mainContent.querySelector('*[class*="items-center"]:has(*[class*="bg-terminal-"]):has(*:contains("2FA"))');
      if (statusSection) {
        const statusDot = statusSection.querySelector('.bg-terminal-green, .bg-terminal-red');
        if (statusDot) {
          statusDot.classList.remove('bg-terminal-green', 'bg-terminal-red');
          statusDot.classList.add(isEnabled ? 'bg-terminal-green' : 'bg-terminal-red');
          console.log('[TwoFAModal] Updated 2FA status dot');
        }
      }
      
    } catch (error) {
      console.error('[TwoFAModal] Failed to update UI 2FA status directly:', error);
    }
  }

  /**
   * 터미널 포커스 복원
   */
  private restoreTerminalFocus(): void {
    try {
      console.log('[TwoFAModal] Restoring terminal focus...');
      
      // 터미널 입력 필드를 찾아서 포커스
      setTimeout(() => {
        const terminalInput = document.querySelector('input[type="text"]:not([id])') as HTMLInputElement;
        if (terminalInput) {
          terminalInput.focus();
          console.log('[TwoFAModal] Terminal focus restored');
        } else {
          console.warn('[TwoFAModal] Terminal input not found');
        }
      }, 250); // 모달 애니메이션 완료 후
      
    } catch (error) {
      console.error('[TwoFAModal] Failed to restore terminal focus:', error);
    }
  }
}
