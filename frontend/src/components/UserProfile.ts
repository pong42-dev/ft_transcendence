import { User, MatchHistory } from '../types/types.js';

export class UserProfile {
  private user: User;
  private profileElement: HTMLElement;
  private isCurrentUser: boolean;

  constructor(user: User, isCurrentUser: boolean = false) {
    this.user = user;
    this.profileElement = document.createElement('div');
    this.isCurrentUser = isCurrentUser;
  }

  public render(): HTMLElement {
    this.profileElement.className = 'w-full h-full bg-terminal-black text-terminal-green overflow-y-auto scrollbar-hide';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'p-3 space-y-3';

    contentWrapper.appendChild(this.renderUserInfo());
    contentWrapper.appendChild(this.renderStatsSection());
    contentWrapper.appendChild(this.renderMatchHistorySection());
    
    // Clear and update profile element
    this.profileElement.innerHTML = '';
    this.profileElement.appendChild(contentWrapper);
    
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
      securityStatus.className = 'flex items-center mt-2 text-sm';
      securityStatus.innerHTML = `
        2FA ${this.user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        <div class="ml-2 w-2 h-2 rounded-full ${this.user.twoFactorEnabled ? 'bg-terminal-green' : 'bg-terminal-red'}"></div>
      `;
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
    matchHistoryTitle.className = 'text-lg text-terminal-green mb-2 font-bold';
    matchHistoryTitle.textContent = 'Match History';
    
    const matchHistoryList = document.createElement('div');
    matchHistoryList.className = 'space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide';

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
      }
    ];

    sampleHistory.forEach(match => {
      matchHistoryList.appendChild(this.renderMatchHistoryItem(match));
    });
    
    matchHistorySection.appendChild(matchHistoryTitle);
    matchHistorySection.appendChild(matchHistoryList);

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
}