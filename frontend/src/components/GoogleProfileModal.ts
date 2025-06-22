import { ApiClient } from '../services/ApiClient.js';
import { User } from '../types/types.js';
import { validateNickname } from '../utils/validators.js';
import { BaseModal } from './BaseModal.js';

export interface GoogleProfileData {
  email: string;
  name: string;
  picture: string;
  id: string;
}

export class GoogleProfileModal extends BaseModal {
  private apiClient: ApiClient;
  private googleProfile: GoogleProfileData;
  private onComplete: (user: User) => void;
  private onCancel: () => void;

  constructor(
    apiClient: ApiClient, 
    googleProfile: GoogleProfileData,
    onComplete: (user: User) => void,
    onCancel: () => void = () => {}
  ) {
    super();
    this.apiClient = apiClient;
    this.googleProfile = googleProfile;
    this.onComplete = onComplete;
    this.onCancel = onCancel;
  }

  protected onShow(): void {
    this.focusInput('nickname-input');
    // Select the text as well
    setTimeout(() => {
      const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;
      nicknameInput?.select();
    }, 150);
  }

  protected onClose(): void {
    this.onCancel();
  }

  protected setupModal(): void {
    super.setupModal();
    this.contentElement.className =
      'bg-terminal-black border border-terminal-gray p-8 rounded-lg w-[500px] max-w-[95%] max-h-[90vh] overflow-y-auto flex flex-col';
  }

  protected render(): void {
    this.contentElement.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-terminal-green text-xl font-bold">Complete Your Profile</h3>
        <button class="text-terminal-gray hover:text-terminal-green transition-all" id="close-btn">
          ✕
        </button>
      </div>
      
      <div class="space-y-6">
        <div class="text-center mb-6">
          <div class="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-terminal-green overflow-hidden bg-terminal-gray">
            <img 
              src="${this.googleProfile.picture}" 
              alt="Profile" 
              class="w-full h-full object-cover"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >
            <div class="w-full h-full bg-terminal-gray bg-opacity-20 flex items-center justify-center text-terminal-green text-2xl" style="display: none;">
              ${this.googleProfile.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <p class="text-terminal-green text-lg font-medium mb-2">
            Welcome, ${this.googleProfile.name}!
          </p>
          <p class="text-terminal-gray text-sm">
            Please review and confirm your profile information to complete your registration.
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Email</label>
          <div class="w-full px-4 py-3 bg-terminal-gray bg-opacity-10 border border-terminal-gray rounded-lg text-terminal-gray">
            ${this.googleProfile.email}
          </div>
          <div class="text-xs text-terminal-gray mt-1">Email is provided by Google and cannot be changed</div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Username/Nickname</label>
          <input 
            type="text" 
            id="nickname-input" 
            class="w-full px-4 py-3 bg-terminal-black border border-terminal-gray rounded-lg text-terminal-green focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            value="${this.googleProfile.name}"
            maxlength="20"
            autocomplete="off"
            placeholder="Choose your display name"
          />
          <div class="text-xs text-terminal-red mt-1 hidden" id="nickname-error"></div>
          <div class="text-xs text-terminal-green mt-1 hidden" id="nickname-success">✓ Username is available</div>
          <div class="text-xs text-terminal-gray mt-1">This will be your display name in the game</div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-terminal-green">Profile Picture</label>
          <div class="flex items-center gap-4 p-4 border border-terminal-gray rounded-lg">
            <div class="w-16 h-16 rounded-full border border-terminal-gray overflow-hidden bg-terminal-gray bg-opacity-20">
              <img 
                src="${this.googleProfile.picture}" 
                alt="Avatar" 
                class="w-full h-full object-cover"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              >
              <div class="w-full h-full bg-terminal-gray bg-opacity-20 flex items-center justify-center text-terminal-green text-xl" style="display: none;">
                ${this.googleProfile.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div class="flex-1">
              <div class="text-sm text-terminal-green mb-1">Your Google profile picture will be used</div>
              <div class="text-xs text-terminal-gray">You can change this later in your profile settings</div>
            </div>
          </div>
        </div>
        
        <div id="general-error" class="text-terminal-red text-sm text-center hidden"></div>
        
        <div class="flex justify-end gap-3 pt-4">
          <button class="px-6 py-3 border border-terminal-gray text-terminal-gray rounded-lg hover:bg-terminal-gray hover:bg-opacity-10 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-gray" id="cancel-btn">
            Cancel
          </button>
          <button class="px-6 py-3 bg-terminal-green text-terminal-black rounded-lg font-medium hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-terminal-black" id="complete-btn">
            Complete Registration
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const closeBtn = this.contentElement.querySelector('#close-btn');
    const cancelBtn = this.contentElement.querySelector('#cancel-btn');
    const completeBtn = this.contentElement.querySelector('#complete-btn');
    const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Real-time nickname validation
    nicknameInput.addEventListener('blur', () => this.validateNicknameWithServer());
    nicknameInput.addEventListener('input', () => this.hideFieldError('nickname'));

    const handleComplete = async () => {
      const nickname = nicknameInput?.value.trim();
      if (!nickname) {
        this.showNicknameError('Please enter a valid nickname');
        return;
      }

      // Validate nickname format
      const validation = validateNickname(nickname);
      if (!this.handleValidationResult('nickname', validation)) {
        return;
      }

      try {
        // Check nickname availability
        this.setModalLoading(true, 'Checking nickname availability...');
        const nicknameExists = await this.apiClient.auth.checkNicknameExists(nickname);
        if (nicknameExists) {
          this.showFieldError('nickname', 'This nickname is already taken. Please choose another one.');
          this.setModalLoading(false);
          return;
        }

        // Complete Google OAuth with profile data
        this.setModalLoading(true, 'Completing registration...');
        const user = await this.completeGoogleRegistration(nickname);
        
        this.close();
        this.onComplete(user);
      } catch (error) {
        this.handleError(error, 'GoogleProfileModal.handleComplete', 'Registration failed. Please try again.');
        this.setModalLoading(false);
      }
    };

    completeBtn?.addEventListener('click', handleComplete);
    nicknameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleComplete();
      }
    });
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
        this.showFieldError('nickname', 'This nickname is already taken');
        return false;
      } else {
        this.showFieldSuccess('nickname', 'Nickname is available');
        return true;
      }
    } catch (error) {
      this.handleError(error, 'GoogleProfileModal.validateNicknameWithServer');
      this.showFieldError('nickname', 'Unable to verify nickname. Please try again.');
      return false;
    }
  }

  private async completeGoogleRegistration(nickname: string): Promise<User> {
    // In a real implementation, this would call a specific endpoint to finalize
    // the Google OAuth registration with the chosen nickname
    
    // For now, we'll simulate the OAuth callback and update the user profile
    let user = await this.apiClient.auth.handleOAuthCallback();
    
    if (!user) {
      throw new ApiError(500, 'Registration failed', { message: 'Failed to complete Google registration' });
    }

    // Update the user with the chosen nickname if different
    if (user.nickname !== nickname) {
      try {
        await this.apiClient.user.updateNickname(nickname);
        user.nickname = nickname;
        user.username = nickname;
      } catch (error) {
        console.warn('Failed to update nickname after Google registration:', error);
        // Continue with the original name if update fails
      }
    }

    return user;
  }

  private setModalLoading(loading: boolean, message?: string): void {
    this.setButtonLoading('complete-btn', loading, message || 'Processing...');
    this.setButtonLoading('cancel-btn', loading);
    
    const nicknameInput = this.contentElement.querySelector('#nickname-input') as HTMLInputElement;
    if (nicknameInput) {
      nicknameInput.disabled = loading;
    }
  }
}