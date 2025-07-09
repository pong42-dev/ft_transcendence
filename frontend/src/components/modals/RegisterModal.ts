/**
 * RegisterModal - ModalManager를 사용하는 새로운 회원가입 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { User } from '../../types/types.js';
import { validateEmail, validatePassword, validateNickname } from '../../utils/validators.js';
import { ModalManager, ModalContent } from '../../managers/ModalManager.js';
import { DOMUpdater } from '../../utils/DOMUpdater.js';
import i18n from '../../services/i18n';

export interface RegisterModalCallbacks {
  onRegisterSuccess: (user: User, avatarFile?: File) => void;
  onSwitchToLogin: () => void;
  on2FARequired: (tmpToken: string) => void;
}

export class RegisterModal {
  private apiClient: ApiClient;
  private callbacks: RegisterModalCallbacks;
  private modalManager: ModalManager;
  private isSubmitting: boolean = false;
  private selectedAvatarFile: File | null = null;
  private debounceTimers: Map<string, number> = new Map();
  private validationStates: Map<string, { isValid: boolean; isChecking: boolean }> = new Map();

  constructor(apiClient: ApiClient, callbacks: RegisterModalCallbacks) {
    this.apiClient = apiClient;
    this.callbacks = callbacks;
    this.modalManager = ModalManager.getInstance();
  }

  /**
   * 모달 표시
   */
  public show(): void {
    const modalContent: ModalContent = {
      title: undefined,
      content: () => this.createContent(),
      onShow: () => this.onShow(),
      onClose: () => this.onClose(),
      config: {
        closable: true, // ESC 키로 닫을 수 있도록 변경
        closeOnOutsideClick: true,
        sizeClass: 'w-[450px] max-w-[95%] max-h-[90vh] overflow-hidden',
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
    container.className = 'overflow-y-auto scrollbar-hide max-h-[calc(90vh-8rem)] px-1';
    container.innerHTML = `
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h2 class="text-2xl font-bold text-terminal-green mb-2">${i18n.t('registerModal.create_account')}</h2>
          <p class="text-terminal-gray">${i18n.t('registerModal.join_community')}</p>
        </div>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <form class="space-y-6" id="register-form">
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('registerModal.email')}</label>
          <input 
            type="email" 
            id="email-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('registerModal.enter_email')}"
            autocomplete="email"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="email-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('registerModal.password')}</label>
          <input 
            type="password" 
            id="password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('registerModal.enter_password')}"
            autocomplete="new-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="password-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('registerModal.confirm_password')}</label>
          <input 
            type="password" 
            id="confirm-password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('registerModal.confirm_your_password')}"
            autocomplete="new-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="confirm-password-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('registerModal.username')}</label>
          <input 
            type="text" 
            id="name-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="${i18n.t('registerModal.enter_username')}"
            autocomplete="username"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="name-error"></div>
        </div>
        
        <!-- Avatar Upload Section -->
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">${i18n.t('registerModal.profile_picture_optional')}</label>
          <div class="flex items-center space-x-4">
            <!-- Avatar Preview -->
            <div class="w-16 h-16 rounded-full bg-terminal-gray bg-opacity-20 border border-terminal-gray flex items-center justify-center overflow-hidden">
              <div id="avatar-preview" class="w-full h-full flex items-center justify-center">
                <svg class="w-8 h-8 text-terminal-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
            </div>
            
            <!-- Upload Button -->
            <div class="flex-1">
              <input 
                type="file" 
                id="avatar-input" 
                class="hidden" 
                accept="image/*"
              />
              <button 
                type="button"
                id="avatar-upload-btn"
                class="px-4 py-2 text-sm border border-terminal-gray text-terminal-green rounded hover:bg-terminal-gray hover:bg-opacity-10 transition-colors"
              >
                ${i18n.t('registerModal.choose_image')}
              </button>
              <button 
                type="button"
                id="avatar-remove-btn"
                class="ml-2 px-4 py-2 text-sm text-terminal-red hover:bg-terminal-red hover:bg-opacity-10 transition-colors hidden"
              >
                ${i18n.t('common.remove')}
              </button>
            </div>
          </div>
          <div class="text-xs text-terminal-gray mt-1">
            ${i18n.t('registerModal.file_size_formats')}
          </div>
          <div class="text-xs text-terminal-red mt-1 hidden" id="avatar-error"></div>
        </div>
        
        <div id="general-error" class="text-terminal-red text-sm text-center hidden"></div>
        
        <button 
          type="submit" 
          id="register-btn"
          class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black"
        >
          ${i18n.t('registerModal.create_account')}
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
          id="google-register-btn"
          class="w-full bg-terminal-black border border-terminal-gray text-terminal-green py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-20 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black flex items-center justify-center gap-3"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          ${i18n.t('registerModal.sign_up_with_google')}
        </button>
        
        <button 
          id="login-btn"
          class="w-full text-terminal-green hover:text-terminal-green hover:bg-terminal-green hover:bg-opacity-10 py-3 rounded-lg font-medium transition-all"
        >
          ${i18n.t('registerModal.already_have_account_signin')}
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
    const form = container.querySelector('#register-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Google 회원가입
    const googleBtn = container.querySelector('#google-register-btn');
    googleBtn?.addEventListener('click', () => this.handleGoogleRegister());

    // 로그인 전환
    const loginBtn = container.querySelector('#login-btn');
    loginBtn?.addEventListener('click', () => this.handleSwitchToLogin());

    // 아바타 업로드
    const avatarUploadBtn = container.querySelector('#avatar-upload-btn');
    const avatarInput = container.querySelector('#avatar-input') as HTMLInputElement;
    const avatarRemoveBtn = container.querySelector('#avatar-remove-btn');

    avatarUploadBtn?.addEventListener('click', () => avatarInput?.click());
    avatarInput?.addEventListener('change', (e) => this.handleAvatarSelect(e));
    avatarRemoveBtn?.addEventListener('click', () => this.handleAvatarRemove());

    // 실시간 검증
    const nameInput = container.querySelector('#name-input') as HTMLInputElement;
    const emailInput = container.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = container.querySelector('#password-input') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('#confirm-password-input') as HTMLInputElement;

    nameInput?.addEventListener('blur', () => this.validateNameWithDuplicateCheck());
    emailInput?.addEventListener('blur', () => this.validateEmailWithDuplicateCheck());
    passwordInput?.addEventListener('blur', () => this.validatePassword());
    confirmPasswordInput?.addEventListener('blur', () => this.validateConfirmPassword());

    // 실시간 중복 체크 (디바운싱) - 이름만
    nameInput?.addEventListener('input', () => this.debouncedValidateNameWithDuplicateCheck());
    // 이메일은 입력 중에는 형식 검증만 수행
    emailInput?.addEventListener('input', () => this.debouncedValidateEmailFormat());

    // 디바운싱된 비밀번호 검증
    passwordInput?.addEventListener('input', () => {
      this.clearDebounceTimer('password');
      this.clearValidationState('password-input');
      
      const timer = setTimeout(() => {
        this.validatePassword();
        // 비밀번호 변경 시 confirm password도 다시 검증 (confirm password에 값이 있는 경우만)
        const confirmPasswordInput = document.querySelector('#confirm-password-input') as HTMLInputElement;
        if (confirmPasswordInput && confirmPasswordInput.value) {
          this.validateConfirmPassword();
        }
      }, 500);
      
      this.debounceTimers.set('password', timer);
    });
    
    // 디바운싱된 비밀번호 확인 검증
    confirmPasswordInput?.addEventListener('input', () => {
      this.clearDebounceTimer('confirm-password');
      this.clearValidationState('confirm-password-input');
      
      const timer = setTimeout(() => {
        this.validateConfirmPassword();
      }, 500);
      
      this.debounceTimers.set('confirm-password', timer);
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

    // 검증 중인 필드가 있으면 대기
    const isAnyFieldChecking = Array.from(this.validationStates.values()).some(state => state.isChecking);
    if (isAnyFieldChecking) {
      this.showGeneralError(i18n.t('registerModal.please_wait_validation'));
      return;
    }

    // 폼 검증
    const isValid = await this.validateForm();
    if (!isValid) return;

    this.isSubmitting = true;
    DOMUpdater.toggleLoading('#register-btn', true, i18n.t('registerModal.creating_account'));
    this.hideGeneralError();

    try {
      const nameInput = document.querySelector('#name-input') as HTMLInputElement;
      const emailInput = document.querySelector('#email-input') as HTMLInputElement;
      const passwordInput = document.querySelector('#password-input') as HTMLInputElement;

      const response = await this.apiClient.auth.register(
        emailInput.value.trim(),
        passwordInput.value,
        nameInput.value.trim()
      );

      // 회원가입 성공 - 아바타 파일과 함께 콜백 호출
      this.callbacks.onRegisterSuccess(response, this.selectedAvatarFile || undefined);
      
      this.hide();
    } catch (error: any) {
      console.error('Registration error:', error);
      this.showGeneralError(
        error.message || i18n.t('registerModal.registration_failed_try_again')
      );
    } finally {
      this.isSubmitting = false;
      DOMUpdater.toggleLoading('#register-btn', false);
    }
  }

  /**
   * Google 회원가입 처리
   */
  private handleGoogleRegister(): void {
    try {
      // AuthApiService의 loginWithGoogle 메서드 사용 (회원가입도 같은 엔드포인트)
      this.apiClient.auth.loginWithGoogle();
    } catch (error) {
      console.error('Google registration initiation failed:', error);
      this.showGeneralError(i18n.t('registerModal.failed_initiate_google_registration'));
    }
  }

  /**
   * 로그인 모달로 전환
   */
  private handleSwitchToLogin(): void {
    this.hide();
    this.callbacks.onSwitchToLogin();
  }


  /**
   * 사용자명 검증 + 중복 체크
   */
  private async validateNameWithDuplicateCheck(): Promise<boolean> {
    const nameInput = document.querySelector('#name-input') as HTMLInputElement;
    const name = nameInput.value.trim();
    
    if (!name) {
      const result = { isValid: false, message: i18n.t('validation.nickname_required') };
      DOMUpdater.updateValidationResult('name-input', result);
      this.validationStates.set('name', { isValid: false, isChecking: false });
      return false;
    }
    
    // 1. 형식 검증
    const formatResult = validateNickname(name);
    if (!formatResult.isValid) {
      DOMUpdater.updateValidationResult('name-input', { isValid: formatResult.isValid, message: i18n.t(formatResult.error || 'validation.unknown_error_format') });
      this.validationStates.set('name', { isValid: false, isChecking: false });
      return false;
    }
    
    // 2. 중복 체크
    this.validationStates.set('name', { isValid: false, isChecking: true });
    this.showValidationLoading('name-input', i18n.t('validation.checking_availability'));
    
    try {
      const isDuplicate = await this.apiClient.auth.checkNicknameExists(name);
      
      if (isDuplicate) {
        const result = { isValid: false, message: i18n.t('validation.username_already_taken') };
        DOMUpdater.updateValidationResult('name-input', result);
        
        this.validationStates.set('name', { isValid: false, isChecking: false });
        return false;
      } else {
        this.showValidationSuccess('name-input', i18n.t('validation.username_available'));
        this.validationStates.set('name', { isValid: true, isChecking: false });
        return true;
      }
    } catch (error) {
      console.error('Name duplicate check error:', error);
      const result = { isValid: false, message: i18n.t('validation.unable_to_check_availability') };
      DOMUpdater.updateValidationResult('name-input', result);
      this.validationStates.set('name', { isValid: false, isChecking: false });
      return false;
    }
  }

  /**
   * 이메일 검증 + 중복 체크
   */
  private async validateEmailWithDuplicateCheck(): Promise<boolean> {
    const emailInput = document.querySelector('#email-input') as HTMLInputElement;
    const email = emailInput.value.trim();
    
    if (!email) {
      const result = { isValid: false, message: i18n.t('validation.email_required') };
      DOMUpdater.updateValidationResult('email-input', result);
      this.validationStates.set('email', { isValid: false, isChecking: false });
      return false;
    }
    
    // 1. 형식 검증
    const formatResult = validateEmail(email);
    if (!formatResult.isValid) {
      DOMUpdater.updateValidationResult('email-input', { isValid: formatResult.isValid, message: i18n.t(formatResult.error || 'validation.unknown_error_format') });
      this.validationStates.set('email', { isValid: false, isChecking: false });
      return false;
    }
    
    // 2. 중복 체크
    this.validationStates.set('email', { isValid: false, isChecking: true });
    this.showValidationLoading('email-input', i18n.t('validation.checking_availability'));
    
    try {
      const isDuplicate = await this.apiClient.auth.checkEmailExists(email);
      
      if (isDuplicate) {
        const result = { isValid: false, message: i18n.t('validation.email_already_registered') };
        DOMUpdater.updateValidationResult('email-input', result);
        
        this.validationStates.set('email', { isValid: false, isChecking: false });
        return false;
      } else {
        this.showValidationSuccess('email-input', i18n.t('validation.email_available'));
        this.validationStates.set('email', { isValid: true, isChecking: false });
        return true;
      }
    } catch (error) {
      console.error('Email duplicate check error:', error);
      const result = { isValid: false, message: i18n.t('validation.unable_to_check_availability') };
      DOMUpdater.updateValidationResult('email-input', result);
      this.validationStates.set('email', { isValid: false, isChecking: false });
      return false;
    }
  }

  /**
   * 디바운싱된 사용자명 검증
   */
  private debouncedValidateNameWithDuplicateCheck(): void {
    this.clearDebounceTimer('name');
    
    // 입력 중이면 기존 메시지 지우기
    const nameInput = document.querySelector('#name-input') as HTMLInputElement;
    if (nameInput && nameInput.value.trim()) {
      this.clearValidationState('name-input');
    }
    
    const timer = setTimeout(() => {
      // 형식 검증을 먼저 통과한 경우에만 중복 체크 실행
      const name = nameInput?.value.trim();
      if (name) {
        const formatResult = validateNickname(name);
        if (formatResult.isValid) {
          // 형식이 올바른 경우에만 중복 체크 수행
          this.validateNameWithDuplicateCheck();
        } else {
          // 형식이 틀렸으면 형식 에러만 표시
          if (formatResult.error) {
            const errorElement = document.querySelector('#name-error') as HTMLElement;
            const inputElement = document.querySelector('#name-input') as HTMLInputElement;
            
            if (errorElement) {
              errorElement.textContent = formatResult.error;
              errorElement.classList.remove('hidden');
              errorElement.classList.add('text-terminal-red');
              errorElement.classList.remove('text-terminal-gray', 'text-terminal-green');
            }
            
            if (inputElement) {
              inputElement.classList.add('border-terminal-red');
              inputElement.classList.remove('border-terminal-gray', 'border-terminal-green');
            }
          }
        }
      }
    }, 500);
    
    this.debounceTimers.set('name', timer);
  }

  /**
   * 디바운싱된 이메일 형식 검증만 수행 (중복 체크 없음)
   */
  private debouncedValidateEmailFormat(): void {
    this.clearDebounceTimer('email-format');
    
    // 입력 중이면 기존 메시지 지우기
    const emailInput = document.querySelector('#email-input') as HTMLInputElement;
    if (emailInput && emailInput.value.trim()) {
      this.clearValidationState('email-input');
    }
    
    const timer = setTimeout(() => {
      const email = emailInput?.value.trim();
      if (email) {
        const formatResult = validateEmail(email);
        if (!formatResult.isValid && formatResult.error) {
          // 형식이 틀렸으면 형식 에러만 표시
          const errorElement = document.querySelector('#email-error') as HTMLElement;
          const inputElement = document.querySelector('#email-input') as HTMLInputElement;
          
          if (errorElement) {
            errorElement.textContent = formatResult.error;
            errorElement.classList.remove('hidden');
            errorElement.classList.add('text-terminal-red');
            errorElement.classList.remove('text-terminal-gray', 'text-terminal-green');
          }
          
          if (inputElement) {
            inputElement.classList.add('border-terminal-red');
            inputElement.classList.remove('border-terminal-gray', 'border-terminal-green');
          }
        }
        // 형식이 올바르면 아무것도 표시하지 않음 (중복 체크는 blur에서만)
      }
    }, 1000); // 1초로 늘려서 사용자가 입력을 완료할 시간을 줌
    
    this.debounceTimers.set('email-format', timer);
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
   * 검증 로딩 상태 표시
   */
  private showValidationLoading(inputId: string, message: string): void {
    // inputId가 'name-input'이면 errorId는 'name-error'
    const errorId = inputId.replace('-input', '-error');
    const errorElement = document.querySelector(`#${errorId}`) as HTMLElement;
    const inputElement = document.querySelector(`#${inputId}`) as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      errorElement.classList.add('text-terminal-gray');
      errorElement.classList.remove('text-terminal-red', 'text-terminal-green');
    }
    
    if (inputElement) {
      inputElement.classList.add('border-terminal-gray');
      inputElement.classList.remove('border-terminal-red', 'border-terminal-green');
    }
  }

  /**
   * 검증 성공 상태 표시
   */
  private showValidationSuccess(inputId: string, message: string): void {
    // inputId가 'name-input'이면 errorId는 'name-error'
    const errorId = inputId.replace('-input', '-error');
    const errorElement = document.querySelector(`#${errorId}`) as HTMLElement;
    const inputElement = document.querySelector(`#${inputId}`) as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      errorElement.classList.add('text-terminal-green');
      errorElement.classList.remove('text-terminal-red', 'text-terminal-gray');
    }
    
    if (inputElement) {
      inputElement.classList.add('border-terminal-green');
      inputElement.classList.remove('border-terminal-red', 'border-terminal-gray');
    }
  }

  /**
   * 검증 상태 초기화
   */
  private clearValidationState(inputId: string): void {
    const errorId = inputId.replace('-input', '-error');
    const errorElement = document.querySelector(`#${errorId}`) as HTMLElement;
    const inputElement = document.querySelector(`#${inputId}`) as HTMLInputElement;
    
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.textContent = '';
      errorElement.classList.remove('text-terminal-red', 'text-terminal-green', 'text-terminal-gray');
    }
    
    if (inputElement) {
      inputElement.classList.remove('border-terminal-red', 'border-terminal-green');
      inputElement.classList.add('border-terminal-gray');
    }
  }

  /**
   * 비밀번호 검증 (최적화된 방식)
   * - 프론트엔드: 실시간 사용자 피드백
   * - 백엔드: 최종 검증만 담당
   */
  private validatePassword(): boolean {
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    const password = passwordInput.value;
    
    // 빈 입력은 검증하지 않음
    if (!password) {
      this.clearValidationState('password-input');
      return false;
    }
    
    // 클라이언트 측에서만 상세 검증 (사용자 경험 향상)
    const result = validatePassword(password);
    
    // 간소화된 DOM 업데이트
    this.updatePasswordValidationUI(result);
    
    return result.isValid;
  }

  /**
   * 비밀번호 검증 UI 업데이트 (코드 분리)
   */
  private updatePasswordValidationUI(result: { isValid: boolean; error?: string }): void {
    const errorElement = document.querySelector('#password-error') as HTMLElement;
    const inputElement = document.querySelector('#password-input') as HTMLInputElement;
    
    if (!errorElement || !inputElement) return;
    
    if (!result.isValid && result.error) {
      // 에러 상태
      errorElement.textContent = result.error;
      errorElement.classList.remove('hidden', 'text-terminal-green', 'text-terminal-gray');
      errorElement.classList.add('text-terminal-red');
      
      inputElement.classList.remove('border-terminal-gray', 'border-terminal-green');
      inputElement.classList.add('border-terminal-red');
    } else if (result.isValid) {
      // 성공 상태
      errorElement.textContent = i18n.t('validation.password_meets_requirements');
      errorElement.classList.remove('hidden', 'text-terminal-red', 'text-terminal-gray');
      errorElement.classList.add('text-terminal-green');
      
      inputElement.classList.remove('border-terminal-red', 'border-terminal-gray');
      inputElement.classList.add('border-terminal-green');
    }
  }

  /**
   * 비밀번호 확인 검증
   */
  private validateConfirmPassword(): boolean {
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    const confirmPasswordInput = document.querySelector('#confirm-password-input') as HTMLInputElement;
    
    // 빈 입력이나 비밀번호가 비어있으면 검증하지 않음
    if (!confirmPasswordInput.value || !passwordInput.value) {
      this.clearValidationState('confirm-password-input');
      return false;
    }
    
    const isValid = passwordInput.value === confirmPasswordInput.value;
    const result = {
      isValid,
      message: isValid ? undefined : i18n.t('validation.passwords_do_not_match')
    };
    
    if (!isValid) {
      const result = { isValid: false, message: i18n.t('validation.passwords_do_not_match') };
      DOMUpdater.updateValidationResult('confirm-password-input', result);
    } else {
      // 비밀번호가 일치하는 경우 성공 상태 표시
      this.showValidationSuccess('confirm-password-input', i18n.t('validation.passwords_match'));
    }
    
    return result.isValid;
  }

  /**
   * 전체 폼 검증
   */
  private async validateForm(): Promise<boolean> {
    // 모든 필드에 대해 중복 체크 포함 검증 실행
    const nameValid = await this.validateNameWithDuplicateCheck();
    const emailValid = await this.validateEmailWithDuplicateCheck();
    const passwordValid = this.validatePassword();
    const confirmPasswordValid = this.validateConfirmPassword();
    
    return nameValid && emailValid && passwordValid && confirmPasswordValid;
  }

  /**
   * 필드 에러 제거
   */
  private clearFieldError(fieldType: 'name' | 'email' | 'password' | 'confirm-password'): void {
    const errorElement = document.querySelector(`#${fieldType}-error`) as HTMLElement;
    const inputElement = document.querySelector(`#${fieldType}-input`) as HTMLElement;
    
    if (errorElement) {
      DOMUpdater.hideError(errorElement);
    }
    
    if (inputElement) {
      DOMUpdater.updateClass(inputElement, 'border-terminal-red', false);
      DOMUpdater.updateClass(inputElement, 'border-terminal-gray', true);
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
   * 폼 초기화
   */
  private resetForm(): void {
    const form = document.querySelector('#register-form') as HTMLFormElement;
    form?.reset();
    
    this.hideGeneralError();
    this.clearFieldError('name');
    this.clearFieldError('email');
    this.clearFieldError('password');
    this.clearFieldError('confirm-password');
    
    // 디바운스 타이머 정리
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // 검증 상태 초기화
    this.validationStates.clear();
    
    this.isSubmitting = false;
    this.selectedAvatarFile = null;
    this.resetAvatarPreview();
  }

  /**
   * 아바타 파일 선택 처리
   */
  private handleAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // 파일 크기 검증 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      DOMUpdater.showError('#avatar-error', i18n.t('registerModal.file_size_limit'));
      input.value = '';
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      DOMUpdater.showError('#avatar-error', i18n.t('registerModal.invalid_image_file'));
      input.value = '';
      return;
    }

    this.selectedAvatarFile = file;
    this.showAvatarPreview(file);
    DOMUpdater.hideError('#avatar-error');

    // Remove 버튼 표시
    const removeBtn = document.querySelector('#avatar-remove-btn') as HTMLElement;
    if (removeBtn) {
      removeBtn.classList.remove('hidden');
    }
  }

  /**
   * 아바타 미리보기 표시
   */
  private showAvatarPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.querySelector('#avatar-preview') as HTMLElement;
      if (preview && e.target?.result) {
        preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-full" />`;
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * 아바타 제거 처리
   */
  private handleAvatarRemove(): void {
    this.selectedAvatarFile = null;
    this.resetAvatarPreview();
    
    // 파일 input 초기화
    const input = document.querySelector('#avatar-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }

    // Remove 버튼 숨기기
    const removeBtn = document.querySelector('#avatar-remove-btn') as HTMLElement;
    if (removeBtn) {
      removeBtn.classList.add('hidden');
    }

    DOMUpdater.hideError('#avatar-error');
  }

  /**
   * 아바타 미리보기 초기화
   */
  private resetAvatarPreview(): void {
    const preview = document.querySelector('#avatar-preview') as HTMLElement;
    if (preview) {
      preview.innerHTML = `
        <svg class="w-8 h-8 text-terminal-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      `;
    }
  }
}
