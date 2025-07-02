/**
 * RegisterModal - ModalManager를 사용하는 새로운 회원가입 모달
 */

import { ApiClient } from '../../services/ApiClient.js';
import { User } from '../../types/types.js';
import { validateEmail, validatePassword, validateNickname } from '../../utils/validators.js';
import { ModalManager, ModalContent } from './ModalManager.js';
import { DOMUpdater } from './DOMUpdater.js';

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
        closable: false,
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
    container.className = 'overflow-y-auto max-h-[calc(90vh-8rem)] px-1';
    container.innerHTML = `
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h2 class="text-2xl font-bold text-terminal-green mb-2">Create Account</h2>
          <p class="text-terminal-gray">Join our community</p>
        </div>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <form class="space-y-6" id="register-form">
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Email</label>
          <input 
            type="email" 
            id="email-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Enter your email"
            autocomplete="email"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="email-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Password</label>
          <input 
            type="password" 
            id="password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Enter your password"
            autocomplete="new-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="password-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Confirm Password</label>
          <input 
            type="password" 
            id="confirm-password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Confirm your password"
            autocomplete="new-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="confirm-password-error"></div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Username</label>
          <input 
            type="text" 
            id="name-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Enter your username"
            autocomplete="username"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="name-error"></div>
        </div>
        
        <!-- Avatar Upload Section -->
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Profile Picture (Optional)</label>
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
                Choose Image
              </button>
              <button 
                type="button"
                id="avatar-remove-btn"
                class="ml-2 px-4 py-2 text-sm text-terminal-red hover:bg-terminal-red hover:bg-opacity-10 transition-colors hidden"
              >
                Remove
              </button>
            </div>
          </div>
          <div class="text-xs text-terminal-gray mt-1">
            Max file size: 5MB. Supported formats: JPG, PNG, GIF
          </div>
          <div class="text-xs text-terminal-red mt-1 hidden" id="avatar-error"></div>
        </div>
        
        <div id="general-error" class="text-terminal-red text-sm text-center hidden"></div>
        
        <button 
          type="submit" 
          id="register-btn"
          class="w-full bg-terminal-green text-terminal-black py-3 rounded-lg font-medium hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black"
        >
          Create Account
        </button>
      </form>
      
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-terminal-gray"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-terminal-black text-terminal-gray">OR</span>
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
          Sign up with Google
        </button>
        
        <button 
          id="login-btn"
          class="w-full text-terminal-green hover:text-terminal-green hover:bg-terminal-green hover:bg-opacity-10 py-3 rounded-lg font-medium transition-all"
        >
          Already have an account? Sign in
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

    nameInput?.addEventListener('blur', () => this.validateName());
    emailInput?.addEventListener('blur', () => this.validateEmail());
    passwordInput?.addEventListener('blur', () => this.validatePassword());
    confirmPasswordInput?.addEventListener('blur', () => this.validateConfirmPassword());

    // 에러 제거 (입력 시)
    nameInput?.addEventListener('input', () => this.clearFieldError('name'));
    emailInput?.addEventListener('input', () => this.clearFieldError('email'));
    passwordInput?.addEventListener('input', () => this.clearFieldError('password'));
    confirmPasswordInput?.addEventListener('input', () => this.clearFieldError('confirm-password'));
  }

  /**
   * 모달이 표시될 때 호출
   */
  private onShow(): void {
    this.modalManager.focusElement('#name-input');
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
    DOMUpdater.toggleLoading('#register-btn', true, 'Creating account...');
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
        error.message || 'Registration failed. Please try again.'
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
    window.location.href = '/api/users/login/google';
  }

  /**
   * 로그인 모달로 전환
   */
  private handleSwitchToLogin(): void {
    this.hide();
    this.callbacks.onSwitchToLogin();
  }

  /**
   * 사용자명 검증
   */
  private validateName(): boolean {
    const nameInput = document.querySelector('#name-input') as HTMLInputElement;
    const result = validateNickname(nameInput.value);
    
    DOMUpdater.updateValidationResult('name-input', result);
    return result.isValid;
  }

  /**
   * 이메일 검증
   */
  private validateEmail(): boolean {
    const emailInput = document.querySelector('#email-input') as HTMLInputElement;
    const result = validateEmail(emailInput.value);
    
    DOMUpdater.updateValidationResult('email-input', result);
    return result.isValid;
  }

  /**
   * 비밀번호 검증
   */
  private validatePassword(): boolean {
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    const result = validatePassword(passwordInput.value);
    
    DOMUpdater.updateValidationResult('password-input', result);
    return result.isValid;
  }

  /**
   * 비밀번호 확인 검증
   */
  private validateConfirmPassword(): boolean {
    const passwordInput = document.querySelector('#password-input') as HTMLInputElement;
    const confirmPasswordInput = document.querySelector('#confirm-password-input') as HTMLInputElement;
    
    const isValid = passwordInput.value === confirmPasswordInput.value;
    const result = {
      isValid,
      message: isValid ? undefined : 'Passwords do not match'
    };
    
    DOMUpdater.updateValidationResult('confirm-password-input', result);
    return result.isValid;
  }

  /**
   * 전체 폼 검증
   */
  private validateForm(): boolean {
    const nameValid = this.validateName();
    const emailValid = this.validateEmail();
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
      DOMUpdater.showError('#avatar-error', 'File size must be less than 5MB');
      input.value = '';
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      DOMUpdater.showError('#avatar-error', 'Please select a valid image file');
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
