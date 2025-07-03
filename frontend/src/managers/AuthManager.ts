import { ApiClient, ApiError } from '../services/ApiClient.js';
import { Router } from '../utils/Router.js';
import { Terminal } from '../components/Terminal.js';
import { ErrorHandler, ErrorLevel } from '../utils/ErrorHandler.js';
import { TokenManager } from '../services/core/TokenManager.js';
import { authStore } from '../store/authStore.js';
import { User } from '../types/types.js';
import { UserStateCache } from '../services/UserStateCache.js';

export class AuthManager {
  private apiClient: ApiClient;
  private router: Router;
  private terminal: Terminal;
  private errorHandler: ErrorHandler;
  
  // 탭 간 동기화를 위한 BroadcastChannel
  private authChannel: BroadcastChannel | null = null;
  

  constructor(
    apiClient: ApiClient,
    router: Router,
    terminal: Terminal,
    errorHandler: ErrorHandler
  ) {
    this.apiClient = apiClient;
    this.router = router;
    this.terminal = terminal;
    this.errorHandler = errorHandler;
    
    this.setupCrossTabSynchronization();
  }

  /**
   * 크로스 탭 동기화 설정
   */
  private setupCrossTabSynchronization(): void {
    try {
      // BroadcastChannel 지원 확인
      if (typeof BroadcastChannel !== 'undefined') {
        this.authChannel = new BroadcastChannel('auth_channel');
        this.authChannel.addEventListener('message', (event) => {
          if (event.data.type === 'logout') {
            console.info('[AuthManager] Received logout event from another tab');
            this.handleCrossTabLogout();
          }
        });
        console.info('[AuthManager] Cross-tab synchronization enabled via BroadcastChannel');
      } else {
        // BroadcastChannel 미지원 시 localStorage 이벤트 사용
        window.addEventListener('storage', (event) => {
          if (event.key === 'auth_logout_event') {
            console.info('[AuthManager] Received logout event from another tab via localStorage');
            this.handleCrossTabLogout();
          }
        });
        console.info('[AuthManager] Cross-tab synchronization enabled via localStorage events');
      }
    } catch (error) {
      console.warn('[AuthManager] Failed to setup cross-tab synchronization:', error);
    }
  }

  /**
   * 크로스 탭 로그아웃 처리
   */
  private handleCrossTabLogout(): void {
    console.info('[AuthManager] Handling cross-tab logout');
    
    // 로그아웃 상태로 업데이트
    authStore.logout();
    UserStateCache.clear();
    
    // 토큰 정리
    TokenManager.clearTokens();
    this.apiClient.clearToken();
    
    // 터미널 메시지 표시
    this.terminal.appendOutput('You have been logged out from another tab.');
    this.terminal.appendOutput('Please use the "login" command to sign in again.');
    
    // 홈으로 이동
    this.router.navigate('/');
  }

  /**
   * 세션 스토리지에서 토큰을 즉시 복원하여 초기 인증 상태 설정
   */
  tryRestoreSessionToken(): void {
    const sessionToken = TokenManager.getAccessToken(); // 이제 세션에서 자동 복원됨
    if (sessionToken) {
      console.log('🔄 Session token restored, setting preliminary auth state');
      
      // 기본 사용자 정보만 복원 (2FA 상태는 API에서만 가져옴)
      const cachedUser = UserStateCache.restore();
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
    } else {
      console.log('❌ No session token found, remaining in logged out state');
    }
  }

  /**
   * 타임아웃과 함께 인증 상태 확인
   */
  async checkAuthStateWithTimeout(): Promise<void> {
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

  /**
   * 인증 상태 확인
   */
  async checkAuthState(): Promise<void> {
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
          UserStateCache.cache(user);
          this.terminal.reset();
          this.terminal.appendOutput(`Welcome back, ${user.username}!`);
          this.terminal.appendOutput('Type "help" to see available commands.');
          
          // OAuth 로그인 시도 추적 정리
          sessionStorage.removeItem('oauth_login_attempt');
          
          setTimeout(() => {
            this.router.navigate('/profile');
            this.terminal.focus();
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
            UserStateCache.cache(userToCache);
            
            console.log('✅ User state updated from API, 2FA:', verifiedUser.twoFactorEnabled);
            console.log('✅ Session token verified, maintaining current state');
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
            UserStateCache.cache(user); // 사용자 상태 캐시
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
                const cachedUser = UserStateCache.restore();
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
        UserStateCache.clear();
      }
      
    } catch (error) {
      console.error('💥 Auth check failed:', error);
      authStore.logout();
    }
  }

  /**
   * 토큰 갱신 시도
   */
  async tryTokenRefresh(): Promise<void> {
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
          
          UserStateCache.cache(user); // 사용자 상태 캐시
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
              UserStateCache.cache(user); // 사용자 상태 캐시
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
        UserStateCache.clear(); // 사용자 상태 캐시 클리어
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
      UserStateCache.clear(); // 사용자 상태 캐시 클리어
      // 에러 발생 시 모든 토큰 정리
      TokenManager.clearTokens();
      this.apiClient.clearToken();
    }
  }

  /**
   * OAuth 콜백 처리
   */
  async handleOAuthCallback(): Promise<User | null> {
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
        'AuthManager.handleOAuthCallback',
        ErrorLevel.WARNING,
        {
          component: 'AuthManager',
          action: 'oauthCallbackFailed'
        }
      );
      
      // Show user-friendly error message
      this.terminal.appendOutput('Google 로그인 중 오류가 발생했습니다.');
      if (error instanceof Error && error.message.includes('409')) {
        this.terminal.appendOutput('이미 등록된 계정일 수 있습니다. 일반 로그인을 시도해보세요.');
      } else {
        this.terminal.appendOutput('잠시 후 다시 시도해주세요.');
      }
    }
    return null;
  }

  /**
   * 정리 메서드
   */
  cleanup(): void {
    // BroadcastChannel 정리
    if (this.authChannel) {
      this.authChannel.close();
      this.authChannel = null;
    }
  }

  // === App.ts에서 이동된 2FA 관련 메서드들 ===

  /**
   * 2FA 로그인 처리 (App.ts에서 이동)
   */
  async handle2FALogin(tmpToken: string): Promise<void> {
    this.terminal.appendOutput('Two-factor authentication required. Please enter your verification code.');
    
    const { TwoFAModal } = await import('../components/modals/TwoFAModal.js');
    
    const twoFAModal = new TwoFAModal(this.apiClient, 'login', {
      onComplete: async (code?: string) => {
        if (!code) {
          this.terminal.appendOutput('2FA verification cancelled.');
          return;
        }
        await this.handle2FAVerification(tmpToken, code, twoFAModal);
      },
      onCancel: () => {
        this.terminal.appendOutput('2FA verification cancelled.');
      }
    });

    twoFAModal.show();
  }

  /**
   * 2FA 검증 처리 (App.ts에서 이동)
   */
  async handle2FAVerification(tmpToken: string, code: string, twoFAModal: any): Promise<void> {
    try {
      this.terminal.appendOutput('Verifying 2FA code...');
      const user = await this.apiClient.auth.completeTwoFALogin(tmpToken, code);
      
      // 로그인 성공 처리
      authStore.login(user);
      UserStateCache.cache(user);
      this.terminal.reset();
      this.terminal.updateWelcomeMessage(true, user.username);
      this.terminal.appendOutput(`Welcome back, ${user.username}!`);
      this.terminal.appendOutput('Type "help" to see available commands.');
      
      setTimeout(() => {
        this.router.navigate('/profile');
        this.terminal.focus();
      }, 100);
      
      // 모달 닫기
      twoFAModal.hide();
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'AuthManager.handle2FAVerification', ErrorLevel.ERROR);
      const message = error instanceof ApiError
        ? `2FA verification failed: ${error.data?.message || 'Invalid code'}`
        : '2FA verification failed. Please try again.';
      this.terminal.appendOutput(message);
    }
  }
}