import { ApiClient } from '../services/ApiClient.js';
import { User } from '../types/types.js';
import { validateEmail, validatePassword, validateNickname } from '../utils/validators.js';
import { BaseModal } from './BaseModal.js';

export class RegisterModal extends BaseModal {
  private apiClient: ApiClient;
  private onRegisterSuccess: (user: User) => void;
  private onSwitchToLogin: () => void;
  private onGoogleRegisterSuccess: (user: User) => void;

  constructor(
    apiClient: ApiClient,
    onRegisterSuccess: (user: User) => void,
    onSwitchToLogin: () => void,
    onGoogleRegisterSuccess: (user: User) => void
  ) {
    super();
    this.apiClient = apiClient;
    this.onRegisterSuccess = onRegisterSuccess;
    this.onSwitchToLogin = onSwitchToLogin;
    this.onGoogleRegisterSuccess = onGoogleRegisterSuccess;
  }

  protected onShow(): void {
    this.focusInput('email-input');
  }

  protected onClose(): void {
    // No specific cleanup needed
  }

  protected setupModal(): void {
    super.setupModal();
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-8 rounded-lg w-[450px] max-w-[95%] max-h-[90vh] overflow-y-auto flex flex-col';
  }

  protected canCloseOnOutsideClick(): boolean {
    return false; // Don't close on outside click for register modal
  }

  protected render(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h2 class="text-2xl font-bold text-terminal-green mb-2">Create Account</h2>
          <p class="text-terminal-gray">Join the PONG community</p>
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
          <div class="text-xs text-terminal-green mt-1 hidden" id="email-success">✓ Email is available</div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Password</label>
          <input 
            type="password" 
            id="password-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Create a password"
            autocomplete="new-password"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="password-error"></div>
          <div class="text-xs text-terminal-gray mt-1">At least 8 characters with numbers and letters</div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Username/Nickname</label>
          <input 
            type="text" 
            id="nickname-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Choose your username"
            autocomplete="username"
            maxlength="20"
            required
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="nickname-error"></div>
          <div class="text-xs text-terminal-green mt-1 hidden" id="nickname-success">✓ Username is available</div>
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
      
      <button 
        id="google-register-btn"
        class="w-full border border-terminal-gray text-terminal-green py-3 rounded-lg font-medium hover:bg-terminal-gray hover:bg-opacity-10 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-gray flex items-center justify-center gap-3"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      
      <div class="text-center mt-6">
        <span class="text-terminal-gray">Already have an account? </span>
        <button 
          id="switch-to-login-btn"
          class="text-terminal-green hover:underline focus:outline-none"
        >
          Sign in
        </button>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const form = this.contentElement.querySelector('#register-form') as HTMLFormElement;
    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;
    // const registerBtn = this.contentElement.querySelector('#register-btn') as HTMLButtonElement;
    const googleRegisterBtn = this.contentElement.querySelector('#google-register-btn') as HTMLButtonElement;
    const switchToLoginBtn = this.contentElement.querySelector('#switch-to-login-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Close button
    closeBtn.addEventListener('click', () => this.close());

    // Real-time validation
    emailInput.addEventListener('blur', () => this.validateEmailWithServer());
    passwordInput.addEventListener('blur', () => this.validatePassword());
    nicknameInput.addEventListener('blur', () => this.validateNicknameWithServer());
    
    // Clear errors on input
    emailInput.addEventListener('input', () => this.hideFieldError('email'));
    passwordInput.addEventListener('input', () => this.hideFieldError('password'));
    nicknameInput.addEventListener('input', () => this.hideFieldError('nickname'));

    // Form submission
    form.addEventListener('submit', (e) => this.handleRegister(e));
    
    // Google register
    googleRegisterBtn.addEventListener('click', () => this.handleGoogleRegister());
    
    // Switch to login
    switchToLoginBtn.addEventListener('click', () => {
      this.close();
      this.onSwitchToLogin();
    });

    // Enter key handling
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') passwordInput.focus();
    });
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') nicknameInput.focus();
    });
  }

  private async validateEmailWithServer(): Promise<boolean> {
    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const email = emailInput.value.trim();
    
    // First validate format
    const validation = validateEmail(email);
    if (!this.handleValidationResult('email', validation)) {
      return false;
    }
    
    try {
      // Check with server
      this.showFieldLoading('email', 'Checking availability...');
      const exists = await this.apiClient.auth.checkEmailExists(email);
      
      if (exists) {
        this.showFieldError('email', 'This email is already registered');
        return false;
      } else {
        this.showFieldSuccess('email', 'Email is available');
        return true;
      }
    } catch (error) {
      this.handleError(error, 'RegisterModal.validateEmailWithServer');
      this.showFieldError('email', 'Unable to verify email. Please try again.');
      return false;
    }
  }

  private validatePassword(): boolean {
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    const password = passwordInput.value;
    const validation = validatePassword(password);
    
    return this.handleValidationResult('password', validation);
  }

  private async validateNicknameWithServer(): Promise<boolean> {
    const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;
    const nickname = nicknameInput.value.trim();
    
    // First validate format
    const validation = validateNickname(nickname);
    if (!this.handleValidationResult('nickname', validation)) {
      return false;
    }
    
    try {
      // Check with server
      this.showFieldLoading('nickname', 'Checking availability...');
      const exists = await this.apiClient.auth.checkNicknameExists(nickname);
      
      if (exists) {
        this.showFieldError('nickname', 'This username is already taken');
        return false;
      } else {
        this.showFieldSuccess('nickname', 'Username is available');
        return true;
      }
    } catch (error) {
      this.handleError(error, 'RegisterModal.validateNicknameWithServer');
      this.showFieldError('nickname', 'Unable to verify username. Please try again.');
      return false;
    }
  }

  private setLoading(loading: boolean): void {
    this.setButtonLoading('register-btn', loading, 'Creating Account...');
    this.setButtonLoading('google-register-btn', loading);
  }

  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();
    
    this.hideGeneralError();
    
    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const nickname = nicknameInput.value.trim();

    // Validate all fields again
    const emailValid = await this.validateEmailWithServer();
    const passwordValid = this.validatePassword();
    const nicknameValid = await this.validateNicknameWithServer();
    
    if (!emailValid || !passwordValid || !nicknameValid) {
      return;
    }

    try {
      this.setLoading(true);
      
      const user = await this.apiClient.auth.register(email, password, nickname);
      
      this.close();
      this.onRegisterSuccess(user);
    } catch (error) {
      this.handleError(error, 'RegisterModal.handleRegister', 'Registration failed. Please check your information and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  private async handleGoogleRegister(): Promise<void> {
    try {
      this.setLoading(true);
      
      // Mock 환경에서는 즉시 Google 프로필 모달로 이동
      if (this.apiClient.shouldUseMockData()) {
        this.close();
        // Import and show GoogleProfileModal
        const { GoogleProfileModal } = await import('./GoogleProfileModal.js');
        
        // Mock Google profile data
        const mockGoogleProfile = {
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          id: 'google_123456789'
        };
        
        const googleModal = new GoogleProfileModal(
          this.apiClient,
          mockGoogleProfile,
          (user: User) => this.onGoogleRegisterSuccess(user),
          () => this.show() // Return to register modal on cancel
        );
        
        googleModal.show();
      } else {
        // Real environment - redirect to Google OAuth
        await this.apiClient.auth.loginWithGoogle();
      }
    } catch (error) {
      this.handleError(error, 'RegisterModal.handleGoogleRegister', 'Google registration failed. Please try again.');
      this.setLoading(false);
    }
  }
}