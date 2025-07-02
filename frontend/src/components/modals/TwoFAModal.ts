/**
 * TwoFAModal - ModalManager를 사용하는 2FA 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { TwoFAInitResponse } from '../../types/types.js';
import { ModalManager, ModalContent } from './ModalManager.js';
import { DOMUpdater } from './DOMUpdater.js';

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
        closable: false,
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

    DOMUpdater.toggleLoading('#enable-btn', true, 'Enabling...');
    
    try {
      await this.apiClient.auth.enableTwoFA({
        token: code,
        tmpToken: this.twoFAData.token
      });
      this.isCompleted = true;
      this.callbacks.onComplete(code);
      this.hide();
    } catch (error: any) {
      console.error('2FA enable error:', error);
      DOMUpdater.showError('#verification-error', 
        error.message || 'Invalid code. Please try again.'
      );
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
      this.isCompleted = true;
      this.callbacks.onComplete(code);
      this.hide();
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
}
