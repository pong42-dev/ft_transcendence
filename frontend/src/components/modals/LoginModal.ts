/**
 * LoginModal - ModalManager를 사용하는 새로운 로그인 모달
 * 
 */

import { ApiClient } from '../../services/ApiClient.js';
import { User } from '../../types/types.js';
import { validateEmail, validatePassword } from '../../utils/validators.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import i18n from '../../services/i18n';

export interface LoginModalCallbacks {
  onLoginSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
  on2FARequired: (tmpToken: string) => void;
}

export class LoginModal {
  private apiClient: ApiClient;
  private callbacks: LoginModalCallbacks;
  private modalManager: ModalManager;
  private isSubmitting: boolean = false;
  private debounceTimers: Map<string, number> = new Map();

  constructor(apiClient: ApiClient, callbacks: LoginModalCallbacks) {
    this.apiClient = apiClient;
    this.callbacks = callbacks;
    this.modalManager = ModalManager.getInstance();
  }

  /**
   * 모달 표시
   */
  public show(): void {
    const modalContent: ModalContent = {
      title: undefined, // 커스텀 헤더를 사용하므로 기본 제목 사용 안 함
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true, // ESC 키로 닫을 수 있도록 변경
        closeOnOutsideClick: true,
        sizeClass: 'w-[450px] max-w-[95%]',
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

  /**
   * 모달 콘텐츠 생성
   */
  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h2 class="text-2xl font-bold text-terminal-green mb-2">${i18n.t('loginModal.welcome_back')}</h2>
          <p class="text-terminal-gray">${i18n.t('loginModal.sign_in_account')}</p>
        </div>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <form class="space-y-6" id="login-form">
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('loginModal.email')}</label>
          <input 
            type="email" 
            id="email-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('loginModal.enter_email')}"
            autocomplete="email"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="email-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('loginModal.password')}</label>
          <input 
            type="password" 
            id="password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('loginModal.enter_password')}"
            autocomplete="current-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="password-error"></div>
        </div>
        
        <div id="general-error" class="text-terminal-red text-sm text-center hidden"></div>
        
        <button 
          type="submit" 
          id="login-btn"
          class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black"
        >
          ${i18n.t('loginModal.sign_in')}
        </button>
      </form>
      
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-terminal-gray"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-terminal-black text-terminal-gray">${i18n.t('common.or')}</span>
        </div>
      </div>
      
      <div class="space-y-3">
        <button 
          id="google-login-btn"
          class="w-full bg-terminal-black border border-terminal-gray text-terminal-green py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-20 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black flex items-center justify-center gap-3"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          ${i18n.t('loginModal.continue_with_google')}
        </button>
        
        <button 
          id="register-btn"
          class="w-full text-terminal-green hover:text-terminal-green hover:bg-terminal-green hover:bg-opacity-10 py-3 rounded-lg font-medium transition-all"
        >
          ${i18n.t('loginModal.no_account_signup')}
        </button>
      </div>
    `;

    this.setupEventListeners(container);
    return container;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(container: HTMLElement): void {
    // 닫기 버튼
    const closeBtn = container.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // 폼 제출
    const form = container.querySelector('#login-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Google 로그인
    const googleBtn = container.querySelector('#google-login-btn');
    googleBtn?.addEventListener('click', () => this.handleGoogleLogin());

    // 회원가입 전환
    const registerBtn = container.querySelector('#register-btn');
    registerBtn?.addEventListener('click', () => this.handleSwitchToRegister());

    // 실시간 검증
    const emailInput = container.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = container.querySelector('#password-input') as HTMLInputElement;

    emailInput?.addEventListener('blur', () => this.validateEmail());
    passwordInput?.addEventListener('blur', () => this.validatePassword());

    // 실시간 검증 (debounced)
    emailInput?.addEventListener('input', () => {
      this.hideGeneralError();
      this.debouncedValidateEmail();
    });
    passwordInput?.addEventListener('input', () => {
      this.hideGeneralError();
      this.debouncedValidatePassword();
    });
  }

  /**
   * 모달이 표시될 때 호출
   */
  private onShow(): void {
    this.modalManager.focusElement('#email-input');
  }

  /**
   * 모달이 닫힐 때 호출
   */
  private onClose(): void {
    this.resetForm();
  }

  /**
   * 폼 제출 처리
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (this.isSubmitting) return;

    // 폼 검증
    const isValid = this.validateForm();
    if (!isValid) return;

    this.isSubmitting = true;
    DOMUpdater.toggleLoading('#login-btn', true, i18n.t('loginModal.signing_in'));

    try {
      const emailInput = document.querySelector('#email-input') as HTMLInputElement;
      const passwordInput = document.querySelector('#password-input') as HTMLInputElement;

      const response = await this.apiClient.auth.login(
        emailInput.value.trim(),
        passwordInput.value
      );

      if ('requires2FA' in response && (response as any).requires2FA) {
        this.callbacks.on2FARequired((response as any).tmpToken);
        // 2FA가 필요한 경우 모달을 닫지 않음 - 2FA 완료 후에 닫아야 함
      } else {
        this.callbacks.onLoginSuccess(response as User);
        this.hide();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.showGeneralError(
        error.message || i18n.t('loginModal.login_failed')
      );
    } finally {
      this.isSubmitting = false;
      DOMUpdater.toggleLoading('#login-btn', false);
    }
  }

  /**
   * Google 로그인 처리
   */
  private handleGoogleLogin(): void {
    try {
      // AuthApiService의 loginWithGoogle 메서드 사용
      this.apiClient.auth.loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      this.showGeneralError(i18n.t('loginModal.google_login_failed'));
    }
  }

  /**
   * 회원가입 모달로 전환
   */
  private handleSwitchToRegister(): void {
    // 모달이 완전히 사라진 후 회원가입 모달 표시
    setTimeout(() => {
      this.callbacks.onSwitchToRegister();
    }, 250); // 애니메이션 시간(200ms)보다 조금 더 길게
    
    this.hide();
  }

  /**
   * 이메일 검증
   */
  private validateEmail(): boolean {
    const emailInput = document.querySelector('#email-input') as HTMLInputElement;
    const email = emailInput.value.trim();
    
    if (!email) {
      this.showValidationError('email-input', i18n.t('validation.email_required'));
      return false;
    }
    
    const result = validateEmail(email);
    
    if (!result.isValid) {
      this.showValidationError('email-input', i18n.t(result.error || 'validation.invalid_email'));
    } else {
      this.clearValidationState('email-input');
    }
    
    return result.isValid;
  }

  /**
   * 비밀번호 검증
   */
  private validatePassword(): boolean {
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    const password = passwordInput.value.trim();
    
    if (!password) {
      this.showValidationError('password-input', i18n.t('validation.password_required'));
      return false;
    }
    
    const result = validatePassword(password);
    
    if (!result.isValid) {
      this.showValidationError('password-input', i18n.t(result.error || 'validation.invalid_password'));
    } else {
      this.clearValidationState('password-input');
    }
    
    return result.isValid;
  }

  /**
   * 전체 폼 검증
   */
  private validateForm(): boolean {
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();
    
    return emailValid && passwordValid;
  }

  /**
   * 디바운싱된 이메일 검증
   */
  private debouncedValidateEmail(): void {
    this.clearDebounceTimer('email');
    
    const emailInput = document.querySelector('#email-input') as HTMLInputElement;
    if (!emailInput?.value.trim()) {
      this.clearValidationState('email-input');
      return;
    }
    
    const timer = setTimeout(() => {
      this.validateEmail();
    }, 500);
    
    this.debounceTimers.set('email', timer);
  }

  /**
   * 디바운싱된 비밀번호 검증
   */
  private debouncedValidatePassword(): void {
    this.clearDebounceTimer('password');
    
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    if (!passwordInput?.value.trim()) {
      this.clearValidationState('password-input');
      return;
    }
    
    const timer = setTimeout(() => {
      this.validatePassword();
    }, 500);
    
    this.debounceTimers.set('password', timer);
  }

  /**
   * 디바운스 타이머 정리
   */
  private clearDebounceTimer(field: string): void {
    const timer = this.debounceTimers.get(field);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(field);
    }
  }


  /**
   * 일반 에러 표시
   */
  private showGeneralError(message: string): void {
    DOMUpdater.showError('#general-error', message, { animate: true });
  }

  /**
   * 일반 에러 숨기기
   */
  private hideGeneralError(): void {
    DOMUpdater.hideError('#general-error');
  }

  /**
   * 검증 에러 상태 표시
   */
  private showValidationError(inputId: string, message: string): void {
    const errorId = inputId.replace('-input', '-error');
    DOMUpdater.showError(`#${errorId}`, message, { animate: true });
    DOMUpdater.toggleClasses(`#${errorId}`, ['text-terminal-red'], true);
    DOMUpdater.toggleClasses(`#${errorId}`, ['text-terminal-green', 'text-terminal-gray'], false);
    DOMUpdater.toggleClasses(`#${inputId}`, ['border-terminal-red'], true);
    DOMUpdater.toggleClasses(`#${inputId}`, ['border-terminal-green', 'border-terminal-gray'], false);
  }

  /**
   * 검증 상태 초기화
   */
  private clearValidationState(inputId: string): void {
    const errorId = inputId.replace('-input', '-error');
    DOMUpdater.hideError(`#${errorId}`, { animate: true });
    DOMUpdater.toggleClasses(`#${inputId}`, ['border-terminal-red', 'border-terminal-green'], false);
    DOMUpdater.toggleClasses(`#${inputId}`, ['border-terminal-gray'], true);
  }

  /**
   * 폼 초기화
   */
  private resetForm(): void {
    const form = document.querySelector('#login-form') as HTMLFormElement;
    form?.reset();
    
    this.hideGeneralError();
    this.clearValidationState('email-input');
    this.clearValidationState('password-input');
    
    // 디바운스 타이머 정리
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    this.isSubmitting = false;
  }
}
