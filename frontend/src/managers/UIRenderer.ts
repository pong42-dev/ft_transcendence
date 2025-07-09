import { Terminal } from '../components/Terminal.js';
import { UserProfile } from '../components/UserProfile.js';
import { ApiClient } from '../services/ApiClient.js';
import { authStore } from '../store/authStore.js';
import { User } from '../types/types.js';
import { DOMUpdater } from '../utils/DOMUpdater.js';
import i18next from 'i18next';

export class UIRenderer {
  private appElement: HTMLElement;
  private mainTerminal: Terminal;
  private apiClient: ApiClient;
  private isRendering = false;
  
  // UI State
  private userProfile: UserProfile | null = null;
  private isInGame = false;
  private lastUserProfileData: { id: string; twoFactorEnabled: boolean; username: string } | null = null;

  constructor(appElement: HTMLElement, mainTerminal: Terminal, apiClient: ApiClient) {
    this.appElement = appElement;
    this.mainTerminal = mainTerminal;
    this.apiClient = apiClient;
  }

  /**
   * 메인 렌더링 메서드
   */
  render(): void {
    // 렌더링 중복 방지
    if (this.isRendering) {
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

  /**
   * 초기 레이아웃 생성
   */
  private initializeLayout(): void {
    const layoutHTML = `
      <div class="flex flex-col h-full border border-terminal-gray rounded-lg overflow-hidden relative">
        <!-- Header -->
        <div class="app-header flex items-center p-2 bg-terminal-black border-b border-terminal-gray">
          <div class="flex space-x-2 ml-2">
            <div class="w-3 h-3 rounded-full bg-terminal-red"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-yellow"></div>
            <div class="w-3 h-3 rounded-full bg-terminal-lightGreen"></div>
          </div>
          <div class="header-title flex-grow text-center text-gray-400 text-sm">
            ${i18next.t('header.title')} <span class="mode-indicator"></span>
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
            <span class="status-text text-gray-400 text-sm">${i18next.t('statusBar.notLoggedIn')}</span>
          </div>
          <div class="route-text text-gray-400 text-sm">${i18next.t('statusBar.route')}#/</div>
        </div>
      </div>
    `;

    DOMUpdater.updateHTML(this.appElement, layoutHTML);

    // Insert terminal once using DOMUpdater
    const terminalContainer = this.appElement.querySelector('.terminal-container') as HTMLElement;
    if (terminalContainer) {
      terminalContainer.appendChild(this.mainTerminal.render());
    }
  }

  /**
   * 헤더 업데이트
   */
  private updateHeader(): void {
    const modeText = this.apiClient.shouldUseMockData() ? '[MOCK]' : '[LIVE]';
    DOMUpdater.updateText('.mode-indicator', modeText);
  }

  /**
   * 메인 콘텐츠 업데이트
   */
  private updateMainContent(): void {
    const mainContent = this.appElement.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;
    
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    
    // Don't update content until auth is resolved
    if (isLoggedIn === null) {
      DOMUpdater.updateHTML(mainContent, `<div class="flex items-center justify-center h-full text-terminal-lightGreen">${i18next.t('statusBar.authenticating')}</div>`);
      return;
    }
    
    // 터미널 메시지 업데이트 (로그인 상태에 따라)
    this.mainTerminal.updateWelcomeMessage(isLoggedIn, currentUser?.username);
    
    DOMUpdater.updateHTML(mainContent, '');
    
    // Now we know the real auth state - safe to proceed
    if (isLoggedIn && currentUser) {
      if (this.isInGame) {
        // Game content would go here
        DOMUpdater.updateHTML(mainContent, `<div class="flex items-center justify-center h-full text-terminal-green">${i18next.t('mainContent.gameViewComingSoon')}</div>`);
      } else {
        // UserProfile이 없거나 사용자 데이터가 변경된 경우 새로 생성
        // 현재 사용자 프로필로 돌아올 때는 항상 재생성하여 다른 사용자 프로필 상태 정리
        const shouldRecreate = !this.userProfile || this.shouldRecreateUserProfile(currentUser);
        
        // 기존 UserProfile 정리 (다른 사용자 프로필일 수 있으므로 강제 정리)
        if (this.userProfile) {
          this.userProfile.destroy();
        }
        
        // 현재 사용자 프로필로 새로 생성
        this.userProfile = new UserProfile(currentUser, true);
        
        // Clear main content and append user profile using DOMUpdater
        DOMUpdater.updateHTML(mainContent, '');
        mainContent.appendChild(this.userProfile!.render());
      }
    } else {
      // 로그아웃 상태일 때 기존 UserProfile 정리
      if (this.userProfile) {
        this.userProfile.destroy();
        this.userProfile = null;
      }
      // 사용자 프로필 데이터 초기화
      this.lastUserProfileData = null;
      
      // Demo content
      DOMUpdater.updateHTML(mainContent, `<div class="flex items-center justify-center h-full text-terminal-gray">${i18next.t('mainContent.welcomeMessage')}<br/>${i18next.t('mainContent.loginPrompt')}</div>`);
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

  /**
   * 상태바 업데이트
   */
  private updateStatusBar(): void {
    const isLoggedIn = authStore.getIsLoggedIn();
    
    // 상태 인디케이터 업데이트
    DOMUpdater.updateText('.status-indicator', isLoggedIn ? '●' : '○');
    DOMUpdater.updateAttribute('.status-indicator', 'class', 
      `text-sm ${isLoggedIn ? 'text-terminal-lightGreen' : 'text-terminal-gray'}`);
    
    // 상태 텍스트 업데이트
    DOMUpdater.updateText('.status-text', this.getStatusText());
    
    // 라우트 정보 업데이트
    DOMUpdater.updateText('.route-text', `${i18next.t('statusBar.route')}${window.location.hash || '#/'}`);
  }

  /**
   * 상태 텍스트 생성
   */
  private getStatusText(): string {
    const isLoggedIn = authStore.getIsLoggedIn();
    const currentUser = authStore.getCurrentUser();
    
    if (isLoggedIn === null) return i18next.t('statusBar.authenticating');
    if (isLoggedIn) return currentUser?.username || '';
    return i18next.t('statusBar.notLoggedIn');
  }

  /**
   * UserProfile 재생성이 필요한지 확인
   */
  private shouldRecreateUserProfile(currentUser: User): boolean {

    if (!this.lastUserProfileData) {
      // 처음 생성하는 경우
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


    if (hasChanged) {
      
      // 새로운 상태 저장
      this.lastUserProfileData = {
        id: currentUser.id,
        twoFactorEnabled: currentUser.twoFactorEnabled,
        username: currentUser.username
      };
    }

    return hasChanged;
  }

  /**
   * UserProfile을 새로운 사용자 데이터로 새로고침
   */
  refreshUserProfile(updatedUser: User): void {
    
    // Check if we're currently on the profile page
    const currentRoute = window.location.hash.replace('#', '') || '/';
    
    if (currentRoute === '/profile' || currentRoute.startsWith('/profile/')) {
      
      // Update the user profile instance with new data
      this.userProfile = new UserProfile(updatedUser, true);
      
      // Force re-render the current view
      this.updateMainContent();
      
    } else {
    }
  }

  /**
   * 다른 사용자의 프로필을 렌더링
   */
  renderOtherUserProfile(otherUser: User): void {
    const mainContent = this.appElement.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;

    // 기존 UserProfile 정리
    if (this.userProfile) {
      this.userProfile.destroy();
    }
8
    // 다른 사용자 프로필 생성 (isCurrentUser = false)
    this.userProfile = new UserProfile(otherUser, false);

    // 메인 컨텐츠 업데이트
    DOMUpdater.updateHTML(mainContent, '');
    mainContent.appendChild(this.userProfile.render());

    // 상태바 업데이트
    this.updateStatusBar();

    // 터미널에 포커스
    if (!this.isInGame) {
      setTimeout(() => {
        this.mainTerminal.focus();
      }, 200);
    }
  }

  /**
   * 게임 상태 설정
   */
  setGameState(isInGame: boolean): void {
    this.isInGame = isInGame;
  }

  /**
   * 현재 게임 상태 반환
   */
  getGameState(): boolean {
    return this.isInGame;
  }

  /**
   * UserProfile 인스턴스 반환
   */
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * 정리 메서드
   */
  cleanup(): void {
    if (this.userProfile) {
      this.userProfile.destroy();
      this.userProfile = null;
    }
    this.lastUserProfileData = null;
  }
}