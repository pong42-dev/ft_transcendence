import { User, MatchHistory } from '../types/types.js';
import { ApiClient } from '../services/ApiClient.js';

export class UserProfile {
  private user: User;
  private profileElement: HTMLElement;
  private isCurrentUser: boolean;
  private apiClient: ApiClient;

  constructor(user: User, isCurrentUser: boolean = false, apiClient?: ApiClient) {
    this.user = user;
    this.profileElement = document.createElement('div');
    this.isCurrentUser = isCurrentUser;
    this.apiClient = apiClient || new ApiClient();
  }

  public render(): HTMLElement {
    // 현재 사용자인 경우 캐시된 2FA 상태와 동기화 (동기적으로 처리)
    if (this.isCurrentUser) {
      this.syncTwoFAStateWithCacheSync();
    }
    
    this.profileElement.className = 'w-full h-full bg-terminal-black text-terminal-green overflow-y-auto scrollbar-hide';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'p-3 space-y-3';

    contentWrapper.appendChild(this.renderUserInfo());
    contentWrapper.appendChild(this.renderStatsSection());
    contentWrapper.appendChild(this.renderMatchHistorySection());
    
    // Clear and update profile element
    this.profileElement.innerHTML = '';
    this.profileElement.appendChild(contentWrapper);
    
    // Add event listeners for current user
    if (this.isCurrentUser) {
      this.attachEventListeners();
    }
    
    return this.profileElement;
  }

  private renderUserInfo(): HTMLElement {
    const userInfo = document.createElement('div');
    userInfo.className = 'flex items-start space-x-4 bg-terminal-black rounded-lg p-4';
    
    const avatar = document.createElement('div');
    avatar.className = 'w-16 h-16 rounded-full border-2 border-terminal-green flex items-center justify-center flex-shrink-0';
    
    if (this.user.avatarUrl) {
      const avatarImg = document.createElement('img');
      avatarImg.src = this.user.avatarUrl;
      avatarImg.className = 'w-full h-full rounded-full object-cover';
      avatar.appendChild(avatarImg);
    } else {
      const avatarIcon = document.createElement('div');
      avatarIcon.className = 'text-terminal-green text-3xl';
      avatarIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c0-.001-.001-.049-.05-.149C12.478 12.5 11.421 11 8 11s-4.478 1.5-4.95 1.846c-.05.1-.05.148-.05.149h8Z"/></svg>';
      avatar.appendChild(avatarIcon);
    }
    
    const userDetails = document.createElement('div');
    userDetails.className = 'flex flex-col flex-grow min-w-0';
    
    const nameContainer = document.createElement('div');
    nameContainer.className = 'flex items-center gap-2';
    
    const username = document.createElement('div');
    username.className = 'text-xl text-terminal-green font-bold truncate';
    username.textContent = this.user.nickname || 'Player607';
    
    nameContainer.appendChild(username);

    // Only show email and 2FA status for current user
    if (this.isCurrentUser) {
      const email = document.createElement('div');
      email.className = 'text-terminal-green opacity-80 truncate text-sm';
      const [localPart, domain] = this.user.username.split('@');
      email.textContent = localPart + '@' + domain;
      nameContainer.appendChild(email);
      
      const securityStatus = document.createElement('div');
      securityStatus.className = 'flex items-center justify-between mt-2';
      
      const statusInfo = document.createElement('div');
      statusInfo.className = 'flex items-center text-sm';
      statusInfo.innerHTML = `
        2FA ${this.user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        <div class="ml-2 w-2 h-2 rounded-full ${this.user.twoFactorEnabled ? 'bg-terminal-green' : 'bg-terminal-red'}"></div>
      `;
      
      const twoFAButton = document.createElement('button');
      twoFAButton.className = `px-3 py-1 text-xs rounded border transition-all ${
        this.user.twoFactorEnabled 
          ? 'border-terminal-red text-terminal-red hover:bg-terminal-red hover:bg-opacity-10' 
          : 'border-terminal-green text-terminal-green hover:bg-terminal-green hover:bg-opacity-10'
      }`;
      twoFAButton.textContent = this.user.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA';
      twoFAButton.id = 'twofa-toggle-btn';
      
      securityStatus.appendChild(statusInfo);
      securityStatus.appendChild(twoFAButton);
      userDetails.appendChild(securityStatus);
    }
    
    userDetails.appendChild(nameContainer);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(userDetails);

    return userInfo;
  }

  private renderStatsSection(): HTMLElement {
    const statsSection = document.createElement('div');
    statsSection.className = 'bg-terminal-gray bg-opacity-10 rounded-lg p-3';
    
    const statsTitle = document.createElement('div');
    statsTitle.className = 'text-lg text-terminal-green mb-2 font-bold';
    statsTitle.textContent = 'Game Stats';
    
    const statsContainer = document.createElement('div');
    statsContainer.className = 'grid grid-cols-3 gap-3';
    
    const statsItems = [
      { value: this.user.gamesPlayed.toString(), label: 'Games' },
      { value: this.user.gamesWon.toString(), label: 'Wins' },
      { value: `${Math.round((this.user.gamesWon / this.user.gamesPlayed) * 100 || 0)}%`, label: 'Win Rate' }
    ];
    
    statsItems.forEach(item => {
      const statItem = document.createElement('div');
      statItem.className = 'flex flex-col items-center p-2 bg-terminal-gray bg-opacity-5 rounded-lg hover:bg-opacity-20 transition-colors';
      
      const statValue = document.createElement('div');
      statValue.className = 'text-xl text-terminal-green font-bold';
      statValue.textContent = item.value;
      
      const statLabel = document.createElement('div');
      statLabel.className = 'text-terminal-green opacity-80 text-xs';
      statLabel.textContent = item.label;
      
      statItem.appendChild(statValue);
      statItem.appendChild(statLabel);
      statsContainer.appendChild(statItem);
    });
    
    statsSection.appendChild(statsTitle);
    statsSection.appendChild(statsContainer);

    return statsSection;
  }

  private renderMatchHistorySection(): HTMLElement {
    const matchHistorySection = document.createElement('div');
    matchHistorySection.className = 'bg-terminal-gray bg-opacity-10 rounded-lg p-3';
    
    const matchHistoryTitle = document.createElement('div');
    matchHistoryTitle.className = 'text-lg text-terminal-green mb-3 font-bold';
    matchHistoryTitle.textContent = 'Match History';
    
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.className = 'flex mb-3 border-b border-terminal-gray border-opacity-30';
    
    const oneVsOneTab = document.createElement('button');
    oneVsOneTab.className = 'px-4 py-2 text-sm font-medium text-terminal-green border-b-2 border-terminal-green';
    oneVsOneTab.textContent = '1vs1';
    oneVsOneTab.setAttribute('data-tab', '1v1');
    
    const tournamentTab = document.createElement('button');
    tournamentTab.className = 'px-4 py-2 text-sm font-medium text-terminal-gray border-b-2 border-transparent hover:text-terminal-green hover:border-terminal-green hover:border-opacity-50';
    tournamentTab.textContent = 'Tournament';
    tournamentTab.setAttribute('data-tab', 'tournament');
    
    tabContainer.appendChild(oneVsOneTab);
    tabContainer.appendChild(tournamentTab);
    
    // Create content containers
    const oneVsOneList = document.createElement('div');
    oneVsOneList.className = 'space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide';
    oneVsOneList.setAttribute('data-content', '1v1');
    
    const tournamentList = document.createElement('div');
    tournamentList.className = 'space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide hidden';
    tournamentList.setAttribute('data-content', 'tournament');

    // Add sample match history data (replace with actual data)
    const sampleHistory: MatchHistory[] = [
      {
        date: '2025-01-15',
        opponent: 'GameMaster',
        rank: 1,
        type: '1v1',
        my_score: 5,
        opponent_score: 3
      },
      {
        date: '2025-01-14',
        opponent: ['ProGamer', 'GameMaster', 'PongKing'],
        rank: 2,
        type: 'tournament'
      },
      {
        date: '2025-01-13',
        opponent: 'PongKing',
        rank: 2,
        type: '1v1',
        my_score: 3,
        opponent_score: 5
      },
      {
        date: '2025-01-12',
        opponent: ['Champion', 'ProPlayer', 'GameMaster', 'PongKing'],
        rank: 1,
        type: 'tournament'
      },
      {
        date: '2025-01-11',
        opponent: 'Champion',
        rank: 1,
        type: '1v1',
        my_score: 5,
        opponent_score: 2
      }
    ];

    // Separate matches by type
    const oneVsOneMatches = sampleHistory.filter(match => match.type === '1v1');
    const tournamentMatches = sampleHistory.filter(match => match.type === 'tournament');

    oneVsOneMatches.forEach(match => {
      oneVsOneList.appendChild(this.renderMatchHistoryItem(match));
    });

    tournamentMatches.forEach(match => {
      tournamentList.appendChild(this.renderMatchHistoryItem(match));
    });

    // Add empty state for tabs if no matches
    if (oneVsOneMatches.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-8 text-terminal-gray opacity-70';
      emptyState.textContent = 'No 1vs1 matches yet';
      oneVsOneList.appendChild(emptyState);
    }

    if (tournamentMatches.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-8 text-terminal-gray opacity-70';
      emptyState.textContent = 'No tournament matches yet';
      tournamentList.appendChild(emptyState);
    }

    // Add tab event listeners
    const handleTabClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const tabType = target.getAttribute('data-tab');
      
      if (!tabType) return;
      
      // Update tab styles
      tabContainer.querySelectorAll('[data-tab]').forEach(tab => {
        tab.className = 'px-4 py-2 text-sm font-medium text-terminal-gray border-b-2 border-transparent hover:text-terminal-green hover:border-terminal-green hover:border-opacity-50';
      });
      target.className = 'px-4 py-2 text-sm font-medium text-terminal-green border-b-2 border-terminal-green';
      
      // Update content visibility
      oneVsOneList.classList.toggle('hidden', tabType !== '1v1');
      tournamentList.classList.toggle('hidden', tabType !== 'tournament');
    };

    oneVsOneTab.addEventListener('click', handleTabClick);
    tournamentTab.addEventListener('click', handleTabClick);
    
    matchHistorySection.appendChild(matchHistoryTitle);
    matchHistorySection.appendChild(tabContainer);
    matchHistorySection.appendChild(oneVsOneList);
    matchHistorySection.appendChild(tournamentList);

    return matchHistorySection;
  }

  private renderMatchHistoryItem(match: MatchHistory): HTMLElement {
    const item = document.createElement('div');
    item.className = 'flex flex-col bg-terminal-gray bg-opacity-5 p-3 rounded-lg hover:bg-opacity-10 transition-colors';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';

    const dateInfo = document.createElement('div');
    dateInfo.className = 'text-xs opacity-70';
    dateInfo.textContent = match.date;

    const matchType = document.createElement('div');
    matchType.className = 'text-xs px-2 py-0.5 rounded-full bg-terminal-gray bg-opacity-20';
    matchType.textContent = match.type === '1v1' ? '1v1' : 'Tournament';

    header.appendChild(dateInfo);
    header.appendChild(matchType);
    item.appendChild(header);

    const content = document.createElement('div');
    content.className = 'flex items-center justify-between';

    if (match.type === '1v1') {
      content.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="flex flex-col items-center">
            <div class="text-lg font-bold">${match.my_score}</div>
            <div class="text-xs opacity-70">You</div>
          </div>
          <div class="text-sm opacity-50">vs</div>
          <div class="flex flex-col items-center">
            <div class="text-lg font-bold">${match.opponent_score}</div>
            <div class="text-xs opacity-70">${match.opponent}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-xs px-2 py-0.5 rounded-full ${match.rank === 1 ? 'bg-terminal-green bg-opacity-20 text-terminal-green' : 'bg-terminal-red bg-opacity-20 text-terminal-red'}">
            ${match.rank === 1 ? 'Victory' : 'Defeat'}
          </div>
        </div>
      `;
    } else {
      const opponents = Array.isArray(match.opponent) ? match.opponent : [match.opponent];
      const opponentsList = document.createElement('div');
      opponentsList.className = 'flex flex-col gap-1';

      opponents.forEach((opponent, index) => {
        const opponentItem = document.createElement('div');
        opponentItem.className = 'flex items-center gap-2 text-sm';
        opponentItem.innerHTML = `
          <span class="text-xs opacity-70">R${index + 1}:</span>
          <span>${opponent}</span>
        `;
        opponentsList.appendChild(opponentItem);
      });

      const rankBadge = document.createElement('div');
      rankBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-terminal-gray bg-opacity-20';
      rankBadge.textContent = match.rank === 1 ? '🏆 Champion' : match.rank === 2 ? '🥈 Runner-up' : '🥉 Semi-finalist';

      content.appendChild(opponentsList);
      content.appendChild(rankBadge);
    }

    item.appendChild(content);
    return item;
  }

  private attachEventListeners(): void {
    const twoFAButton = this.profileElement.querySelector('#twofa-toggle-btn');
    
    twoFAButton?.addEventListener('click', async () => {
      await this.handleTwoFAToggle();
    });
  }

  private syncTwoFAStateWithCacheSync(): void {
    try {
      // 동기적으로 캐시된 2FA 상태 확인 (localStorage는 동기적)
      const cached = localStorage.getItem('twofa_state');
      if (cached) {
        const data = JSON.parse(cached);
        const cachedTwoFAState = typeof data === 'boolean' ? data : data.enabled;
        
        if (typeof cachedTwoFAState === 'boolean' && cachedTwoFAState !== this.user.twoFactorEnabled) {
          console.log('[UserProfile] Syncing 2FA state with cache:', {
            before: this.user.twoFactorEnabled,
            after: cachedTwoFAState
          });
          this.user.twoFactorEnabled = cachedTwoFAState;
        }
      }
    } catch (error) {
      console.warn('[UserProfile] Failed to sync 2FA state with cache:', error);
    }
  }

  private async syncTwoFAStateWithCache(): Promise<void> {
    try {
      const { TwoFAStateManager } = await import('../services/core/TokenManager.js');
      const cachedTwoFAState = TwoFAStateManager.getTwoFAState();
      
      if (cachedTwoFAState !== null && cachedTwoFAState !== this.user.twoFactorEnabled) {
        console.log('[UserProfile] Syncing 2FA state with cache:', {
          before: this.user.twoFactorEnabled,
          after: cachedTwoFAState
        });
        this.user.twoFactorEnabled = cachedTwoFAState;
      }
    } catch (error) {
      console.warn('[UserProfile] Failed to sync 2FA state with cache:', error);
    }
  }

  private async handleTwoFAToggle(): Promise<void> {
    const { TwoFAModal } = await import('./TwoFAModal.js');
    const { TwoFAStateManager } = await import('../services/core/TokenManager.js');
    
    // 캐시된 2FA 상태를 확인하여 사용자 객체와 동기화
    const cachedTwoFAState = TwoFAStateManager.getTwoFAState();
    if (cachedTwoFAState !== null && cachedTwoFAState !== this.user.twoFactorEnabled) {
      console.warn('[UserProfile] 2FA state mismatch detected, syncing with cache:', {
        userObject: this.user.twoFactorEnabled,
        cached: cachedTwoFAState
      });
      this.user.twoFactorEnabled = cachedTwoFAState;
      this.render(); // UI 다시 렌더링
      return; // 토글 중단하고 올바른 상태로 표시
    }
    
    if (this.user.twoFactorEnabled) {
      // Disable 2FA
      const twoFAModal = new TwoFAModal(
        this.apiClient,
        'disable',
        async () => {
          // Update user state, cache, and re-render
          this.user.twoFactorEnabled = false;
          const { TwoFAStateManager } = await import('../services/core/TokenManager.js');
          TwoFAStateManager.setTwoFAState(false);
          this.render();
        },
        () => {
          // Cancel - no action needed
        }
      );
      await twoFAModal.show();
    } else {
      // Enable 2FA
      const twoFAModal = new TwoFAModal(
        this.apiClient,
        'enable',
        async () => {
          // Update user state, cache, and re-render
          this.user.twoFactorEnabled = true;
          const { TwoFAStateManager } = await import('../services/core/TokenManager.js');
          TwoFAStateManager.setTwoFAState(true);
          this.render();
        },
        () => {
          // Cancel - no action needed
        }
      );
      await twoFAModal.show();
    }
  }
}