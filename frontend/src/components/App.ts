import { Terminal } from './Terminal.js';
// import { PongGameModular as PongGame } from '../game/PongGameModular.js';
import { ApiClient, ApiError } from '../services/ApiClient.js';
import { UserProfile } from './UserProfile.js';
import { Router } from '../utils/Router.js';
import {
  User,
  // Friend,
  Player
} from '../types/types.js';
import * as Types from '../types/types.js';
import { GameSetupModal } from './modals/GameSetupModal.js';
import { GameEndModal } from './modals/GameEndModal.js';
import { TwoFAModal } from './modals/TwoFAModal.js';
import { FileModal } from './modals/FileModal.js';
import { TournamentTestModal } from './modals/TournamentTestModal.js';
import { ErrorHandler, ErrorLevel } from '../utils/ErrorHandler.js';
import { TokenManager } from '../services/core/TokenManager.js';
import { authStore, userProfileStore } from '../store/index.js';
import { CommandHandler } from '../commands/CommandHandler.js';

export class App {
  // UI Elements References
  private appElement: HTMLElement;
  // Service Objects
  private apiClient: ApiClient;
  private router: Router;
  private errorHandler: ErrorHandler;
  private commandHandler: CommandHandler;
  // Components
  // private pongGame: PongGame;
  private userProfile: UserProfile | null = null;
  private mainTerminal: Terminal;
  
  // Store subscriptions cleanup functions
  private unsubscribeAuth: (() => void) | null = null;
  private unsubscribeUserProfile: (() => void) | null = null;
  
  // 탭 간 동기화를 위한 BroadcastChannel
  private authChannel: BroadcastChannel | null = null;
  
  // Game state (keeping this local as it's UI-specific)
  private isInGame = false;
  
  // 렌더링 중복 방지
  private isRendering = false;
  
  // 회원가입 시 선택한 아바타 파일 (로그인 후 업로드)
  private pendingAvatarFile: File | null = null;
  
  // UserProfile 재생성 여부 판단을 위한 마지막 사용자 상태 저장
  private lastUserProfileData: { id: number; twoFactorEnabled: boolean; username: string } | null = null;

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
      onUserStateUpdate: (user: User) => this.handleUserStateUpdate(user),
      onCacheUserState: (user: User) => this.cacheUserState(user),
      onClearUserStateCache: () => this.clearUserStateCache()
    });
    
    // Create terminal with command handler
    this.mainTerminal = new Terminal((command: string) => this.commandHandler.execute(command));
    
    // Set terminal reference in command handler
    (this.commandHandler as any).deps.terminal = this.mainTerminal;
    
    // Subscribe to store changes
    this.setupStoreSubscriptions();
    
    // Listen for custom user data update events
    this.setupCustomEventListeners();
    
    // 탭 간 동기화 설정
    this.setupCrossTabSynchronization();
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to auth store changes
    this.unsubscribeAuth = authStore.subscribe(() => {
      this.render();
    });

    // Subscribe to user profile store changes
    this.unsubscribeUserProfile = userProfileStore.subscribe(() => {
      this.render();
    });
  }

  private setupCustomEventListeners(): void {
    // Listen for custom user data update events (fallback for 2FA updates)
    window.addEventListener('userDataUpdated', (event: any) => {
      console.log('[App] Received userDataUpdated event');
      // Force UserProfile recreation by clearing the cache
      this.lastUserProfileData = null;
      this.render();
      
      // 터미널 포커스 복원
      setTimeout(() => {
        this.mainTerminal.focus();
        console.log('[App] Terminal focus restored after user data update');
      }, 300);
    });
  }

  private setupCrossTabSynchronization(): void {
    try {
      // BroadcastChannel 지원 확인
      if (typeof BroadcastChannel !== 'undefined') {
        this.authChannel = new BroadcastChannel('auth_channel');
        this.authChannel.addEventListener('message', (event) => {
          if (event.data.type === 'logout') {
            console.info('[App] Received logout event from another tab');
            this.handleCrossTabLogout();
          }
        });
        console.info('[App] Cross-tab synchronization enabled via BroadcastChannel');
      } else {
        // BroadcastChannel 미지원 시 localStorage 이벤트 사용
        window.addEventListener('storage', (event) => {
          if (event.key === 'auth_logout_event') {
            console.info('[App] Received logout event from another tab via localStorage');
            this.handleCrossTabLogout();
          }
        });
        console.info('[App] Cross-tab synchronization enabled via localStorage events');
      }
    } catch (error) {
      console.warn('[App] Failed to setup cross-tab synchronization:', error);
    }
  }

  private handleCrossTabLogout(): void {
    console.info('[App] Handling cross-tab logout');
    
    // 로그아웃 상태로 업데이트
    authStore.logout();
    this.clearUserStateCache();
    
    // 토큰 정리
    TokenManager.clearTokens();
    this.apiClient.clearToken();
    
    // UI 업데이트
    this.render();
    
    // 터미널 메시지 표시
    this.mainTerminal.appendOutput('You have been logged out from another tab.');
    this.mainTerminal.appendOutput('Please use the "login" command to sign in again.');
    
    // 홈으로 이동
    this.router.navigate('/');
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
      
      // 기본 사용자 정보만 복원 (2FA 상태는 API에서만 가져옴)
      const cachedUser = this.restoreCachedUserState();
      if (cachedUser) {
        // 사용자 정보를 authStore에 저장
        authStore.login({
          ...cachedUser,
          twoFactorEnabled: false // 기본값, API 검증 후 실제 값으로 업데이트
        });
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
    if (authStore.getIsCheckingAuth()) {
      console.log('⏸️ Auth check already in progress, skipping...');
      return;
    }
    
    authStore.setCheckingAuth(true);
    console.log('⏱️ Starting auth check with timeout...');
    
    let isResolved = false;
    
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!isResolved) {
          console.warn('⏰ Auth check timeout (8s) - setting logged out state');
          authStore.setLoggedOut();
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
        authStore.setLoggedOut();
      }
    } finally {
      authStore.setCheckingAuth(false);
    }
  }

  private async checkAuthState(): Promise<void> {
    try {
      // Check for OAuth callback first
      const url = new URL(window.location.href);
      const hasOAuthParams = url.searchParams.has('code') || url.pathname.includes('callback');
      
      // OAuth 리다이렉트 후 쿠키 기반 로그인 시도 (구글 OAuth 콜백은 code 없이 리다이렉트됨)
      const isOAuthRedirect = document.referrer.includes('accounts.google.com') || 
                              sessionStorage.getItem('oauth_login_attempt') === 'true';
      
      if (hasOAuthParams || isOAuthRedirect) {
        const user = await this.handleOAuthCallback();
        
        if (user) {
          authStore.login(user);
          this.cacheUserState(user);
          this.mainTerminal.reset();
          this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          
          // OAuth 로그인 시도 추적 정리
          sessionStorage.removeItem('oauth_login_attempt');
          
          setTimeout(() => {
            this.router.navigate('/profile');
            this.mainTerminal.focus();
          }, 100);
          return;
        } else {
          // OAuth 실패 시에도 추적 정리
          sessionStorage.removeItem('oauth_login_attempt');
        }
      }

      // 토큰 상태 디버깅
      TokenManager.debugTokenState();
      
      // Check if we have an access token (memory + session)
      const hasToken = TokenManager.getAccessToken();
      console.log('🔑 Has token available:', !!hasToken);
      
      if (hasToken) {
        // 이미 세션 복원으로 상태가 설정되어 있다면 토큰 검증만 실행
        const currentUser = authStore.getCurrentUser();
        const isLoggedIn = authStore.getIsLoggedIn();
        
        if (isLoggedIn && currentUser) {
          console.log('🔍 Verifying restored session token...', {
            username: currentUser.username,
            twoFactorEnabled: currentUser.twoFactorEnabled
          });
          try {
            // 토큰이 여전히 유효한지만 확인 (사용자 정보는 이미 캐시에서 복원됨)
            const verifiedUser = await this.apiClient.auth.verifyTokenWithoutTwoFACheck();
            console.log('🔍 Verified user from API:', {
              username: verifiedUser.username,
              twoFactorEnabled: verifiedUser.twoFactorEnabled
            });
            
            // 항상 백엔드 API 응답을 사용 (2FA 상태는 캐시하지 않음)
            authStore.updateUser(verifiedUser);
            
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
            authStore.login(user);
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
                const currentUser = authStore.getCurrentUser();
                if (currentUser) {
                  authStore.login(currentUser);
                  console.log('✅ Maintaining existing user state due to temporary error:', currentUser.username);
                  return;
                }
                
                // 캐시된 사용자 정보 복원 시도
                const cachedUser = this.restoreCachedUserState();
                if (cachedUser) {
                  authStore.login(cachedUser);
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
        authStore.logout();
        this.clearUserStateCache();
      }
      
    } catch (error) {
      console.error('💥 Auth check failed:', error);
      authStore.logout();
    } finally {
      const isLoggedIn = authStore.getIsLoggedIn();
      console.log('🎨 Auth check complete, rendering...', isLoggedIn);
      this.render();
      
      // 인증 확인 완료 후 터미널에 포커스 (로그인 상태이고 게임 중이 아닌 경우)
      if (isLoggedIn && !this.isInGame) {
        setTimeout(() => {
          this.mainTerminal.focus();
        }, 300);
      }
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
          const currentUser = authStore.getCurrentUser();
          if (currentUser && currentUser.twoFactorEnabled !== user.twoFactorEnabled) {
            console.warn('⚠️ 2FA state mismatch after token refresh!', {
              existing: currentUser.twoFactorEnabled,
              fromAPI: user.twoFactorEnabled
            });
            
            // 기존 2FA 상태를 유지
            const preservedTwoFAState = currentUser.twoFactorEnabled;
            const updatedUser = { ...user, twoFactorEnabled: preservedTwoFAState };
            authStore.updateUser(updatedUser);
            
            console.log('🔄 Preserved existing 2FA state after token refresh:', preservedTwoFAState);
          } else {
            authStore.login(user);
          }
          
          this.cacheUserState(user); // 사용자 상태 캐시
          console.log('✅ User authenticated after token refresh:', user.username, '2FA:', user.twoFactorEnabled);
        } catch (verifyError) {
          console.error('❌ User verification failed after token refresh:', verifyError);
          
          // 사용자 검증 실패하더라도 기존 사용자 정보가 있으면 유지
          const currentUser = authStore.getCurrentUser();
          if (currentUser) {
            console.warn('⚠️ Keeping existing user state despite verification failure');
            return;
          }
          
          // 기존 사용자 정보가 없으면 로그아웃 처리
          authStore.logout();
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
          const currentUser = authStore.getCurrentUser();
          if (!currentUser) {
            try {
              console.log('🔍 Attempting to verify existing token...');
              const user = await this.apiClient.auth.verifyTokenWithoutTwoFACheck();
              authStore.login(user);
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
                  authStore.logout();
                  return; // 토큰은 유지하되 로그아웃 상태로
                }
              }
              
              // 토큰이 실제로 유효하지 않으면 로그아웃 처리
            }
          } else {
            const currentUser = authStore.getCurrentUser();
            if (currentUser) {
              console.log('✅ Maintaining existing user state:', currentUser.username);
              return;
            }
          }
        }
        
        console.info('ℹ️ No valid refresh token or token verification failed - user not logged in');
        authStore.logout();
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
      
      const currentUser = authStore.getCurrentUser();
      if (hasExistingToken && (currentUser || isTemporaryError)) {
        console.warn('⚠️ Token refresh failed but maintaining existing session due to temporary error');
        // 기존 사용자 정보가 있으면 상태 유지, 아니면 로그아웃 상태로 설정
        if (!currentUser) {
          authStore.logout();
        }
        return;
      }
      
      // 토큰도 없고 사용자 정보도 없으면 로그아웃 처리
      console.error('💥 Complete authentication failure - logging out');
      authStore.logout();
      this.clearUserStateCache(); // 사용자 상태 캐시 클리어
      // 에러 발생 시 모든 토큰 정리
      TokenManager.clearTokens();
      this.apiClient.clearToken();
    }
  }



  private async handleOAuthCallback(): Promise<Types.User | null> {
    // OAuth callback can be triggered by URL params or OAuth redirect detection
    const url = new URL(window.location.href);
    const hasOAuthParams = url.searchParams.has('code') || url.pathname.includes('callback');
    const isOAuthRedirect = document.referrer.includes('accounts.google.com') || 
                            sessionStorage.getItem('oauth_login_attempt') === 'true';
    
    if (!hasOAuthParams && !isOAuthRedirect) {
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
    this.isInGame = false;
    // If user is logged in, redirect to their profile instead of showing it at root
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    if (isLoggedIn && currentUser) {
      this.router.navigate('/profile');
      return;
    }
    this.updateMainContent();
  }

  private showCurrentUserProfile(): void {
    if (!authStore.getIsLoggedIn()) {
      this.router.navigate('/');
      return;
    }
    this.isInGame = false; // Explicitly set game state to false
    const currentUser = authStore.getCurrentUser();
    if (currentUser) {
      this.userProfile = new UserProfile(currentUser, true);
      this.updateMainContent();
    }
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
    this.isInGame = true;
    this.updateMainContent();
  }

  private showGameMode(_mode: string): void {
    this.isInGame = true;
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
        <div class="terminal-wrapper flex flex-col h-[240px] min-h-[240px] max-h-[240px]">
          <!-- Terminal Tab -->
          <div class="terminal-tab-bar flex bg-terminal-black">
            <div class="terminal-tab flex items-center px-4 py-2 bg-terminal-black border-t-2 border-l border-r border-terminal-green border-b-0 rounded-t-md relative">
              <span class="text-terminal-green text-sm font-medium">● PONG-CLI</span>
            </div>
            <div class="flex-1 border-b border-terminal-gray"></div>
          </div>
          <!-- Terminal Container -->
          <div class="terminal-container flex-1 flex flex-col border-l border-r border-terminal-gray overflow-hidden" style="max-height: calc(240px - 40px); height: calc(240px - 40px);">
            <!-- Terminal will be inserted here -->
          </div>
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
    
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    
    // Don't update content until auth is resolved
    if (isLoggedIn === null) {
      mainContent.innerHTML = `<div class="flex items-center justify-center h-full text-terminal-lightGreen">Authenticating...</div>`;
      return;
    }
    
    // 터미널 메시지 업데이트 (로그인 상태에 따라)
    this.mainTerminal.updateWelcomeMessage(isLoggedIn, currentUser?.username);
    
    mainContent.innerHTML = '';
    
    // Now we know the real auth state - safe to proceed
    if (isLoggedIn && currentUser) {
      if (this.isInGame) {
        // this.pongGame.setGameMode('regular');
        // mainContent.appendChild(this.pongGame.render());
        // this.pongGame.start();
      } else {
        // UserProfile이 없거나 사용자 데이터가 변경된 경우 새로 생성
        const shouldRecreate = !this.userProfile || this.shouldRecreateUserProfile(currentUser);
        console.log('[App] UserProfile recreation check:', {
          hasUserProfile: !!this.userProfile,
          shouldRecreate,
          currentUser2FA: currentUser.twoFactorEnabled
        });
        
        if (shouldRecreate) {
          if (this.userProfile) {
            console.log('[App] Destroying existing UserProfile');
            this.userProfile.destroy();
          }
          console.log('[App] Creating new UserProfile with 2FA status:', currentUser.twoFactorEnabled);
          this.userProfile = new UserProfile(currentUser, true);
        }
        mainContent.appendChild(this.userProfile.render());
      }
    } else {
      // 로그아웃 상태일 때 기존 UserProfile 정리
      if (this.userProfile) {
        this.userProfile.destroy();
        this.userProfile = null;
      }
      // 사용자 프로필 데이터 초기화
      this.lastUserProfileData = null;
      
      // this.pongGame.setGameMode('demo');
      // mainContent.appendChild(this.pongGame.render());
      // this.pongGame.start();
    }
    
    // Update status bar to reflect current state
    this.updateStatusBar();
    
    // 로그인 상태일 때 터미널에 자동 포커스 (게임 중이 아닌 경우)
    if (isLoggedIn && !this.isInGame) {
      setTimeout(() => {
        this.mainTerminal.focus();
      }, 200);
    }
  }

  private updateStatusBar(): void {
    const statusIndicator = this.appElement.querySelector('.status-indicator') as HTMLElement;
    const statusElement = this.appElement.querySelector('.status-text') as HTMLElement;
    const routeElement = this.appElement.querySelector('.route-text') as HTMLElement;
    
    const isLoggedIn = authStore.getIsLoggedIn();
    
    if (statusIndicator) {
      statusIndicator.textContent = isLoggedIn ? '●' : '○';
      statusIndicator.className = `text-sm ${isLoggedIn ? 'text-terminal-lightGreen' : 'text-terminal-gray'}`;
    }
    if (statusElement) {
      statusElement.textContent = this.getStatusText();
    }
    if (routeElement) {
      routeElement.textContent = `Route: ${window.location.hash || '#/'}`;
    }
  }

  private getStatusText(): string {
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    
    if (isLoggedIn === null) return 'Authenticating...';
    if (isLoggedIn) return currentUser?.username || '';
    return 'Not logged in';
  }

  /**
   * UserProfile 재생성이 필요한지 확인
   */
  private shouldRecreateUserProfile(currentUser: User): boolean {
    console.log('[App] Checking if UserProfile should be recreated:', {
      hasLastData: !!this.lastUserProfileData,
      currentUser2FA: currentUser.twoFactorEnabled,
      lastData2FA: this.lastUserProfileData?.twoFactorEnabled
    });

    if (!this.lastUserProfileData) {
      // 처음 생성하는 경우
      console.log('[App] First time creating UserProfile');
      this.lastUserProfileData = {
        id: currentUser.id,
        twoFactorEnabled: currentUser.twoFactorEnabled,
        username: currentUser.username
      };
      return true;
    }

    // 중요한 사용자 데이터가 변경되었는지 확인
    const hasChanged = 
      this.lastUserProfileData.id !== currentUser.id ||
      this.lastUserProfileData.twoFactorEnabled !== currentUser.twoFactorEnabled ||
      this.lastUserProfileData.username !== currentUser.username;

    console.log('[App] UserProfile data comparison:', {
      hasChanged,
      changes: {
        id: this.lastUserProfileData.id !== currentUser.id,
        twoFactorEnabled: this.lastUserProfileData.twoFactorEnabled !== currentUser.twoFactorEnabled,
        username: this.lastUserProfileData.username !== currentUser.username
      },
      old: this.lastUserProfileData,
      new: {
        id: currentUser.id,
        twoFactorEnabled: currentUser.twoFactorEnabled,
        username: currentUser.username
      }
    });

    if (hasChanged) {
      console.log('[App] User data changed, recreating UserProfile');
      
      // 새로운 상태 저장
      this.lastUserProfileData = {
        id: currentUser.id,
        twoFactorEnabled: currentUser.twoFactorEnabled,
        username: currentUser.username
      };
    }

    return hasChanged;
  }


  // ===== GAME MANAGEMENT =====

  private handleGameEnd(_winner: 'left' | 'right'): void {
    // Get actual game result from PongGame (should be called before stop() in PongGame)
    // const gameResult = this.pongGame.getGameResult();
    
    // // Show game end modal with real data
    // const gameEndModal = new GameEndModal(
    //   // gameResult,
    //   false, // isTournament - TODO: detect actual tournament mode
    //   true,  // isFinal
    //   () => {
    //     // On profile click
    //     this.state.isInGame = false;
    //     this.router.navigate('/profile');
    //   }
    // );
    
    // gameEndModal.show();
  }

  // ===== COMMAND HANDLER HELPERS =====

  /**
   * CommandHandler에서 사용할 게임 시작 헬퍼
   */
  private async handlePlayGame(gameConfig: any): Promise<void> {
    if (!gameConfig) {
      try {
        // Stop any existing game first
        this.pongGame.stop();
        
        const gameSetupModal = new GameSetupModal();
        const result = await gameSetupModal.open();

        if (result) {
          const { mode, opponents } = result;
          this.mainTerminal.appendOutput(`Starting ${mode} game...`);

          const currentUser = authStore.getCurrentUser();
          if (currentUser) {
            const player1: Player = {
              nickname: currentUser.nickname || currentUser.username,
              avatarUrl: currentUser.avatarUrl,
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
            this.isInGame = true;
            
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

  /**
   * CommandHandler에서 사용할 모달 표시 헬퍼
   */
  private async handleShowModal(modalType: string, options?: any): Promise<any> {
    switch (modalType) {
      case 'login':
        return this.showLoginModal();
      case 'register':
        return this.showRegisterModal();
      case '2fa':
        return this.handle2FAModal(options);
      case 'file':
        return this.showFileModal();
      case 'tournament':
        const tournamentModal = new TournamentTestModal(this.apiClient);
        return tournamentModal.show();
      case 'friend':
        // Could be extended for friend modal
        break;
      default:
        console.warn(`Unknown modal type: ${modalType}`);
    }
  }

  /**
   * CommandHandler에서 사용할 사용자 상태 업데이트 헬퍼
   */
  private handleUserStateUpdate(user: User): void {
    authStore.updateUser(user);
    this.cacheUserState(user);
  }



  private async handle2FALogin(tmpToken: string): Promise<void> {
    console.log('[App] handle2FALogin called with tmpToken:', tmpToken);
    this.mainTerminal.appendOutput('Two-factor authentication required. Please enter your verification code.');
    
    console.log('[App] Creating TwoFAModal for login');
    const twoFAModal = new TwoFAModal(
      this.apiClient,
      'login',
      {
        onComplete: async (code?: string) => {
          if (!code) {
            this.mainTerminal.appendOutput('2FA verification cancelled.');
            return;
          }

          try {
            this.mainTerminal.appendOutput('Verifying 2FA code...');
            const user = await this.apiClient.auth.completeTwoFALogin(tmpToken, code);
            
            // 2FA 완료 후 상태 업데이트 및 UI 갱신
            authStore.login(user);
            this.cacheUserState(user); // 사용자 상태 캐시
            this.mainTerminal.reset();
            this.mainTerminal.updateWelcomeMessage(true, user.username);
            this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
            this.mainTerminal.appendOutput('Type "help" to see available commands.');
            
            // UI 강제 새로고침 후 라우팅
            this.render();
            setTimeout(() => {
              this.router.navigate('/profile');
              // 터미널에 포커스 설정
              this.mainTerminal.focus();
            }, 100); // 100ms 지연으로 렌더링 완료 보장
            
            // 모달들 닫기
            twoFAModal.hide();
            if (this.currentLoginModal) {
              console.log('[App] Closing LoginModal after 2FA completion');
              this.currentLoginModal.hide();
              this.currentLoginModal = null;
            }
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
        onCancel: () => {
          this.mainTerminal.appendOutput('2FA verification cancelled.');
          if (this.currentLoginModal) {
            console.log('[App] Closing LoginModal after 2FA cancellation');
            this.currentLoginModal.hide();
            this.currentLoginModal = null;
          }
        }
      }
    );

    console.log('[App] Showing TwoFAModal');
    twoFAModal.show();
  }

  /**
   * 2FA 모달 표시 (CommandHandler에서 전달받은 옵션 사용)
   */
  private async handle2FAModal(options?: any): Promise<void> {
    const { onComplete, onCancel, mode = 'enable' } = options || {};
    
    const twoFAModal = new TwoFAModal(
      this.apiClient,
      mode,
      {
        onComplete: async (code?: string) => {
          if (!code) {
            if (onCancel) onCancel();
            return;
          }

          try {
            if (onComplete) {
              await onComplete(code);
            }
            // TwoFAModal에서 이미 hide()를 호출하므로 여기서는 중복 호출하지 않음
            console.log('[App] 2FA modal completed successfully');
          } catch (error) {
            console.error('[App] Error in 2FA completion callback:', error);
            // 에러 발생 시에도 터미널 포커스 복원
            setTimeout(() => {
              this.mainTerminal.focus();
            }, 100);
          }
        },
        onCancel: () => {
          console.log('[App] 2FA modal cancelled');
          if (onCancel) onCancel();
          // 취소 시에도 터미널 포커스 복원
          setTimeout(() => {
            this.mainTerminal.focus();
          }, 100);
        }
      }
    );

    twoFAModal.show();
  }

  // ===== MODAL MANAGEMENT =====

  private currentLoginModal: any = null; // LoginModal 참조 저장

  private async showLoginModal(): Promise<void> {
    const { LoginModal } = await import('./modals/LoginModal.js');
    
    this.currentLoginModal = new LoginModal(
      this.apiClient,
      {
        onLoginSuccess: async (user: Types.User) => {
          // Login success - 상태 업데이트 후 렌더링과 라우팅을 순차적으로 실행
          authStore.login(user);
          this.cacheUserState(user); // 사용자 상태 캐시
          this.mainTerminal.reset();
          this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
          
          // 펜딩 중인 아바타 파일 업로드
          if (this.pendingAvatarFile) {
            try {
              this.mainTerminal.appendOutput('Uploading your profile picture...');
              await this.apiClient.user.uploadAvatar(this.pendingAvatarFile);
              this.mainTerminal.appendOutput('Profile picture uploaded successfully!');
              this.pendingAvatarFile = null; // 업로드 완료 후 제거
              
              // 아바타 업로드 후 사용자 정보 재로드하여 UI 즉시 반영
              try {
                const updatedUser = await this.apiClient.auth.verifyToken();
                authStore.login(updatedUser);
                this.cacheUserState(updatedUser);
                console.log('🖼️ User profile updated with new avatar');
              } catch (error) {
                console.error('Failed to refresh user profile after avatar upload:', error);
              }
            } catch (error) {
              console.error('Avatar upload failed:', error);
              this.mainTerminal.appendOutput('Failed to upload profile picture. You can try again later with "set avatar" command.');
              this.pendingAvatarFile = null; // 실패해도 제거
            }
          }
          
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          
          // 강제 렌더링 후 라우팅
          this.render();
          setTimeout(() => {
            this.router.navigate('/profile');
            // 터미널에 포커스 설정
            this.mainTerminal.focus();
          }, 100); // 100ms 지연으로 렌더링 완료 보장
        },
        onSwitchToRegister: () => {
          // Switch to register
          this.showRegisterModal();
        },
        on2FARequired: (tmpToken: string) => {
          // 2FA required
          console.log('[App] on2FARequired called with tmpToken:', tmpToken);
          this.handle2FALogin(tmpToken);
        }
      }
    );
    
    this.currentLoginModal.show();
  }

  private async showRegisterModal(): Promise<void> {
    const { RegisterModal } = await import('./modals/RegisterModal.js');
    
    const registerModal = new RegisterModal(
      this.apiClient,
      {
        onRegisterSuccess: (user: Types.User, avatarFile?: File) => {
          // 아바타 파일이 있으면 저장해두기
          if (avatarFile) {
            this.pendingAvatarFile = avatarFile;
            this.mainTerminal.appendOutput(`Account created successfully for ${user.username}!`);
            this.mainTerminal.appendOutput('Profile picture will be uploaded after you log in.');
            this.mainTerminal.appendOutput('Please use the "login" command to sign in to your new account.');
          } else {
            this.mainTerminal.appendOutput(`Account created successfully for ${user.username}!`);
            this.mainTerminal.appendOutput('Please use the "login" command to sign in to your new account.');
          }
        },
        onSwitchToLogin: () => {
          // Switch to login
          this.showLoginModal();
        },
        on2FARequired: (tmpToken: string) => {
          // 2FA required (if needed for registration)
          this.handle2FALogin(tmpToken);
        }
      }
    );
    
    registerModal.show();
  }

  private async showFileModal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileModal = new FileModal(
        'Select Avatar',
        'image/*',
        5 * 1024 * 1024, // 5MB
        async (file: File) => {
          try {
            this.mainTerminal.appendOutput('Uploading avatar...');
            
            // API를 통해 아바타 업로드
            const updatedUser = await this.apiClient.user.uploadAvatar(file);
            console.log('Avatar upload successful, updated user:', updatedUser.nickname, 'avatarUrl:', updatedUser.avatarUrl);
            
            // 사용자 상태 업데이트
            authStore.updateUser(updatedUser);
            this.cacheUserState(updatedUser);
            console.log('authStore updated with new user data');
            
            // UserProfile이 현재 표시되고 있으면 새로고침
            if (this.userProfile) {
              console.log('UserProfile exists, calling refreshUserProfile...');
              this.refreshUserProfile(updatedUser);
            } else {
              console.log('UserProfile is null, not refreshing');
            }
            
            this.mainTerminal.appendOutput('✅ Avatar updated successfully!');
            resolve();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to upload avatar';
            this.mainTerminal.appendOutput(`❌ Avatar upload failed: ${errorMsg}`);
            this.errorHandler.handleError(
              error as Error,
              'App.showFileModal',
              ErrorLevel.ERROR
            );
            reject(error);
          }
        }
      );
      
      fileModal.show();
    });
  }

  /**
   * Refresh UserProfile with updated user data
   */
  private refreshUserProfile(updatedUser: User): void {
    console.log('refreshUserProfile called with user:', updatedUser.nickname, 'avatarUrl:', updatedUser.avatarUrl);
    
    // Check if we're currently on the profile page
    const currentRoute = window.location.hash.replace('#', '') || '/';
    console.log('Current route:', currentRoute);
    
    if (currentRoute === '/profile' || currentRoute.startsWith('/profile/')) {
      console.log('On profile page, refreshing UserProfile...');
      
      // Update the user profile instance with new data
      this.userProfile = new UserProfile(updatedUser, true);
      
      // Force re-render the current view
      this.updateMainContent();
      
      console.log('UserProfile refreshed');
    } else {
      console.log('Not on profile page, skipping refresh');
    }
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

  // Cleanup method for proper store unsubscription
  public cleanup(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    if (this.unsubscribeUserProfile) {
      this.unsubscribeUserProfile();
    }
    // UserProfile cleanup
    if (this.userProfile) {
      this.userProfile.destroy();
      this.userProfile = null;
    }
    this.lastUserProfileData = null;
    
    // BroadcastChannel 정리
    if (this.authChannel) {
      this.authChannel.close();
      this.authChannel = null;
    }
  }
}