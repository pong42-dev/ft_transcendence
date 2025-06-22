import { Terminal } from './Terminal.js';
import { PongGameModular as PongGame } from '../game/PongGameModular.js';
import { ApiClient, ApiError } from '../services/ApiClient.js';
import { UserProfile } from './UserProfile.js';
import { Router } from '../utils/Router.js';
import { validateEmail, validatePassword, validateNickname } from '../utils/validators.js';
import {
  AppState,
  // User,
  // Friend,
  Player
} from '../types/types.js';
import * as Types from '../types/types.js';
import { FileModal } from './FileModal.js';
import { GameSetupModal } from './GameSetupModal.js';
import { GameEndModal } from './GameEndModal.js';
import { FriendModal } from './FriendModal.js';
import { ErrorHandler, ErrorLevel } from '../utils/ErrorHandler.js';

export class App {
  // UI Elements References
  private appElement: HTMLElement;
  // Service Objects
  private apiClient: ApiClient;
  private router: Router;
  private errorHandler: ErrorHandler;
  // Components
  private pongGame: PongGame;
  private userProfile: UserProfile | null = null;
  private mainTerminal: Terminal;
  
  private state: AppState = {
    isLoggedIn: null, // Start in checking state
    currentUser: null,
    isInGame: false,
  };

  // ===== INITIALIZATION METHODS =====
  
  constructor() {
    this.appElement = document.getElementById('app') as HTMLElement;
    this.apiClient = new ApiClient();
    this.router = new Router();
    this.errorHandler = new ErrorHandler();
    
    this.pongGame = new PongGame((winner) => {
      this.handleGameEnd(winner);
    });
    
    this.mainTerminal = new Terminal(this.handleCommand.bind(this));
  }

  public init(): void {
    this.render(); // Show UI immediately (loading state)
    this.setupRouting(); // Routes are safe because DOM exists
    this.checkAuthState(); // Check auth in background
  }

  private async checkAuthState(): Promise<void> {
    // Check for OAuth callback first
    const oauthUser = await this.handleOAuthCallback();
    if (oauthUser) {
      this.state.isLoggedIn = true;
      this.state.currentUser = oauthUser;
      this.render();
      return;
    }

    // Check existing token authentication
    if (this.apiClient.hasAuthToken()) {
      try {
        const user = await this.apiClient.auth.verifyToken();
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
      } catch (error) {
        this.errorHandler.handleError(
          error as Error,
          'App.checkAuthState',
          ErrorLevel.WARNING,
          {
            component: 'App',
            action: 'tokenVerificationFailed'
          }
        );
        this.apiClient.clearToken();
        this.state.isLoggedIn = false;
      }
    } else {
      this.state.isLoggedIn = false;
    }
    
    this.render();
    
    // Show login modal if not logged in
    if (this.state.isLoggedIn === false) {
      this.showLoginModal();
    }
  }

  private async handleOAuthCallback(): Promise<Types.User | null> {
    try {
      // Try to get user info (only works if OAuth callback was successful)
      const user = await this.apiClient.auth.handleOAuthCallback();
      if (user) {
        // Clean up URL if we came from OAuth callback
        const url = new URL(window.location.href);
        if (url.searchParams.has('code') || url.pathname.includes('callback')) {
          window.history.replaceState({}, document.title, '/');
        }
        return user;
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App.handleOAuthCallback',
        ErrorLevel.INFO,
        {
          component: 'App',
          action: 'oauthCallbackFailed'
        }
      );
    }
    return null;
  }

  private setupRouting(): void {
    this.router.register('/', () => this.showMainView());
    this.router.register('/profile', () => this.showCurrentUserProfile());
    this.router.register('/profile/:username', (params) => this.showUserProfile(params?.username || ''));
    this.router.register('/game', () => this.showGameView());
    this.router.register('/game/:mode', (params) => this.showGameMode(params?.mode || ''));
  }

  // ===== ROUTING & NAVIGATION =====

  private showMainView(): void {
    this.state.isInGame = false;
    // If user is logged in, redirect to their profile instead of showing it at root
    if (this.state.isLoggedIn && this.state.currentUser) {
      this.router.navigate('/profile');
      return;
    }
    this.updateMainContent();
  }

  private showCurrentUserProfile(): void {
    if (!this.state.isLoggedIn) {
      this.router.navigate('/');
      return;
    }
    this.state.isInGame = false; // Explicitly set game state to false
    this.userProfile = new UserProfile(this.state.currentUser!, true);
    this.updateMainContent();
  }

  private async showUserProfile(username: string): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.router.navigate('/');
      return;
    }
    
    try {
      const targetUser = await this.apiClient.user.getUserByUsername(username);
      const isCurrentUser = targetUser.username === this.state.currentUser?.username;
      this.userProfile = new UserProfile(targetUser, isCurrentUser, this.apiClient);
      this.updateMainContent();
      this.mainTerminal.appendOutput(`Viewing profile: ${targetUser.nickname || targetUser.username}`);
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App.showUserProfile',
        ErrorLevel.WARNING,
        {
          component: 'App',
          action: 'userProfileLoadFailed',
          additionalData: { username }
        }
      );
      this.mainTerminal.appendOutput('User not found.');
      this.router.navigate('/profile');
    }
  }

  private showGameView(): void {
    this.state.isInGame = true;
    this.updateMainContent();
  }

  private showGameMode(_mode: string): void {
    this.state.isInGame = true;
    this.updateMainContent();
  }

  // ===== UI & RENDERING =====

  private render(): void {
    // Only render if app element is empty (first time)
    if (this.appElement.children.length === 0) {
      this.initializeLayout();
    }
    
    // Update dynamic parts
    this.updateHeader();
    this.updateMainContent();
    this.updateStatusBar();
  }

  private initializeLayout(): void {
    this.appElement.innerHTML = `
      <div class="flex flex-col h-full border border-terminal-gray rounded-lg overflow-hidden relative">
        <!-- Header -->
        <div class="app-header flex items-center p-2 bg-terminal-black border-b border-terminal-gray">
          <div class="flex space-x-2 ml-2">
            <div class="w-3 h-3 rounded-full bg-terminal-red"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-yellow"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-lightGreen"></div>
          </div>
          <div class="header-title flex-grow text-center text-gray-400 text-sm">
            PONG-CLI v1.0.0 <span class="mode-indicator"></span>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content h-[800px] bg-terminal-black border-b border-terminal-gray overflow-hidden"></div>
        
        <!-- Terminal -->
        <div class="terminal-container flex flex-col h-[240px] min-h-[240px] max-h-[240px]">
          <!-- Terminal will be inserted here -->
        </div>
        
        <!-- Status Bar -->
        <div class="app-status-bar h-[30px] min-h-[30px] max-h-[30px] flex justify-between items-center px-4 bg-terminal-black border-t border-terminal-gray">
          <div class="flex items-center gap-2">
            <span class="status-indicator text-terminal-lightGreen text-sm">○</span>
            <span class="status-text text-gray-400 text-sm">Not logged in</span>
          </div>
          <div class="route-text text-gray-400 text-sm">Route: #/</div>
        </div>
      </div>
    `;

    // Insert terminal once
    const terminalContainer = this.appElement.querySelector('.terminal-container') as HTMLElement;
    terminalContainer.appendChild(this.mainTerminal.render());
  }

  private updateHeader(): void {
    const modeIndicator = this.appElement.querySelector('.mode-indicator') as HTMLElement;
    if (modeIndicator) {
      modeIndicator.textContent = this.apiClient.shouldUseMockData() ? '[MOCK]' : '[LIVE]';
    }
  }

  private updateMainContent(): void {
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;
    
    // Don't update content until auth is resolved
    if (this.state.isLoggedIn === null) {
      mainContent.innerHTML = `<div class="flex items-center justify-center h-full text-terminal-lightGreen">Authenticating...</div>`;
      return;
    }
    
    mainContent.innerHTML = '';
    
    // Now we know the real auth state - safe to proceed
    if (this.state.isLoggedIn && this.state.currentUser) {
      if (this.state.isInGame) {
        this.pongGame.setGameMode('regular');
        mainContent.appendChild(this.pongGame.render());
        this.pongGame.start();
      } else if (this.userProfile) {
        mainContent.appendChild(this.userProfile.render());
      } else {
        this.userProfile = new UserProfile(this.state.currentUser, true, this.apiClient);
        mainContent.appendChild(this.userProfile.render());
      }
    } else {
      this.pongGame.setGameMode('demo');
      mainContent.appendChild(this.pongGame.render());
      this.pongGame.start();
    }
    
    // Update status bar to reflect current state
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const statusIndicator = this.appElement.querySelector('.status-indicator') as HTMLElement;
    const statusElement = this.appElement.querySelector('.status-text') as HTMLElement;
    const routeElement = this.appElement.querySelector('.route-text') as HTMLElement;
    
    if (statusIndicator) {
      statusIndicator.textContent = this.state.isLoggedIn ? '●' : '○';
      statusIndicator.className = `text-sm ${this.state.isLoggedIn ? 'text-terminal-lightGreen' : 'text-terminal-gray'}`;
    }
    if (statusElement) {
      statusElement.textContent = this.getStatusText();
    }
    if (routeElement) {
      routeElement.textContent = `Route: ${window.location.hash || '#/'}`;
    }
  }

  private getStatusText(): string {
    if (this.state.isLoggedIn === null) return 'Authenticating...';
    if (this.state.isLoggedIn) return this.state.currentUser?.username || '';
    return 'Not logged in';
  }

  // ===== GAME MANAGEMENT =====

  private handleGameEnd(_winner: 'left' | 'right'): void {
    // Get actual game result from PongGame (should be called before stop() in PongGame)
    const gameResult = this.pongGame.getGameResult();
    
    // Show game end modal with real data
    const gameEndModal = new GameEndModal(
      gameResult,
      false, // isTournament - TODO: detect actual tournament mode
      true,  // isFinal
      () => {
        // On profile click
        this.state.isInGame = false;
        this.router.navigate('/profile');
      }
    );
    
    gameEndModal.show();
  }

  // ===== COMMAND HANDLING =====

  private async handleCommand(command: string): Promise<void> {
    const parts = command.trim().split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (commandName) {
      case 'help':
        this.handleHelpCommand();
        break;
      case 'login':
        // Show login modal instead of terminal command
        if (!this.state.isLoggedIn) {
          this.showLoginModal();
        } else {
          this.mainTerminal.appendOutput('You are already logged in.');
        }
        break;
      case 'register':
        // Show register modal instead of terminal command
        if (!this.state.isLoggedIn) {
          this.showRegisterModal();
        } else {
          this.mainTerminal.appendOutput('Please logout first to register a new account.');
        }
        break;
      case 'google':
        await this.handleGoogleLoginCommand();
        break;
      case 'logout':
        await this.handleLogoutCommand();
        break;
      case 'friend':
        await this.handleFriendCommand();
        break;
      case 'profile':
        this.handleProfileCommand(args);
        break;
      case 'play':
        await this.handlePlayCommand();
        break;
      case 'clear':
        this.handleClearCommand();
        break;
      default:
        this.mainTerminal.appendOutput(`Unknown command: ${commandName}. Type "help" for available commands.`);
    }
  }

  private handleHelpCommand(): void {
    const apiStatus = this.apiClient.shouldUseMockData() ? 'MOCK DATA' : 'LIVE API';
    const baseHelp = `API Status: ${apiStatus}\n\n`;
    
    const helpText = this.state.isLoggedIn
      ? baseHelp + 'Available commands:\n' +
        '  help     - Display this help message\n' +
        '  profile  - View user profile (profile <username>)\n' +
        '  play     - Start a game of Pong\n' +
        '  logout   - Log out of current session\n' +
        '  friend   - Manage friends list\n' +
        '  clear    - Clear the terminal screen'
      : baseHelp + 'Available commands:\n' +
        '  help     - Display this help message\n' +
        '  login    - Open login modal\n' +
        '  register - Open registration modal\n' +
        '  google   - Login with Google OAuth\n' +
        '  clear    - Clear the terminal screen';
    
    this.mainTerminal.appendOutput(helpText);
  }

  private async _handleLoginCommand(args: string[]): Promise<void> {
    if (this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('You are already logged in.');
      return;
    }

    if (args.length !== 2) {
      this.mainTerminal.appendOutput('Usage: login <email> <password>');
      return;
    }

    const [email, password] = args;

    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      this.mainTerminal.appendOutput(`Error: ${emailValidation.error}`);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      this.mainTerminal.appendOutput(`Error: ${passwordValidation.error}`);
      return;
    }

    // Attempt login
    try {
      this.mainTerminal.appendOutput('Authenticating...');
      const loginResult = await this.apiClient.auth.login(email, password);
      
      // Check if 2FA is required
      if ('requires2FA' in loginResult) {
        this.mainTerminal.appendOutput('Two-factor authentication required.');
        await this.handle2FALogin(loginResult.tmpToken);
      } else {
        // Regular login success
        this.state.isLoggedIn = true;
        this.state.currentUser = loginResult;
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome back, ${loginResult.username}!`);
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        this.router.navigate('/profile');
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App._handleLoginCommand',
        ErrorLevel.ERROR,
        {
          component: 'App',
          action: 'loginFailed',
          additionalData: { email }
        }
      );
      const message = error instanceof ApiError
        ? `Login failed: ${error.data?.message || 'Invalid credentials'}`
        : 'Login failed. Please check your connection.';
      this.mainTerminal.appendOutput(message);
    }
  }

  private async handleGoogleLoginCommand(): Promise<void> {
    if (this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('You are already logged in.');
      return;
    }

    try {
      this.mainTerminal.appendOutput('Redirecting to Google for authentication...');
      
      // Mock 환경에서는 즉시 로그인 처리
      if (this.apiClient.shouldUseMockData()) {
        // Mock OAuth 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.mainTerminal.appendOutput('Mock Google authentication completed.');
        
        // OAuth 콜백 처리
        const user = await this.apiClient.auth.handleOAuthCallback();
        if (user) {
          this.state.isLoggedIn = true;
          this.state.currentUser = user;
          this.mainTerminal.reset();
          this.mainTerminal.appendOutput(`Welcome, ${user.username}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          this.router.navigate('/profile');
        } else {
          this.mainTerminal.appendOutput('Google authentication failed.');
        }
      } else {
        // 실제 환경에서는 리다이렉트 (페이지가 이동됨)
        await this.apiClient.auth.loginWithGoogle();
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App.handleGoogleLoginCommand',
        ErrorLevel.ERROR,
        {
          component: 'App',
          action: 'googleLoginFailed'
        }
      );
      const message = error instanceof ApiError
        ? `Google login failed: ${error.data?.message || 'Authentication error'}`
        : 'Google login failed. Please check your connection.';
      this.mainTerminal.appendOutput(message);
    }
  }

  private async handle2FALogin(tmpToken: string): Promise<void> {
    const { TwoFAModal } = await import('./TwoFAModal.js');
    
    const twoFAModal = new TwoFAModal(
      this.apiClient,
      'enable', // Use verify mode but we'll handle it differently
      async () => {
        // Get the 2FA code from the modal
        const twoFACode = twoFAModal.getVerificationCode();
        if (!twoFACode || twoFACode.length !== 6) {
          this.mainTerminal.appendOutput('Please enter a valid 6-digit code');
          return;
        }

        try {
          this.mainTerminal.appendOutput('Verifying 2FA code...');
          const user = await this.apiClient.auth.completeTwoFALogin(tmpToken, twoFACode);
          
          this.state.isLoggedIn = true;
          this.state.currentUser = user;
          this.mainTerminal.reset();
          this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          this.router.navigate('/profile');
          twoFAModal.close();
        } catch (error) {
          this.errorHandler.handleError(
            error as Error,
            'App.handle2FALogin',
            ErrorLevel.ERROR,
            {
              component: 'App',
              action: 'twoFAVerificationFailed'
            }
          );
          const message = error instanceof ApiError
            ? `2FA verification failed: ${error.data?.message || 'Invalid code'}`
            : '2FA verification failed. Please try again.';
          this.mainTerminal.appendOutput(message);
        }
      },
      () => {
        this.mainTerminal.appendOutput('2FA verification cancelled.');
      }
    );

    // Set modal to verify mode
    twoFAModal.setVerifyMode();
    await twoFAModal.show();
  }

  private async _handleRegisterCommand(args: string[]): Promise<void> {
    if (this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please logout first to register a new account.');
      return;
    }

    if (args.length < 3) {
      this.mainTerminal.appendOutput('Usage: register <email> <password> <nickname>');
      return;
    }

    const [email, password, ...nicknameParts] = args;
    const nickname = nicknameParts.join(' ');

    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      this.mainTerminal.appendOutput(`Error: ${emailValidation.error}`);
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      this.mainTerminal.appendOutput(`Error: ${passwordValidation.error}`);
      return;
    }
    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.isValid) {
      this.mainTerminal.appendOutput(`Error: ${nicknameValidation.error}`);
      return;
    }

    // Check if email already exists
    try {
      this.mainTerminal.appendOutput('Checking email availability...');
      const emailExists = await this.apiClient.auth.checkEmailExists(email);
      if (emailExists) {
        this.mainTerminal.appendOutput('Error: Email already in use. Please use a different email.');
        return;
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App._handleRegisterCommand',
        ErrorLevel.ERROR,
        {
          component: 'App',
          action: 'emailCheckFailed',
          additionalData: { email }
        }
      );
      this.mainTerminal.appendOutput('Error checking email availability. Please try again.');
      return;
    }

    // Check if nickname already exists
    try {
      this.mainTerminal.appendOutput('Checking nickname availability...');
      const nicknameExists = await this.apiClient.auth.checkNicknameExists(nickname);
      if (nicknameExists) {
        this.mainTerminal.appendOutput('Error: Nickname already in use. Please choose a different nickname.');
        return;
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App._handleRegisterCommand',
        ErrorLevel.ERROR,
        {
          component: 'App',
          action: 'nicknameCheckFailed',
          additionalData: { nickname }
        }
      );
      this.mainTerminal.appendOutput('Error checking nickname availability. Please try again.');
      return;
    }

    // Attempt registration
    try {
      this.mainTerminal.appendOutput('Creating your account...');
      const user = await this.apiClient.auth.register(email, password, nickname);

      const fileModal = new FileModal(async (file: File) => {
        if (user) {
          let userForState = user;
          try {
            const updatedUser = await this.apiClient.user.uploadAvatar(file);
            userForState = updatedUser;
          } catch (e) {
            this.errorHandler.handleError(
              e as Error,
              'App._handleRegisterCommand',
              ErrorLevel.WARNING,
              {
                component: 'App',
                action: 'avatarUploadFailed'
              }
            );
            this.mainTerminal.appendOutput('Error uploading avatar, using default.');
          }

          this.state.isLoggedIn = true;
          this.state.currentUser = userForState;

          this.mainTerminal.reset();
          this.mainTerminal.appendOutput(`Welcome, ${nickname}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          this.router.navigate('/profile');
        }
      });
      fileModal.show();
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App._handleRegisterCommand',
        ErrorLevel.ERROR,
        {
          component: 'App',
          action: 'registrationFailed',
          additionalData: { email, nickname }
        }
      );
      this.mainTerminal.appendOutput(`Registration failed.`);
    }
  }

  private async handleLogoutCommand(): Promise<void> {
    if (!this.state.isLoggedIn) {
      return;
    }

    try {
      await this.apiClient.auth.logout();
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'App.handleLogoutCommand',
        ErrorLevel.WARNING,
        {
          component: 'App',
          action: 'logoutFailed'
        }
      );
      // Logout locally even if server request fails
    }

    this.state.isLoggedIn = false;
    this.state.currentUser = null;
    this.state.isInGame = false;
    this.userProfile = null;
    this.mainTerminal.reset();
    this.router.navigate('/');
  }

  private async handleFriendCommand(): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to manage friends.');
      return;
    }

    try {
      const friendModal = new FriendModal(this.apiClient);
      await friendModal.open();
    } catch (error) {
      this.mainTerminal.appendOutput('Error opening friend manager.');
    }
  }

  private handleProfileCommand(args: string[]): void {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to view profiles.');
      return;
    }

    if (args.length > 0) {
      const username = args.join(' ');
      this.router.navigate(`/profile/${username}`);
    } else {
      this.router.navigate('/profile');
    }
  }

  private async handlePlayCommand(): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to play the game.');
      return;
    }

    try {
      // Stop any existing game first
      this.pongGame.stop();
      
      const gameSetupModal = new GameSetupModal();
      const result = await gameSetupModal.open();

      if (result) {
        const { mode, opponents } = result;
        this.mainTerminal.appendOutput(`Starting ${mode} game...`);

        if (this.state.currentUser) {
          const player1: Player = {
            nickname: this.state.currentUser.nickname || this.state.currentUser.username,
            avatarUrl: this.state.currentUser.avatarUrl,
          };

          // Set up game configuration before navigating
          if (mode === 'vs ai') {
            // AI mode: AI (left) vs Player (right)
            this.pongGame.setPlayers({ nickname: 'AI' }, player1);
            this.pongGame.setMultiplayerMode(false);
            this.pongGame.setGameMode('regular');
          } else if (mode === 'local') {
            const opponent = opponents[0];
            this.pongGame.setPlayers(player1, { nickname: opponent.nickname });
            this.pongGame.setMultiplayerMode(true);
            this.pongGame.setGameMode('regular');
          } else if (mode === 'tournament') {
            const opponent = opponents[0];
            // TODO: Store full tournament roster and manage bracket
            this.pongGame.setPlayers(player1, { nickname: opponent.nickname });
            this.pongGame.setMultiplayerMode(true);
            this.pongGame.setGameMode('tournament');
          }

          // Set game state BEFORE navigating
          this.state.isInGame = true;
          
          // Navigate to game route after configuration
          this.router.navigate('/game');
        }
      } else {
        this.mainTerminal.appendOutput('Game cancelled.');
      }
    } catch (error) {
      this.mainTerminal.appendOutput(
        'Error: Could not start the game. Please try again.',
      );
      this.errorHandler.handleError(
        error as Error,
        'handlePlayCommand',
      );
    }
  }

  private handleClearCommand(): void {
    this.mainTerminal.clearOutput();
  }

  // ===== MODAL MANAGEMENT =====

  private async showLoginModal(): Promise<void> {
    const { LoginModal } = await import('./LoginModal.js');
    
    const loginModal = new LoginModal(
      this.apiClient,
      (user: Types.User) => {
        // Login success
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        this.router.navigate('/profile');
      },
      () => {
        // Switch to register
        this.showRegisterModal();
      },
      (tmpToken: string) => {
        // 2FA required
        this.handle2FALogin(tmpToken);
      }
    );
    
    loginModal.show();
  }

  private async showRegisterModal(): Promise<void> {
    const { RegisterModal } = await import('./RegisterModal.js');
    
    const registerModal = new RegisterModal(
      this.apiClient,
      (user: Types.User) => {
        // Register success
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome, ${user.username}!`);
        this.mainTerminal.appendOutput('Your account has been created successfully.');
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        this.router.navigate('/profile');
      },
      () => {
        // Switch to login
        this.showLoginModal();
      },
      (user: Types.User) => {
        // Google register success
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome, ${user.username}!`);
        this.mainTerminal.appendOutput('Your Google account has been linked successfully.');
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        this.router.navigate('/profile');
      }
    );
    
    registerModal.show();
  }
} 