import { Terminal } from './Terminal.js';
import { PongGameModular as PongGame } from '../game/PongGameModular.js';
import { ApiClient, ApiError } from '../services/ApiClient.js';
import { UserProfile } from './UserProfile.js';
import { Router } from '../utils/Router.js';
import {
  AppState,
  User,
  // Friend,
  Player
} from '../types/types.js';
import * as Types from '../types/types.js';
import { GameSetupModal } from './GameSetupModal.js';
import { GameEndModal } from './GameEndModal.js';
import { FriendModal } from './FriendModal.js';
import { TwoFAModal } from './TwoFAModal.js';
import { ErrorHandler, ErrorLevel } from '../utils/ErrorHandler.js';
import { TokenManager } from '../services/core/TokenManager.js';

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
  
  // 인증 상태 확인 중복 방지
  private isCheckingAuth = false;
  // 렌더링 중복 방지
  private isRendering = false;

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
    
    // 즉시 세션 스토리지에서 토큰 복원 시도
    this.tryRestoreSessionToken();
    
    // 인증 상태 확인을 백그라운드에서 실행 (UI 블로킹 방지)
    setTimeout(() => {
      this.checkAuthStateWithTimeout();
    }, 100);
  }
  
  /**
   * 세션 스토리지에서 토큰을 즉시 복원하여 초기 인증 상태 설정
   */
  private tryRestoreSessionToken(): void {
    const sessionToken = TokenManager.getAccessToken(); // 이제 세션에서 자동 복원됨
    if (sessionToken) {
      console.log('🔄 Session token restored, setting preliminary auth state');
      // 토큰이 있으면 일단 인증된 상태로 설정 (백그라운드에서 검증 예정)
      this.state.isLoggedIn = true;
      
      // 기본 사용자 정보만 복원 (2FA 상태는 API에서만 가져옴)
      const cachedUser = this.restoreCachedUserState();
      if (cachedUser) {
        // 2FA 상태를 제외한 기본 정보만 사용
        this.state.currentUser = {
          ...cachedUser,
          twoFactorEnabled: false // 기본값, API 검증 후 실제 값으로 업데이트
        };
        console.log('👤 Cached user state restored (excluding 2FA):', cachedUser.username);
        
      } else {
        console.log('⚠️ No cached user state found, will fetch from server');
      }
      
      // API 검증 완료 전까지는 UI 렌더링 지연 (2FA 상태 안정성 우선)
      // this.render(); // 주석 처리: checkAuthState 완료 후 렌더링
    } else {
      console.log('❌ No session token found, remaining in logged out state');
    }
  }

  private async checkAuthStateWithTimeout(): Promise<void> {
    // 이미 인증 확인 중이면 무시
    if (this.isCheckingAuth) {
      console.log('⏸️ Auth check already in progress, skipping...');
      return;
    }
    
    this.isCheckingAuth = true;
    console.log('⏱️ Starting auth check with timeout...');
    
    let isResolved = false;
    
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!isResolved) {
          console.warn('⏰ Auth check timeout (8s) - setting logged out state');
          this.state.isLoggedIn = false;
          this.render();
          isResolved = true;
        }
        resolve();
      }, 8000); // 8초로 설정
    });

    try {
      const authCheckPromise = this.checkAuthState().then(() => {
        isResolved = true;
      });
      
      // 둘 중 먼저 완료되는 것을 기다림
      await Promise.race([authCheckPromise, timeoutPromise]);
    } catch (error) {
      console.error('💥 Auth check with timeout failed:', error);
      if (!isResolved) {
        this.state.isLoggedIn = false;
        this.render();
      }
    } finally {
      this.isCheckingAuth = false;
    }
  }

  private async checkAuthState(): Promise<void> {
    console.log('🔍 Starting authentication check...');
    
    try {
      // Check for OAuth callback first
      const url = new URL(window.location.href);
      const hasOAuthParams = url.searchParams.has('code') || url.pathname.includes('callback');
      
      if (hasOAuthParams) {
        console.log('🔗 OAuth callback detected, handling...');
        const user = await this.handleOAuthCallback();
        if (user) {
          this.state.isLoggedIn = true;
          this.state.currentUser = user;
          this.cacheUserState(user); // OAuth 로그인 시 사용자 상태 캐시
          console.log('✅ OAuth login successful:', user.username);
          return;
        }
        // OAuth failed, continue with normal auth check
      }

      // 토큰 상태 디버깅
      TokenManager.debugTokenState();
      
      // Check if we have an access token (memory + session)
      const hasToken = TokenManager.getAccessToken();
      console.log('🔑 Has token available:', !!hasToken);
      
      if (hasToken) {
        // 이미 세션 복원으로 상태가 설정되어 있다면 토큰 검증만 실행
        if (this.state.isLoggedIn && this.state.currentUser) {
          console.log('🔍 Verifying restored session token...', {
            username: this.state.currentUser.username,
            twoFactorEnabled: this.state.currentUser.twoFactorEnabled
          });
          try {
            // 토큰이 여전히 유효한지만 확인 (사용자 정보는 이미 캐시에서 복원됨)
            const verifiedUser = await this.apiClient.auth.verifyTokenWithoutTwoFACheck();
            console.log('🔍 Verified user from API:', {
              username: verifiedUser.username,
              twoFactorEnabled: verifiedUser.twoFactorEnabled
            });
            
            // 항상 백엔드 API 응답을 사용 (2FA 상태는 캐시하지 않음)
            this.state.currentUser = verifiedUser;
            
            // 2FA 상태를 제외한 사용자 정보만 캐시
            const userToCache = { ...verifiedUser };
            delete (userToCache as any).twoFactorEnabled; // 2FA 상태는 캐시하지 않음
            this.cacheUserState(userToCache);
            
            console.log('✅ User state updated from API, 2FA:', verifiedUser.twoFactorEnabled);
            
            console.log('✅ Session token verified, maintaining current state');
            // API 검증 완료 후 UI 렌더링
            this.render();
            return;
          } catch (verifyError) {
            console.warn('⚠️ Session token verification failed, will try refresh:', verifyError);
            // 검증 실패 시 토큰 갱신 시도
          }
        } else {
          // 토큰은 있지만 사용자 정보가 없는 경우 전체 검증
          console.log('🔍 Verifying token and fetching user info...');
          try {
            const user = await this.apiClient.auth.verifyToken();
            this.state.isLoggedIn = true;
            this.state.currentUser = user;
            this.cacheUserState(user); // 사용자 상태 캐시
            console.log('✅ Token verified, user authenticated:', user.username);
            return;
          } catch (verifyError) {
            console.warn('❌ Token verification failed, will try token refresh:', verifyError);
            
            // Rate limit이나 일시적 네트워크 오류인 경우 토큰을 유지하고 기존 상태 보존
            if (verifyError instanceof Error) {
              const errorMessage = verifyError.message.toLowerCase();
              if (errorMessage.includes('429') || errorMessage.includes('rate limit') || 
                  errorMessage.includes('network') || errorMessage.includes('fetch')) {
                console.warn('⚠️ Temporary error during token verification - trying to restore cached state');
                
                // 기존 사용자 정보가 있으면 상태 유지
                if (this.state.currentUser) {
                  this.state.isLoggedIn = true;
                  console.log('✅ Maintaining existing user state due to temporary error:', this.state.currentUser.username);
                  return;
                }
                
                // 캐시된 사용자 정보 복원 시도
                const cachedUser = this.restoreCachedUserState();
                if (cachedUser) {
                  this.state.isLoggedIn = true;
                  this.state.currentUser = cachedUser;
                  console.log('✅ Restored cached user state due to temporary error:', cachedUser.username);
                  return;
                }
              }
            }
            
            // 진짜 토큰 오류인 경우에만 토큰 갱신 시도
            // Token verification failed, but don't clear tokens yet
            // Let the refresh process handle it
          }
        }
      }
      
      // No valid token or token verification failed, try to refresh from cookie
      console.log('🔄 No valid token or verification failed, attempting refresh...');
      
      // hasRefreshToken으로 먼저 확인 후 토큰 갱신 시도 (불필요한 요청 방지)
      if (TokenManager.hasRefreshToken()) {
        console.log('🍪 Refresh token indicators found, attempting refresh...');
        await this.tryTokenRefresh();
      } else {
        console.log('❌ No refresh token indicators, setting logged out state');
        this.state.isLoggedIn = false;
        this.state.currentUser = null;
        this.clearUserStateCache();
      }
      
    } catch (error) {
      console.error('💥 Auth check failed:', error);
      this.state.isLoggedIn = false;
      this.state.currentUser = null;
    } finally {
      console.log('🎨 Auth check complete, rendering...', this.state.isLoggedIn);
      this.render();
    }
  }

  private async tryTokenRefresh(): Promise<void> {
    console.log('🔄 Attempting token refresh...');
    
    try {
      const newToken = await TokenManager.refreshToken();
      console.log('🔑 Token refresh result:', newToken ? 'SUCCESS' : 'FAILED');
      
      if (newToken) {
        // Token refresh successful - ApiClient에 새 토큰 전파 및 확실한 동기화
        this.apiClient.setToken(newToken);
        
        // verify the new token and get user info
        try {
          console.log('👤 Fetching user info with new token...');
          const user = await this.apiClient.auth.verifyTokenWithoutTwoFACheck();
          
          // 기존 사용자 정보가 있다면 2FA 상태 보호
          if (this.state.currentUser && this.state.currentUser.twoFactorEnabled !== user.twoFactorEnabled) {
            console.warn('⚠️ 2FA state mismatch after token refresh!', {
              existing: this.state.currentUser.twoFactorEnabled,
              fromAPI: user.twoFactorEnabled
            });
            
            // 기존 2FA 상태를 유지
            const preservedTwoFAState = this.state.currentUser.twoFactorEnabled;
            this.state.currentUser = { ...user, twoFactorEnabled: preservedTwoFAState };
            
            console.log('🔄 Preserved existing 2FA state after token refresh:', preservedTwoFAState);
          } else {
            this.state.currentUser = user;
          }
          
          this.state.isLoggedIn = true;
          this.cacheUserState(this.state.currentUser); // 사용자 상태 캐시
          console.log('✅ User authenticated after token refresh:', this.state.currentUser.username, '2FA:', this.state.currentUser.twoFactorEnabled);
        } catch (verifyError) {
          console.error('❌ User verification failed after token refresh:', verifyError);
          
          // 사용자 검증 실패하더라도 기존 사용자 정보가 있으면 유지
          if (this.state.currentUser) {
            console.warn('⚠️ Keeping existing user state despite verification failure');
            this.state.isLoggedIn = true;
            return;
          }
          
          // 기존 사용자 정보도 없으면 로그아웃 처리
          this.state.isLoggedIn = false;
          this.state.currentUser = null;
          // 토큰이 유효하지 않으면 모든 곳에서 정리
          TokenManager.clearTokens();
          this.apiClient.clearToken();
        }
      } else {
        // 토큰 갱신 실패 - 기존 토큰이 있는지 확인
        const hasExistingToken = TokenManager.getAccessToken();
        
        if (hasExistingToken) {
          // Rate Limit 등으로 갱신 실패했지만 기존 토큰이 있으면 상태 유지
          console.info('ℹ️ Token refresh failed but existing token available - keeping current state');
          
          // 기존 사용자 정보가 없으면 토큰으로 사용자 정보 가져오기 시도
          if (!this.state.currentUser) {
            try {
              console.log('🔍 Attempting to verify existing token...');
              const user = await this.apiClient.auth.verifyTokenWithoutTwoFACheck();
              this.state.isLoggedIn = true;
              this.state.currentUser = user;
              this.cacheUserState(user); // 사용자 상태 캐시
              console.log('✅ User authenticated with existing token:', user.username);
              return;
            } catch (verifyError) {
              console.warn('❌ Existing token verification failed:', verifyError);
              
              // Rate limit이나 일시적 네트워크 오류인 경우 상태 유지
              if (verifyError instanceof Error) {
                const errorMessage = verifyError.message.toLowerCase();
                if (errorMessage.includes('429') || errorMessage.includes('rate limit') || 
                    errorMessage.includes('network') || errorMessage.includes('fetch')) {
                  console.warn('⚠️ Temporary error - maintaining logged out state but keeping token');
                  this.state.isLoggedIn = false;
                  return; // 토큰은 유지하되 로그아웃 상태로
                }
              }
              
              // 토큰이 실제로 유효하지 않으면 로그아웃 처리
            }
          } else {
            console.log('✅ Maintaining existing user state:', this.state.currentUser.username);
            this.state.isLoggedIn = true;
            return;
          }
        }
        
        console.info('ℹ️ No valid refresh token or token verification failed - user not logged in');
        this.state.isLoggedIn = false;
        this.state.currentUser = null;
        this.clearUserStateCache(); // 사용자 상태 캐시 클리어
        // 토큰이 없거나 유효하지 않으면 모든 곳에서 정리
        TokenManager.clearTokens();
        this.apiClient.clearToken();
      }
    } catch (error) {
      console.error('💥 Token refresh error:', error);
      
      // 네트워크 에러나 일시적 문제인 경우 기존 토큰 유지
      const hasExistingToken = TokenManager.getAccessToken();
      
      // Rate limit이나 일시적 네트워크 오류 체크
      const isTemporaryError = error instanceof Error && 
        (error.message.toLowerCase().includes('429') || 
         error.message.toLowerCase().includes('rate limit') ||
         error.message.toLowerCase().includes('network') ||
         error.message.toLowerCase().includes('fetch') ||
         error.message.toLowerCase().includes('timeout'));
      
      if (hasExistingToken && (this.state.currentUser || isTemporaryError)) {
        console.warn('⚠️ Token refresh failed but maintaining existing session due to temporary error');
        // 기존 사용자 정보가 있으면 상태 유지
        if (this.state.currentUser) {
          this.state.isLoggedIn = true;
        } else {
          // 사용자 정보는 없지만 토큰은 유지 (다음 시도를 위해)
          this.state.isLoggedIn = false;
        }
        return;
      }
      
      // 토큰도 없고 사용자 정보도 없으면 로그아웃 처리
      console.error('💥 Complete authentication failure - logging out');
      this.state.isLoggedIn = false;
      this.state.currentUser = null;
      this.clearUserStateCache(); // 사용자 상태 캐시 클리어
      // 에러 발생 시 모든 토큰 정리
      TokenManager.clearTokens();
      this.apiClient.clearToken();
    }
  }



  private async handleOAuthCallback(): Promise<Types.User | null> {
    // Only try OAuth callback if we're actually coming from OAuth redirect
    const url = new URL(window.location.href);
    const hasOAuthParams = url.searchParams.has('code') || url.pathname.includes('callback');
    
    if (!hasOAuthParams) {
      return null;
    }
    
    try {
      // Try to get user info (only works if OAuth callback was successful)
      const user = await this.apiClient.auth.handleOAuthCallback();
      if (user) {
        // Clean up URL after successful OAuth callback
        window.history.replaceState({}, document.title, '/');
        return user;
      }
    } catch (error) {
      // Clean up URL even if OAuth failed
      window.history.replaceState({}, document.title, '/');
      
      this.errorHandler.handleError(
        error as Error,
        'App.handleOAuthCallback',
        ErrorLevel.WARNING,
        {
          component: 'App',
          action: 'oauthCallbackFailed'
        }
      );
      
      // Show user-friendly error message
      this.mainTerminal.appendOutput('Google 로그인 중 오류가 발생했습니다.');
      if (error instanceof Error && error.message.includes('409')) {
        this.mainTerminal.appendOutput('이미 등록된 계정일 수 있습니다. 일반 로그인을 시도해보세요.');
      } else {
        this.mainTerminal.appendOutput('잠시 후 다시 시도해주세요.');
      }
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
    this.userProfile = new UserProfile(
      this.state.currentUser!, 
      true, 
      this.apiClient,
      (updatedUser: User) => {
        // Update global state when user profile changes
        this.state.currentUser = updatedUser;
        // Update cached user data (excluding 2FA state)
        const userToCache = { ...updatedUser };
        delete (userToCache as any).twoFactorEnabled; // 2FA 상태는 캐시하지 않음
        this.cacheUserState(userToCache);
      }
    );
    this.updateMainContent();
  }

  private async showUserProfile(username: string): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.router.navigate('/');
      return;
    }
    
    // 다른 사용자 프로필 조회 기능이 백엔드에 구현되지 않았으므로
    // 현재 사용자 프로필로 리다이렉트
    if (username !== this.state.currentUser?.username) {
      this.mainTerminal.appendOutput(`User profile search not available. Showing your profile instead.`);
      this.router.navigate('/profile');
      return;
    }
    
    // 현재 사용자 프로필 표시
    this.showCurrentUserProfile();
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
    // 렌더링 중복 방지
    if (this.isRendering) {
      console.log('⏸️ Render already in progress, skipping...');
      return;
    }
    
    this.isRendering = true;
    
    try {
      // Only render if app element is empty (first time)
      if (this.appElement.children.length === 0) {
        this.initializeLayout();
      }
      
      // Update dynamic parts
      this.updateHeader();
      this.updateMainContent();
      this.updateStatusBar();
    } finally {
      this.isRendering = false;
    }
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
    
    // 터미널 메시지 업데이트 (로그인 상태에 따라)
    this.mainTerminal.updateWelcomeMessage(this.state.isLoggedIn, this.state.currentUser?.username);
    
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
    this.mainTerminal.appendOutput('Two-factor authentication required. Please enter your verification code.');
    
    const twoFAModal = new TwoFAModal(
      this.apiClient,
      'login',
      async (code?: string) => {
        if (!code) {
          this.mainTerminal.appendOutput('2FA verification cancelled.');
          return;
        }

        try {
          this.mainTerminal.appendOutput('Verifying 2FA code...');
          const user = await this.apiClient.auth.completeTwoFALogin(tmpToken, code);
          
          // 2FA 완료 후 상태 업데이트 및 UI 갱신
          this.state.isLoggedIn = true;
          this.state.currentUser = user;
          this.mainTerminal.reset();
          this.mainTerminal.updateWelcomeMessage(this.state.isLoggedIn, this.state.currentUser?.username);
          this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          
          // UI 강제 새로고침으로 로그인 상태 반영
          this.render();
          this.router.navigate('/profile');
          
          // 모달 닫기
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
          
          // Keep the modal open for retry
        }
      },
      () => {
        this.mainTerminal.appendOutput('2FA verification cancelled.');
      }
    );

    twoFAModal.show();
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
    this.clearUserStateCache(); // 로그아웃 시 사용자 상태 캐시 클리어
    this.mainTerminal.reset();
    
    // 강제로 렌더링 업데이트
    this.render();
    
    // 루트 경로로 이동
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
        // Register success (both local and Google)
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
      }
    );
    
    registerModal.show();
  }

  // ===== USER STATE CACHING METHODS =====
  
  /**
   * 사용자 상태를 로컬 스토리지에 캐시 (2FA 상태 동기화 포함)
   */
  private cacheUserState(user: Types.User): void {
    try {
      const cacheData = {
        user,
        timestamp: Date.now(),
        version: '1.1' // 2FA 동기화 지원 버전
      };
      localStorage.setItem('user_state_cache', JSON.stringify(cacheData));
      
      console.log('💾 User state cached successfully:', user.username, '2FA:', user.twoFactorEnabled);
    } catch (error) {
      console.warn('❌ Failed to cache user state:', error);
    }
  }
  
  /**
   * 캐시된 사용자 상태 복원 (2FA 상태 동기화 포함)
   */
  private restoreCachedUserState(): Types.User | null {
    try {
      const cached = localStorage.getItem('user_state_cache');
      if (!cached) {
        return null;
      }
      
      const { user, timestamp } = JSON.parse(cached);
      
      // 1시간 후 캐시 만료
      const age = Date.now() - timestamp;
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      if (age > maxAge) {
        console.log('⏰ Cached user state expired');
        localStorage.removeItem('user_state_cache');
        return null;
      }
      
      
      console.log('📱 Restored cached user state:', user.username, '2FA:', user.twoFactorEnabled);
      return user;
    } catch (error) {
      console.warn('❌ Failed to restore cached user state:', error);
      return null;
    }
  }
  
  /**
   * 사용자 상태 캐시 클리어
   */
  private clearUserStateCache(): void {
    try {
      localStorage.removeItem('user_state_cache');
      console.log('🗑️ User state cache cleared');
    } catch (error) {
      console.warn('❌ Failed to clear user state cache:', error);
    }
  }
}