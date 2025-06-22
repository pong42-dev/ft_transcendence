import { ApiClient } from '../services/ApiClient.js';
import { User } from '../types/types.js';
import { validateEmail, validatePassword } from '../utils/validators.js';
import { BaseModal } from './BaseModal.js';

export class LoginModal extends BaseModal {
  private apiClient: ApiClient;
  private onLoginSuccess: (user: User) => void;
  private onSwitchToRegister: () => void;
  private on2FARequired: (tmpToken: string) => void;

  constructor(
    apiClient: ApiClient,
    onLoginSuccess: (user: User) => void,
    onSwitchToRegister: () => void,
    on2FARequired: (tmpToken: string) => void
  ) {
    super();
    this.apiClient = apiClient;
    this.onLoginSuccess = onLoginSuccess;
    this.onSwitchToRegister = onSwitchToRegister;
    this.on2FARequired = on2FARequired;
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
      'bg-terminal-black border border-terminal-gray p-8 rounded-lg w-[450px] max-w-[95%] overflow-hidden flex flex-col';
  }

  protected canCloseOnOutsideClick(): boolean {
    return false; // Don't close on outside click for login modal
  }

  protected render(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h2 class="text-2xl font-bold text-terminal-green mb-2">Welcome Back</h2>
          <p class="text-terminal-gray">Sign in to your account</p>
        </div>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <form class="space-y-6" id="login-form">
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
          Sign In
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
        id="google-login-btn"
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
        <span class="text-terminal-gray">Don't have an account? </span>
        <button 
          id="switch-to-register-btn"
          class="text-terminal-green hover:underline focus:outline-none"
        >
          Sign up
        </button>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const form = this.contentElement.querySelector('#login-form') as HTMLFormElement;
    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    // const loginBtn = this.contentElement.querySelector('#login-btn') as HTMLButtonElement;
    const googleLoginBtn = this.contentElement.querySelector('#google-login-btn') as HTMLButtonElement;
    const switchToRegisterBtn = this.contentElement.querySelector('#switch-to-register-btn') as HTMLButtonElement;
    const closeBtn = this.contentElement.querySelector('#close-btn') as HTMLButtonElement;

    // Close button
    closeBtn.addEventListener('click', () => this.close());

    // Form validation
    emailInput.addEventListener('blur', () => this.validateEmail());
    passwordInput.addEventListener('blur', () => this.validatePassword());
    emailInput.addEventListener('input', () => this.hideFieldError('email'));
    passwordInput.addEventListener('input', () => this.hideFieldError('password'));

    // Form submission
    form.addEventListener('submit', (e) => this.handleLogin(e));
    
    // Google login
    googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    
    // Switch to register
    switchToRegisterBtn.addEventListener('click', () => {
      this.close();
      this.onSwitchToRegister();
    });

    // Enter key handling
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        passwordInput.focus();
      }
    });
  }

  private validateEmail(): boolean {
    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const email = emailInput.value.trim();
    const validation = validateEmail(email);
    
    return this.handleValidationResult('email', validation);
  }

  private validatePassword(): boolean {
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    const password = passwordInput.value;
    const validation = validatePassword(password);
    
    return this.handleValidationResult('password', validation);
  }

  private setLoading(loading: boolean): void {
    this.setButtonLoading('login-btn', loading, 'Signing in...');
    this.setButtonLoading('google-login-btn', loading);
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    
    this.hideGeneralError();
    
    // Validate fields
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();
    
    if (!emailValid || !passwordValid) {
      return;
    }

    const emailInput = this.contentElement.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = this.contentElement.querySelector('#password-input') as HTMLInputElement;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      this.setLoading(true);
      
      const loginResult = await this.apiClient.auth.login(email, password);
      
      // Check if 2FA is required
      if ('requires2FA' in loginResult) {
        this.close();
        this.on2FARequired(loginResult.tmpToken);
      } else {
        // Regular login success
        this.close();
        this.onLoginSuccess(loginResult);
      }
    } catch (error) {
      this.handleError(error, 'LoginModal.handleLogin', 'Login failed. Please check your credentials and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  private async handleGoogleLogin(): Promise<void> {
    try {
      this.setLoading(true);
      await this.apiClient.auth.loginWithGoogle();
      // Note: This will redirect the page in real environment
      // In mock environment, the redirect is handled in the auth service
    } catch (error) {
      this.handleError(error, 'LoginModal.handleGoogleLogin', 'Google login failed. Please try again.');
      this.setLoading(false);
    }
  }
}