import { User, MatchHistory } from '../types/types.js';
import i18n from '../services/i18n.js';
import { UserApiService } from '../services/api/UserApiService.js';

export class UserProfile {
  private user: User;
  private profileElement: HTMLElement;
  private isCurrentUser: boolean;
  private userApiService: UserApiService;

  constructor(user: User, isCurrentUser: boolean = false) {
    this.user = user;
    this.profileElement = document.createElement('div');
    this.isCurrentUser = isCurrentUser;
    this.userApiService = new UserApiService();
  }

  public async render(): Promise<HTMLElement> {
    this.profileElement.className = 'w-full h-full bg-terminal-black text-terminal-green overflow-y-auto scrollbar-hide';

    // Refresh user data if current user to get latest stats and history
    if (this.isCurrentUser) {
      await this.refreshUserData();
    }

    // Clear and update profile element
    this.profileElement.innerHTML = '';
    this.profileElement.appendChild(this.createProfileContent());
    
    // Note: 2FA is now managed through terminal commands
    
    return this.profileElement;
  }

  private renderUserInfo(): HTMLElement {
    const userInfo = document.createElement('div');
    userInfo.className = 'flex items-start space-x-4 bg-terminal-black rounded-lg p-4';
    
    const avatar = document.createElement('div');
    avatar.className = 'w-16 h-16 rounded-full border-2 border-terminal-green flex items-center justify-center flex-shrink-0';
    
    if (this.user.avatarUrl) {
      const avatarImg = document.createElement('img');
      // Add cache buster to ensure fresh image load
      const cacheBuster = `?t=${Date.now()}`;
      avatarImg.src = this.user.avatarUrl + cacheBuster;
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
    username.textContent = this.user.nickname || i18n.t('userProfile.default_username');
    
    nameContainer.appendChild(username);

    // Only show email and 2FA status for current user
    if (this.isCurrentUser) {
      const email = document.createElement('div');
      email.className = 'text-terminal-green opacity-80 truncate text-sm';
      // 실제 이메일이 있으면 사용, 없으면 username을 이메일 형식으로 표시
      email.textContent = this.user.email || this.user.username;
      nameContainer.appendChild(email);
      
      const securityStatus = document.createElement('div');
      securityStatus.className = 'flex items-center mt-2';
      
      const statusInfo = document.createElement('div');
      statusInfo.className = 'flex items-center text-sm';
      statusInfo.innerHTML = `
        ${i18n.t('userProfile.two_fa_status', { status: this.user.twoFactorEnabled ? i18n.t('common.enabled') : i18n.t('common.disabled') })}
        <div class="ml-2 w-2 h-2 rounded-full ${this.user.twoFactorEnabled ? 'bg-terminal-green' : 'bg-terminal-red'}"></div>
      `;
      
      const terminalHint = document.createElement('div');
      terminalHint.className = 'text-xs text-terminal-gray opacity-70 ml-4';
      terminalHint.textContent = i18n.t('userProfile.two_fa_hint');
      
      securityStatus.appendChild(statusInfo);
      securityStatus.appendChild(terminalHint);
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
    statsTitle.textContent = i18n.t('userProfile.game_stats_title');
    
    const statsContainer = document.createElement('div');
    statsContainer.className = 'grid grid-cols-3 gap-3';
    
    // Use user data which now includes real stats from backend
    const statsItems = [
      { value: this.user.gamesPlayed.toString(), label: i18n.t('userProfile.stats_games') },
      { value: this.user.gamesWon.toString(), label: i18n.t('userProfile.stats_wins') },
      { value: `${Math.round((this.user.gamesWon / this.user.gamesPlayed) * 100 || 0)}%`, label: i18n.t('userProfile.stats_win_rate') }
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
    matchHistoryTitle.textContent = i18n.t('userProfile.match_history_title');
    
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.className = 'flex mb-3 border-b border-terminal-gray border-opacity-30';
    
    const oneVsOneTab = document.createElement('button');
    oneVsOneTab.className = 'px-4 py-2 text-sm font-medium text-terminal-green border-b-2 border-terminal-green';
    oneVsOneTab.textContent = i18n.t('userProfile.tab_1v1');
    oneVsOneTab.setAttribute('data-tab', '1v1');
    
    const tournamentTab = document.createElement('button');
    tournamentTab.className = 'px-4 py-2 text-sm font-medium text-terminal-gray border-b-2 border-transparent hover:text-terminal-green hover:border-terminal-green hover:border-opacity-50';
    tournamentTab.textContent = i18n.t('userProfile.tab_tournament');
    tournamentTab.setAttribute('data-tab', 'tournament');
    
    tabContainer.appendChild(oneVsOneTab);
    tabContainer.appendChild(tournamentTab);
    
    // 1v1 매치 리스트
    const oneVsOneList = document.createElement('div');
    oneVsOneList.className = 'space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide';
    oneVsOneList.setAttribute('data-content', '1v1');
    
    // 기존 1v1 매치 렌더링 유지
    const oneVsOneMatches = this.user.matchHistory.filter(match => match.type === '1v1');
    oneVsOneMatches.forEach(match => {
      oneVsOneList.appendChild(this.renderMatchHistoryItem(match));
    });
    if (oneVsOneMatches.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-8 text-terminal-gray opacity-70';
      emptyState.textContent = i18n.t('userProfile.no_1v1_matches');
      oneVsOneList.appendChild(emptyState);
    }
    // 토너먼트 매치 카드형 렌더링 (실제 데이터 사용)
    const tournamentList = document.createElement('div');
    tournamentList.className = 'space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide hidden';
    tournamentList.setAttribute('data-content', 'tournament');
    
    // 실제 토너먼트 데이터가 있으면 사용, 없으면 mock 데이터 사용
    tournamentList.appendChild(this.renderTournamentHistorySection());

    
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

  private renderTournamentHistorySection(): HTMLElement {
    // 실제 토너먼트 히스토리 데이터가 있으면 사용, 없으면 mock 데이터 사용
      return this.renderRealTournamentHistory();
  }

  private renderRealTournamentHistory(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-4';
    
    // 실제 토너먼트 히스토리 데이터 사용
    if (this.user.tournamentHistory && this.user.tournamentHistory.length > 0) {
      this.user.tournamentHistory.forEach((tournament: any) => {
        // 안전한 데이터 체크
        if (!tournament || !tournament.rounds || !Array.isArray(tournament.rounds)) {
          console.warn('Invalid tournament data:', tournament);
          return;
        }

        const card = document.createElement('div');
        card.className = 'bg-terminal-gray bg-opacity-5 rounded-lg p-4 flex flex-col gap-2';
        
        // 상단: 날짜 + 등수 뱃지
        const top = document.createElement('div');
        top.className = 'flex items-center justify-between mb-2';
        const dateInfo = document.createElement('div');
        dateInfo.className = 'text-xs text-terminal-green font-mono';
        dateInfo.textContent = tournament.tournament_date ? new Date(tournament.tournament_date).toISOString().split('T')[0] : 'Unknown Date';
        
        // 등수 뱃지
        const rankBadgeText = tournament.final_rank === 1
          ? i18n.t('userProfile.champion')
          : tournament.final_rank === 2
          ? i18n.t('userProfile.runner_up')
          : i18n.t('userProfile.semi_finalist');
        const rankBadgeClass = tournament.final_rank === 1
          ? 'bg-terminal-green text-terminal-green'
          : tournament.final_rank === 2
          ? 'bg-terminal-blue text-terminal-blue'
          : 'bg-terminal-gray text-terminal-gray';
        
        const rankBadge = document.createElement('span');
        rankBadge.className = `px-3 py-1 rounded-full font-bold text-xs ${rankBadgeClass} bg-opacity-20 border border-terminal-gray`;
        rankBadge.textContent = rankBadgeText;
        top.appendChild(dateInfo);
        top.appendChild(rankBadge);
        card.appendChild(top);
        
        // 하단: 라운드별 경기 정보
        const matchList = document.createElement('div');
        matchList.className = 'flex flex-col gap-2';
        
        tournament.rounds.forEach((round: any) => {
          console.log(`[DEBUG Frontend] Round data:`, JSON.stringify(round, null, 2));
          console.log(`[DEBUG Frontend] isMyGame value:`, round.isMyGame, typeof round.isMyGame);
          
          const row = document.createElement('div');
          row.className = 'flex items-center gap-2';
          
          // 단계 태그 - round_number로 구분
          const stageTag = document.createElement('span');
          stageTag.className = 'text-xs font-bold text-terminal-green min-w-[60px]';
          
          if (round.round_number === 1) {
            // 준결승 - 같은 라운드에서 여러 경기가 있을 수 있으므로 인덱스 기반으로 구분
            const semiIndex = tournament.rounds.filter((r: any) => r.round_number === 1).indexOf(round) + 1;
            stageTag.textContent = i18n.t('userProfile.tournament_semifinal', { num: semiIndex });
          } else if (round.round_number === 2) {
            stageTag.textContent = i18n.t('userProfile.tournament_final');
          } else {
            stageTag.textContent = `Round ${round.round_number}`;
          }
          row.appendChild(stageTag);
          
          // 플레이어 1 - 안전하게 처리
          const p1 = round.player1 || {};
          const p1Name = p1.name || 'Unknown Player';
          const p1Span = document.createElement('span');
          p1Span.textContent = p1Name;
          
          // 승자 강조 스타일 - Mock UI와 맞게
          const isP1Winner = round.winnerId === p1.id;
          p1Span.className = isP1Winner 
            ? 'font-bold text-terminal-green' 
            : 'text-terminal-gray opacity-60';
          
          row.appendChild(p1Span);
          
          // Player 1 YOU 배지 (현재 사용자인 경우)
          if (p1.type === 'user') {
            const youBadge = document.createElement('span');
            youBadge.className = 'ml-1 px-1 py-0.5 rounded bg-terminal-blue bg-opacity-20 text-xs text-terminal-blue font-bold';
            youBadge.textContent = 'YOU';
            row.appendChild(youBadge);
          }

          // vs
          const vs = document.createElement('span');
          vs.className = 'mx-1 text-xs text-terminal-gray opacity-70';
          vs.textContent = 'vs';
          row.appendChild(vs);

          // 플레이어 2 - 안전하게 처리
          const p2 = round.player2 || {};
          const p2Name = p2.name || 'Unknown Player';
          const p2Span = document.createElement('span');
          p2Span.textContent = p2Name;
          
          // 승자 강조 스타일 - Mock UI와 맞게
          const isP2Winner = round.winnerId === p2.id;
          p2Span.className = isP2Winner 
            ? 'font-bold text-terminal-green' 
            : 'text-terminal-gray opacity-60';
          
          row.appendChild(p2Span);
          
          // Player 2 YOU 배지 (현재 사용자인 경우)
          if (p2.type === 'user') {
            const youBadge = document.createElement('span');
            youBadge.className = 'ml-1 px-1 py-0.5 rounded bg-terminal-blue bg-opacity-20 text-xs text-terminal-blue font-bold';
            youBadge.textContent = 'YOU';
            row.appendChild(youBadge);
          }

          
          matchList.appendChild(row);
        });
        
        card.appendChild(matchList);
        wrapper.appendChild(card);
      });
    } else {
      // 실제 데이터가 없는 경우 기본 메시지
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-8 text-terminal-gray opacity-70';
      emptyState.textContent = i18n.t('userProfile.no_tournament_matches');
      wrapper.appendChild(emptyState);
    }
    
    return wrapper;
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
    matchType.textContent = match.type === '1v1' ? '1v1' : i18n.t('userProfile.tournament_type');

    header.appendChild(dateInfo);
    header.appendChild(matchType);
    item.appendChild(header);

    const content = document.createElement('div');
    content.className = 'flex items-center justify-between';

    if (match.type === '1v1') {
      // 닉네임 부분에 data-* 속성으로 플레이스홀더를 추가합니다.
      content.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="flex flex-col items-center">
            <div class="text-lg font-bold">${match.myScore}</div>
            <div class="text-xs opacity-70">${i18n.t('userProfile.you')}</div>
          </div>
          <div class="text-sm opacity-50">${i18n.t('userProfile.versus')}</div>
          <div class="flex flex-col items-center">
            <div class="text-lg font-bold">${match.opponentScore}</div>
            <div class="text-xs opacity-70" data-opponent-name></div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-xs px-2 py-0.5 rounded-full ${match.rank === 1 ? 'bg-terminal-green bg-opacity-20 text-terminal-green' : 'bg-terminal-red bg-opacity-20 text-terminal-red'}">
            ${match.rank === 1 ? i18n.t('userProfile.victory') : i18n.t('userProfile.defeat')}
          </div>
        </div>
      `;
      // querySelector로 플레이스홀더를 찾은 뒤, textContent를 사용해 안전하게 닉네임을 설정합니다.
      const opponentNameEl = content.querySelector('[data-opponent-name]');
      if (opponentNameEl) {
        // 1v1 경기에서는 opponent가 항상 string 타입이어야 합니다.
        // typeof로 타입을 명확히 하여 타입스크립트 오류를 해결하고, 코드의 논리를 명확하게 합니다.
        if (typeof match.opponent === 'string') {
          opponentNameEl.textContent = match.opponent;
        }
      }
    } else {
      const opponents = Array.isArray(match.opponent) ? match.opponent : [match.opponent];
      const opponentsList = document.createElement('div');
      opponentsList.className = 'flex flex-col gap-1';

      // innerHTML 대신 DOM 요소를 직접 생성하여 XSS를 방지합니다.
      opponents.forEach((opponent, index) => {
        const opponentItem = document.createElement('div');
        opponentItem.className = 'flex items-center gap-2 text-sm';
        
        const rankSpan = document.createElement('span');
        rankSpan.className = 'text-xs opacity-70';
        rankSpan.textContent = `${i18n.t('userProfile.rank_prefix')}${index + 1}:`;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = opponent; // textContent를 사용해 안전하게 닉네임을 설정합니다.

        opponentItem.appendChild(rankSpan);
        opponentItem.appendChild(nameSpan);
        opponentsList.appendChild(opponentItem);
      });

      const rankBadge = document.createElement('div');
      rankBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-terminal-gray bg-opacity-20';
      rankBadge.textContent = match.rank === 1 ? i18n.t('userProfile.champion') : match.rank === 2 ? i18n.t('userProfile.runner_up') : i18n.t('userProfile.semi_finalist');

      content.appendChild(opponentsList);
      content.appendChild(rankBadge);
    }

    item.appendChild(content);
    return item;
  }

  /**
   * 프로필 콘텐츠 생성 (render 메서드에서 분리)
   */
  private createProfileContent(): HTMLElement {
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'p-3 space-y-3';

    contentWrapper.appendChild(this.renderUserInfo());
    contentWrapper.appendChild(this.renderStatsSection());
    contentWrapper.appendChild(this.renderMatchHistorySection());
    
    return contentWrapper;
  }

  /**
   * Refresh user data with latest stats and history from backend
   */
  private async refreshUserData(): Promise<void> {
    try {
      // Get fresh user data with latest stats and history
      const updatedUser = await this.userApiService.getProfile();
      
      // Update current user object with fresh data
      this.user = updatedUser;
      
      console.log('Refreshed user data:', { 
        gamesPlayed: this.user.gamesPlayed,
        gamesWon: this.user.gamesWon,
        matchHistoryCount: this.user.matchHistory.length,
        tournamentHistory: this.user.tournamentHistory
      });
      
      // 토너먼트 히스토리 상세 로깅
      if (this.user.tournamentHistory && this.user.tournamentHistory.length > 0) {
        console.log('Tournament History Details:');
        this.user.tournamentHistory.forEach((tournament, index) => {
          console.log(`Tournament ${index}:`, tournament);
          if (tournament.rounds) {
            tournament.rounds.forEach((round, roundIndex) => {
              console.log(`  Round ${roundIndex}:`, round);
              console.log(`    player1:`, round.player1);
              console.log(`    player2:`, round.player2);
            });
          }
        });
      }
    } catch (error) {
      console.warn('Failed to refresh user data, using existing data:', error);
      // Keep using existing user data as fallback
    }
  }

  /**
   * 컴포넌트 정리 (메모리 누수 방지)
   */
  public destroy(): void {
    // 현재는 정리할 리소스가 없지만 향후 확장을 위해 유지
  }
}

// --- MOCK DATA 분리 ---
// [TODO: 실제 데이터 연동 시 이 부분 제거하고 getMockTournamentCards 함수 삭제]
// function getMockTournamentCards(i18n: any) {
//   return [
//     // 2등(준우승)
//     {
//       date: '2025-07-14',
//       userRank: 2,
//       matches: [
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 1 }),
//           players: [
//             { nickname: 'Alice', isWinner: true },
//             { nickname: 'Bob', isWinner: false }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 2 }),
//           players: [
//             { nickname: 'Charlie', isWinner: true },
//             { nickname: 'David', isWinner: false }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_final'),
//           players: [
//             { nickname: 'Alice', isWinner: false },
//             { nickname: 'Charlie', isWinner: true }
//           ]
//         }
//       ]
//     },
//     // 1등(챔피언)
//     {
//       date: '2025-07-07',
//       userRank: 1,
//       matches: [
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 1 }),
//           players: [
//             { nickname: 'You', isWinner: true },
//             { nickname: 'Bob', isWinner: false }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 2 }),
//           players: [
//             { nickname: 'Charlie', isWinner: true },
//             { nickname: 'David', isWinner: false }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_final'),
//           players: [
//             { nickname: 'You', isWinner: true },
//             { nickname: 'Charlie', isWinner: false }
//           ]
//         }
//       ]
//     },
//     // 3등(4강 탈락)
//     {
//       date: '2025-06-30',
//       userRank: 3,
//       matches: [
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 1 }),
//           players: [
//             { nickname: 'You', isWinner: false },
//             { nickname: 'Bob', isWinner: true }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_semifinal', { num: 2 }),
//           players: [
//             { nickname: 'Charlie', isWinner: true },
//             { nickname: 'David', isWinner: false }
//           ]
//         },
//         {
//           stage: i18n.t('userProfile.tournament_final'),
//           players: [
//             { nickname: 'Bob', isWinner: true },
//             { nickname: 'Charlie', isWinner: false }
//           ]
//         }
//       ]
//     }
//   ];
// }