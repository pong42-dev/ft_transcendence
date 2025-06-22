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
import { FileModal } from './FileModal.js';
import { GameSetupModal } from './GameSetupModal.js';
import { GameEndModal } from './GameEndModal.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

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
    if (this.apiClient.hasAuthToken()) {
      try {
        const user = await this.apiClient.auth.verifyToken();
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
      } catch (error) {
        this.apiClient.clearToken();
        this.state.isLoggedIn = false;
      }
    } else {
      this.state.isLoggedIn = false;
    }
    this.render();
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
      this.userProfile = new UserProfile(targetUser, isCurrentUser);
      this.updateMainContent();
      this.mainTerminal.appendOutput(`Viewing profile: ${targetUser.nickname || targetUser.username}`);
    } catch (error) {
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
    this.appElement.innerHTML = `
      <div class="flex flex-col h-full border border-terminal-gray rounded-lg overflow-hidden relative">
        <!-- Header -->
        <div class="flex items-center p-2 bg-terminal-black border-b border-terminal-gray">
          <div class="flex space-x-2 ml-2">
            <div class="w-3 h-3 rounded-full bg-terminal-red"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-yellow"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-lightGreen"></div>
          </div>
          <div class="flex-grow text-center text-gray-400 text-sm">
            PONG-CLI v1.0.0
            ${this.apiClient.shouldUseMockData() ? '[MOCK]' : '[LIVE]'}
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content h-[800px] bg-terminal-black border-b border-terminal-gray overflow-hidden"></div>
        
        <!-- Terminal -->
        <div class="terminal-container flex flex-col h-[240px] min-h-[240px] max-h-[240px]">
          <!-- Terminal will be inserted here -->
        </div>
        
        <!-- Status Bar -->
        <div class="h-[30px] min-h-[30px] max-h-[30px] flex justify-between items-center px-4 bg-terminal-black border-t border-terminal-gray">
          <div class="flex items-center gap-2">
            <span class="status-indicator text-terminal-lightGreen text-sm">${this.state.isLoggedIn ? '●' : '○'}</span>
            <span class="status-text text-gray-400 text-sm">${this.getStatusText()}</span>
          </div>
          <div class="route-text text-gray-400 text-sm">Route: ${window.location.hash || '#/'}</div>
        </div>
      </div>
    `;

    // Insert terminal
    const terminalContainer = this.appElement.querySelector('.terminal-container') as HTMLElement;
    terminalContainer.appendChild(this.mainTerminal.render());
    
    this.updateMainContent();
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
        this.userProfile = new UserProfile(this.state.currentUser, true);
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
    const statusIndicator = document.querySelector('.status-indicator');
    const statusElement = document.querySelector('.status-text');
    const routeElement = document.querySelector('.route-text');
    
    if (statusIndicator) statusIndicator.textContent = this.state.isLoggedIn ? '●' : '○';
    if (statusElement) statusElement.textContent = this.getStatusText();
    if (routeElement) routeElement.textContent = `Route: ${window.location.hash || '#/'}`;
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
        await this.handleLoginCommand(args);
        break;
      case 'register':
        await this.handleRegisterCommand(args);
        break;
      case 'logout':
        await this.handleLogoutCommand();
        break;
      case 'friend':
        this.handleFriendCommand();
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
        '  login    - Login with email and password\n' +
        '  register - Create a new account\n' +
        '  clear    - Clear the terminal screen';
    
    this.mainTerminal.appendOutput(helpText);
  }

  private async handleLoginCommand(args: string[]): Promise<void> {
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
      const user = await this.apiClient.auth.login(email, password);
      
      this.state.isLoggedIn = true;
      this.state.currentUser = user;
      this.mainTerminal.reset();
      this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
      this.mainTerminal.appendOutput('Type "help" to see available commands.');
      this.router.navigate('/profile');
    } catch (error) {
      const message = error instanceof ApiError
        ? `Login failed: ${error.data?.message || 'Invalid credentials'}`
        : 'Login failed. Please check your connection.';
      this.mainTerminal.appendOutput(message);
    }
  }

  private async handleRegisterCommand(args: string[]): Promise<void> {
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
      // Logout locally even if server request fails
    }

    this.state.isLoggedIn = false;
    this.state.currentUser = null;
    this.state.isInGame = false;
    this.userProfile = null;
    this.mainTerminal.reset();
    this.router.navigate('/');
  }

  private handleFriendCommand(): void {
    this.mainTerminal.appendOutput('Friend command not implemented yet.');
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
}