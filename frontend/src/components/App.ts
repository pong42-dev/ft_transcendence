import { Terminal } from './Terminal.js';
// import { PongGameModular as PongGame } from '../game/PongGameModular.js';
import { ApiClient } from '../services/ApiClient.js';
import { Router } from '../utils/Router.js';
import {
  User,
  // Friend,
  // Player
} from '../types/types.js';
import * as Types from '../types/types.js';
import { GameSetupModal } from './modals/GameSetupModal.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { authStore, userProfileStore } from '../store/index.js';
import { CommandHandler } from '../commands/CommandHandler.js';
import { AuthManager } from '../managers/AuthManager.js';
import { UserStateCache } from '../services/UserStateCache.js';
import { UIRenderer } from '../managers/UIRenderer.js';
import { ModalManager } from '../managers/ModalManager.js';
import { UserProfileManager } from '../managers/UserProfileManager.js';
import { GamePage } from '../game/GamePage.js';

export class App {
  // UI Elements References
  private appElement: HTMLElement;
  // Service Objects
  private apiClient: ApiClient;
  private router: Router;
  private errorHandler: ErrorHandler;
  private commandHandler: CommandHandler;
  private authManager: AuthManager;
  private uiRenderer: UIRenderer;
  private modalManager: ModalManager;
  private userProfileManager: UserProfileManager;
  // Components
  private mainTerminal: Terminal;
  private gamePage: GamePage | null = null;
  // Game state
  private gameSetupResult: any = null;
  
  // Store subscriptions cleanup functions
  private unsubscribeAuth: (() => void) | null = null;
  private unsubscribeUserProfile: (() => void) | null = null;
  
  
  

  // ===== INITIALIZATION METHODS =====
  
  constructor() {
    this.appElement = document.getElementById('app') as HTMLElement;
    this.apiClient = new ApiClient();
    this.router = new Router();
    this.errorHandler = new ErrorHandler();
    
    // this.pongGame = new PongGame((winner) => {
    //   this.handleGameEnd(winner);
    // });
    
    // Initialize CommandHandler with dependencies
    this.commandHandler = new CommandHandler({
      apiClient: this.apiClient,
      router: this.router,
      terminal: null as any, // Will be set after terminal creation
      errorHandler: this.errorHandler,
      onGameStart: (gameConfig: any) => this.handlePlayGame(gameConfig),
      onShowModal: (modalType: string, options?: any) => this.handleShowModal(modalType, options),
      onUserStateUpdate: (user: User) => this.userProfileManager.updateUserState(user)
    });
    
    // Create terminal with command handler
    this.mainTerminal = new Terminal((command: string) => this.commandHandler.execute(command));
    
    // Set terminal reference in command handler
    (this.commandHandler as any).deps.terminal = this.mainTerminal;
    
    // Initialize AuthManager
    this.authManager = new AuthManager(
      this.apiClient,
      this.router,
      this.mainTerminal,
      this.errorHandler
    );
    
    // Initialize UIRenderer
    this.uiRenderer = new UIRenderer(this.appElement, this.mainTerminal, this.apiClient);
    
    // Initialize ModalManager (singleton)
    this.modalManager = ModalManager.getInstance();
    this.modalManager.setDependencies(this.apiClient, this.router, this.mainTerminal);
    
    // Initialize UserProfileManager
    this.userProfileManager = new UserProfileManager(this.apiClient, this.mainTerminal, this.errorHandler);
    
    // Subscribe to store changes
    this.setupStoreSubscriptions();
    
    // Listen for custom user data update events
    this.setupCustomEventListeners();
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to auth store changes
    this.unsubscribeAuth = authStore.subscribe(() => {
      this.uiRenderer.render();
    });

    // Subscribe to user profile store changes
    this.unsubscribeUserProfile = userProfileStore.subscribe(() => {
      this.uiRenderer.render();
    });
  }

  private setupCustomEventListeners(): void {
    // Listen for custom user data update events (fallback for 2FA updates)
    window.addEventListener('userDataUpdated', (_event: any) => {
      console.log('[App] Received userDataUpdated event');
      // Force UserProfile recreation by clearing the cache
      // Note: UIRenderer handles lastUserProfileData internally
      this.uiRenderer.render();
      
      // 터미널 포커스 복원
      setTimeout(() => {
        this.mainTerminal.focus();
        console.log('[App] Terminal focus restored after user data update');
      }, 300);
    });
  }



  public init(): void {
    this.uiRenderer.render(); // Show UI immediately (loading state)
    this.setupRouting(); // Routes are safe because DOM exists
    
    // 즉시 세션 스토리지에서 토큰 복원 시도
    this.authManager.tryRestoreSessionToken();
    
    // 인증 상태 확인을 백그라운드에서 실행 (UI 블로킹 방지)
    setTimeout(() => {
      this.authManager.checkAuthStateWithTimeout().then(() => {
        this.uiRenderer.render(); // Render after auth check is complete
        
        // 인증 확인 완료 후 터미널에 포커스 (로그인 상태이고 게임 중이 아닌 경우)
        const isLoggedIn = authStore.getIsLoggedIn();
        if (isLoggedIn && !this.uiRenderer.getGameState()) {
          setTimeout(() => {
            this.mainTerminal.focus();
          }, 300);
        }
      });
    }, 100);
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
    this.uiRenderer.setGameState(false);
    // If user is logged in, redirect to their profile instead of showing it at root
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    if (isLoggedIn && currentUser) {
      this.router.navigate('/profile');
      return;
    }
    this.uiRenderer.render();
  }

  private showCurrentUserProfile(): void {
    if (!authStore.getIsLoggedIn()) {
      this.router.navigate('/');
      return;
    }
    this.uiRenderer.setGameState(false); // Explicitly set game state to false
    this.uiRenderer.render();
  }

  private async showUserProfile(username: string): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.router.navigate('/');
      return;
    }
    
    // 다른 사용자 프로필 조회 기능이 백엔드에 구현되지 않았으므로
    // 현재 사용자 프로필로 리다이렉트
    const currentUser = authStore.getCurrentUser();
    if (username !== currentUser?.username) {
      this.mainTerminal.appendOutput(`User profile search not available. Showing your profile instead.`);
      this.router.navigate('/profile');
      return;
    }
    
    // 현재 사용자 프로필 표시
    this.showCurrentUserProfile();
  }

  private showGameView(): void {
    // 기존 게임 페이지가 있다면 정리
    if (this.gamePage) {
      this.gamePage.destroy();
      this.gamePage = null;
    }

    // 게임 상태로 설정
    this.uiRenderer.setGameState(true);
    this.uiRenderer.render();

    // main-content 컨테이너 가져오기
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) {
      this.mainTerminal.appendOutput('Error: Game container not found.');
      return;
    }

    // GamePage 생성 및 시작
    this.gamePage = new GamePage(
      mainContent,
      this.apiClient,
      this.gameSetupResult, // 게임 설정 데이터 전달
      () => {
        // 게임 종료 콜백
        this.gamePage = null;
        this.gameSetupResult = null; // 게임 설정 데이터 정리
        this.uiRenderer.setGameState(false);
        this.router.navigate('/profile');
        this.mainTerminal.appendOutput('Game ended. Returning to profile.');
      }
    );
  }

  private showGameMode(_mode: string): void {
    this.uiRenderer.setGameState(true);
    this.uiRenderer.render();
  }



  // ===== GAME MANAGEMENT =====


  // ===== COMMAND HANDLER HELPERS =====

  /**
   * CommandHandler에서 사용할 게임 시작 헬퍼
   */
  private async handlePlayGame(gameConfig: any): Promise<void> {
    if (!gameConfig) {
      try {
        // Stop any existing game first
        // this.pongGame.stop();
        
        const gameSetupModal = new GameSetupModal();
        const result = await gameSetupModal.open();

        if (result) {
          const { mode } = result;
          this.mainTerminal.appendOutput(`Starting ${mode} game...`);

          const currentUser = authStore.getCurrentUser();
          if (currentUser) {

            // Save game setup result for GamePage
            this.gameSetupResult = result;

            // Set game state BEFORE navigating
            this.uiRenderer.setGameState(true);
            
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
          'handlePlayGame',
        );
      }
    }
  }





  // ===== MODAL MANAGEMENT =====

  /**
   * CommandHandler에서 사용할 모달 표시 헬퍼
   */
  private async handleShowModal(modalType: string, options?: any): Promise<any> {
    const callbacks = this.getCommonModalCallbacks();
    
    switch (modalType) {
      case 'login':
        return this.modalManager.showLoginModal(callbacks);
      case 'register':
        return this.modalManager.showRegisterModal(callbacks);
      case 'file':
        return this.modalManager.showFileModal({
          title: 'Select Avatar',
          accept: 'image/*',
          maxSize: 5 * 1024 * 1024,
          onFileSelected: (file: File, resolve: () => void, reject: (error: any) => void) => {
            this.userProfileManager.handleAvatarUpload(file, resolve, reject, this.uiRenderer);
          }
        });
      default:
        return this.modalManager.showAppModal(modalType, { ...options, callbacks });
    }
  }

  // 공통 모달 콜백들
  private getCommonModalCallbacks() {
    return {
      onLoginSuccess: async (user: Types.User) => {
        authStore.login(user);
        UserStateCache.cache(user);
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
        
        await this.userProfileManager.handlePendingAvatarUpload();
        
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        this.uiRenderer.render();
        setTimeout(() => {
          this.router.navigate('/profile');
          this.mainTerminal.focus();
        }, 100);
      },
      
      onRegisterSuccess: (user: Types.User, avatarFile?: File) => {
        if (avatarFile) {
          this.userProfileManager.setPendingAvatarFile(avatarFile);
          this.mainTerminal.appendOutput(`Account created successfully for ${user.username}!`);
          this.mainTerminal.appendOutput('Profile picture will be uploaded after you log in.');
        } else {
          this.mainTerminal.appendOutput(`Account created successfully for ${user.username}!`);
        }
        this.mainTerminal.appendOutput('Please use the "login" command to sign in to your new account.');
      },
      
      onSwitchToRegister: () => this.modalManager.showRegisterModal(this.getCommonModalCallbacks()),
      onSwitchToLogin: () => this.modalManager.showLoginModal(this.getCommonModalCallbacks()),
      on2FARequired: (tmpToken: string) => this.authManager.handle2FALogin(tmpToken)
    };
  }




  // Cleanup method for proper store unsubscription
  public cleanup(): void {
    // GamePage cleanup
    if (this.gamePage) {
      this.gamePage.destroy();
      this.gamePage = null;
    }
    
    // Game setup data cleanup
    this.gameSetupResult = null;
    
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    if (this.unsubscribeUserProfile) {
      this.unsubscribeUserProfile();
    }
    // UIRenderer cleanup
    this.uiRenderer.cleanup();
    
    // AuthManager cleanup
    this.authManager.cleanup();
  }
}