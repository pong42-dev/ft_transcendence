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
          this.state.isLoggedIn = true;
          this.state.currentUser = user;
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
      
      // 인증 확인 완료 후 터미널에 포커스 (로그인 상태이고 게임 중이 아닌 경우)
      if (this.state.isLoggedIn && !this.state.isInGame) {
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
    
    // 로그인 상태일 때 터미널에 자동 포커스 (게임 중이 아닌 경우)
    if (this.state.isLoggedIn && !this.state.isInGame) {
      setTimeout(() => {
        this.mainTerminal.focus();
      }, 200);
    }
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
      case 'logout':
        await this.handleLogoutCommand();
        break;
      case 'friend':
        await this.handleFriendCommand(args);
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
      case '2fa':
        await this.handle2FACommand(args);
        break;
      case 'set':
        await this.handleSetCommand(args);
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
        '  friend   - Manage friends (friend follow|unfollow|list)\n' +
        '  2fa      - Manage two-factor authentication (2fa enable|disable|status)\n' +
        '  set      - Update profile settings (set avatar|name)\n' +
        '  clear    - Clear the terminal screen'
      : baseHelp + 'Available commands:\n' +
        '  help     - Display this help message\n' +
        '  login    - Open login modal\n' +
        '  register - Open registration modal\n' +
        '  clear    - Clear the terminal screen';
    
    this.mainTerminal.appendOutput(helpText);
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
          this.cacheUserState(user); // 사용자 상태 캐시
          this.mainTerminal.reset();
          this.mainTerminal.updateWelcomeMessage(this.state.isLoggedIn, this.state.currentUser?.username);
          this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
          this.mainTerminal.appendOutput('Type "help" to see available commands.');
          
          // UI 강제 새로고침 후 라우팅
          this.render();
          setTimeout(() => {
            this.router.navigate('/profile');
            // 터미널에 포커스 설정
            this.mainTerminal.focus();
          }, 100); // 100ms 지연으로 렌더링 완료 보장
          
          // 모달을 성공으로 표시하고 닫기
          twoFAModal.markAsCompleted();
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

  private async handleFriendCommand(args?: string[]): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to manage friends.');
      return;
    }

    // If no arguments provided, show help
    if (!args || args.length === 0) {
      this.mainTerminal.appendOutput('Usage: friend <follow|unfollow|list> [username]');
      this.mainTerminal.appendOutput('  friend follow <username>   - Follow a user');
      this.mainTerminal.appendOutput('  friend unfollow <username> - Unfollow a user');
      this.mainTerminal.appendOutput('  friend list                - Show friends list');
      return;
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'follow':
        await this.handleFriendFollow(args.slice(1));
        break;
      case 'unfollow':
        await this.handleFriendUnfollow(args.slice(1));
        break;
      case 'list':
        await this.handleFriendList();
        break;
      default:
        this.mainTerminal.appendOutput(`Unknown friend command: ${subCommand}`);
        this.mainTerminal.appendOutput('Usage: friend <follow|unfollow|list> [username]');
    }
  }

  private async handleFriendFollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.mainTerminal.appendOutput('Usage: friend follow <username>');
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.mainTerminal.appendOutput('Please provide a username to follow.');
      return;
    }

    try {
      this.mainTerminal.appendOutput(`Following ${username}...`);
      await this.apiClient.friend.addFriend(username);
      this.mainTerminal.appendOutput(`✅ Successfully followed ${username}`);
    } catch (error) {
      let errorMessage = `❌ Failed to follow ${username}.`;
      if (error instanceof Error) {
        if (error.message.includes('already following')) {
          errorMessage = `You are already following ${username}.`;
        } else if (error.message.includes('User not found')) {
          errorMessage = `User ${username} not found.`;
        } else if (error.message.includes('cannot follow yourself')) {
          errorMessage = 'You cannot follow yourself.';
        }
      }
      this.mainTerminal.appendOutput(errorMessage);
    }
  }

  private async handleFriendUnfollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.mainTerminal.appendOutput('Usage: friend unfollow <username>');
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.mainTerminal.appendOutput('Please provide a username to unfollow.');
      return;
    }

    try {
      this.mainTerminal.appendOutput(`Unfollowing ${username}...`);
      
      // Get friend list to find the friend ID
      const friends = await this.apiClient.friend.getFriends();
      const friend = friends.find(f => f.username === username);
      
      if (!friend || !friend.id) {
        this.mainTerminal.appendOutput(`You are not following ${username}.`);
        return;
      }

      await this.apiClient.friend.removeFriend(friend.id);
      this.mainTerminal.appendOutput(`✅ Successfully unfollowed ${username}`);
    } catch (error) {
      let errorMessage = `❌ Failed to unfollow ${username}.`;
      if (error instanceof Error) {
        if (error.message.includes('not following')) {
          errorMessage = `You are not following ${username}.`;
        } else if (error.message.includes('User not found')) {
          errorMessage = `User ${username} not found.`;
        }
      }
      this.mainTerminal.appendOutput(errorMessage);
    }
  }

  private async handleFriendList(): Promise<void> {
    try {
      this.mainTerminal.appendOutput('Loading friends list...');
      const friends = await this.apiClient.friend.getFriends();
      
      if (friends.length === 0) {
        this.mainTerminal.appendOutput('You have no friends yet. Use "friend follow <username>" to follow someone.');
        return;
      }

      this.mainTerminal.appendOutput(`\nFriends (${friends.length}):`);
      this.mainTerminal.appendOutput('─'.repeat(50));
      
      friends.forEach((friend, index) => {
        const statusIcon = friend.status === 'online' ? '🟢' : 
                          friend.status === 'inGame' ? '🎮' : '⚫';
        const blockedText = friend.blocked ? ' [BLOCKED]' : '';
        this.mainTerminal.appendOutput(
          `${(index + 1).toString().padStart(2)}. ${statusIcon} ${friend.username} (${friend.nickname})${blockedText}`
        );
      });
      
      this.mainTerminal.appendOutput('─'.repeat(50));
    } catch (error) {
      this.mainTerminal.appendOutput('❌ Failed to load friends list. Please try again.');
      console.error('Friend list error:', error);
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
        // Login success - 상태 업데이트 후 렌더링과 라우팅을 순차적으로 실행
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
        this.cacheUserState(user); // 사용자 상태 캐시
        this.mainTerminal.reset();
        this.mainTerminal.appendOutput(`Welcome back, ${user.username}!`);
        this.mainTerminal.appendOutput('Type "help" to see available commands.');
        
        // 강제 렌더링 후 라우팅
        this.render();
        setTimeout(() => {
          this.router.navigate('/profile');
          // 터미널에 포커스 설정
          this.mainTerminal.focus();
        }, 100); // 100ms 지연으로 렌더링 완료 보장
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
        // Register success - show success message only (no auto-login)
        this.mainTerminal.appendOutput(`Account created successfully for ${user.username}!`);
        this.mainTerminal.appendOutput('Please use the "login" command to sign in to your new account.');
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

  /**
   * 2FA 관련 명령어 처리
   */
  private async handle2FACommand(args: string[]): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to manage 2FA settings.');
      return;
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'enable':
        await this.handle2FAEnable();
        break;
      case 'disable':
        await this.handle2FADisable();
        break;
      case 'status':
        this.handle2FAStatus();
        break;
      default:
        this.mainTerminal.appendOutput('Usage: 2fa <enable|disable|status>');
        this.mainTerminal.appendOutput('  2fa enable  - Enable two-factor authentication');
        this.mainTerminal.appendOutput('  2fa disable - Disable two-factor authentication');
        this.mainTerminal.appendOutput('  2fa status  - Check current 2FA status');
    }
  }

  /**
   * 2FA 활성화 처리
   */
  private async handle2FAEnable(): Promise<void> {
    if (this.state.currentUser?.twoFactorEnabled) {
      this.mainTerminal.appendOutput('2FA is already enabled. Use "2fa disable" to disable it first.');
      return;
    }

    this.mainTerminal.appendOutput('Starting 2FA setup process...');
    
    try {
      const { TwoFAModal } = await import('./TwoFAModal.js');
      const twoFAModal = new TwoFAModal(
        this.apiClient,
        'enable',
        async () => {
          // Success callback
          if (this.state.currentUser) {
            this.state.currentUser.twoFactorEnabled = true;
            // Update cached user data (excluding 2FA state as per our earlier fix)
            const userToCache = { ...this.state.currentUser };
            delete (userToCache as any).twoFactorEnabled;
            this.cacheUserState(userToCache);
          }
          this.mainTerminal.appendOutput('✅ 2FA has been successfully enabled.');
        },
        () => {
          // Cancel callback
          this.mainTerminal.appendOutput('2FA setup cancelled.');
        }
      );
      await twoFAModal.show();
    } catch (error) {
      this.mainTerminal.appendOutput('❌ Failed to start 2FA setup. Please try again.');
      console.error('2FA enable error:', error);
    }
  }

  /**
   * 2FA 비활성화 처리
   */
  private async handle2FADisable(): Promise<void> {
    if (!this.state.currentUser?.twoFactorEnabled) {
      this.mainTerminal.appendOutput('2FA is already disabled.');
      return;
    }

    this.mainTerminal.appendOutput('Starting 2FA disable process...');
    
    try {
      const { TwoFAModal } = await import('./TwoFAModal.js');
      const twoFAModal = new TwoFAModal(
        this.apiClient,
        'disable',
        async () => {
          // Success callback
          if (this.state.currentUser) {
            this.state.currentUser.twoFactorEnabled = false;
            // Update cached user data (excluding 2FA state as per our earlier fix)
            const userToCache = { ...this.state.currentUser };
            delete (userToCache as any).twoFactorEnabled;
            this.cacheUserState(userToCache);
          }
          this.mainTerminal.appendOutput('✅ 2FA has been successfully disabled.');
        },
        () => {
          // Cancel callback
          this.mainTerminal.appendOutput('2FA disable cancelled.');
        }
      );
      await twoFAModal.show();
    } catch (error) {
      this.mainTerminal.appendOutput('❌ Failed to disable 2FA. Please try again.');
      console.error('2FA disable error:', error);
    }
  }

  /**
   * 2FA 상태 확인
   */
  private handle2FAStatus(): void {
    if (!this.state.currentUser) {
      this.mainTerminal.appendOutput('Unable to check 2FA status - user data not available.');
      return;
    }

    const status = this.state.currentUser.twoFactorEnabled ? 'Enabled' : 'Disabled';
    const statusIcon = this.state.currentUser.twoFactorEnabled ? '🔒' : '🔓';
    
    this.mainTerminal.appendOutput(`${statusIcon} Two-Factor Authentication: ${status}`);
    
    if (this.state.currentUser.twoFactorEnabled) {
      this.mainTerminal.appendOutput('Your account is protected with 2FA.');
    } else {
      this.mainTerminal.appendOutput('Consider enabling 2FA for better security. Use "2fa enable" to set it up.');
    }
  }

  /**
   * set 명령어 처리 (profile settings)
   */
  private async handleSetCommand(args: string[]): Promise<void> {
    if (!this.state.isLoggedIn) {
      this.mainTerminal.appendOutput('Please login first to update profile settings.');
      return;
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'avatar':
        await this.handleSetAvatar();
        break;
      case 'name':
        await this.handleSetName(args.slice(1));
        break;
      default:
        this.mainTerminal.appendOutput('Usage: set <avatar|name> [value]');
        this.mainTerminal.appendOutput('  set avatar     - Upload new avatar image');
        this.mainTerminal.appendOutput('  set name <new> - Change display name');
    }
  }

  /**
   * 아바타 업데이트 처리
   */
  private async handleSetAvatar(): Promise<void> {
    this.mainTerminal.appendOutput('Opening file selector for avatar upload...');
    
    try {
      const { FileModal } = await import('./FileModal.js');
      const fileModal = new FileModal(async (file: File) => {
        try {
          this.mainTerminal.appendOutput(`Uploading avatar: ${file.name} (${(file.size / 1024).toFixed(1)}KB)...`);
          
          // Call API to update avatar
          const updatedUser = await this.apiClient.user.uploadAvatar(file);
          
          // Update current user state
          if (this.state.currentUser) {
            this.state.currentUser.avatarUrl = updatedUser.avatarUrl;
            this.state.currentUser.nickname = updatedUser.nickname;
            
            // Update cached user data (excluding 2FA state)
            const userToCache = { ...this.state.currentUser };
            delete (userToCache as any).twoFactorEnabled;
            this.cacheUserState(userToCache);
          }
          
          this.mainTerminal.appendOutput('✅ Avatar updated successfully!');
          
          // Re-render profile if currently viewing
          if (this.userProfile) {
            this.userProfile = new UserProfile(this.state.currentUser!, true);
            this.updateMainContent();
          }
          
        } catch (error) {
          this.mainTerminal.appendOutput('❌ Failed to update avatar. Please try again.');
          console.error('Avatar update error:', error);
        }
      });
      
      fileModal.show();
    } catch (error) {
      this.mainTerminal.appendOutput('❌ Failed to open file selector. Please try again.');
      console.error('FileModal error:', error);
    }
  }

  /**
   * 이름 업데이트 처리
   */
  private async handleSetName(args: string[]): Promise<void> {
    const newName = args.join(' ').trim();
    
    if (!newName) {
      this.mainTerminal.appendOutput('Usage: set name <new_name>');
      this.mainTerminal.appendOutput('Example: set name John or set name "John Doe"');
      return;
    }
    
    if (newName.length < 2 || newName.length > 20) {
      this.mainTerminal.appendOutput('Name must be between 2 and 20 characters.');
      return;
    }
    
    try {
      this.mainTerminal.appendOutput(`Updating name to: "${newName}"...`);
      
      // Call API to update name
      const updatedUser = await this.apiClient.user.updateName(newName);
      
      console.log('Name update response:', updatedUser);
      
      // Update current user state
      if (this.state.currentUser) {
        this.state.currentUser.nickname = updatedUser.nickname;
        this.state.currentUser.username = updatedUser.username;
        
        // Update cached user data (excluding 2FA state)
        const userToCache = { ...this.state.currentUser };
        delete (userToCache as any).twoFactorEnabled;
        this.cacheUserState(userToCache);
      }
      
      this.mainTerminal.appendOutput(`✅ Name updated successfully to: "${updatedUser.nickname}"`);
      
      // Re-render profile if currently viewing
      if (this.userProfile) {
        this.userProfile = new UserProfile(this.state.currentUser!, true);
        this.updateMainContent();
      }
      
    } catch (error) {
      console.error('Name update error:', error);
      let errorMessage = '❌ Failed to update name. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          errorMessage = '❌ This name is already taken. Please choose a different name.';
        } else if (error.message.includes('2 characters')) {
          errorMessage = '❌ Name must be at least 2 characters long.';
        } else if (error.message.includes('20 characters')) {
          errorMessage = '❌ Name must be 20 characters or less.';
        } else if (error.message.includes('Name update failed')) {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      this.mainTerminal.appendOutput(errorMessage);
    }
  }
}