import { TournamentMatchResult } from './TournamentClient';
import { UIUtils } from '../utils/UIUtils';

/**
 * TournamentRenderer - 토너먼트 UI 렌더링 전담 클래스
 * 
 * TournamentClient에서 렌더링 로직을 분리하여
 * UI 관련 코드를 별도로 관리합니다.
 */
export class TournamentRenderer {
  private currentUserId: number | null;
  private bracketResults: TournamentMatchResult[];

  constructor(currentUserId: number | null, bracketResults: TournamentMatchResult[]) {
    this.currentUserId = currentUserId;
    this.bracketResults = bracketResults;
  }

  /**
   * 브라켓 결과 업데이트
   */
  updateBracketResults(results: TournamentMatchResult[]): void {
    this.bracketResults = results;
  }

  /**
   * ModalManager와 일관된 컨테이너 스타일 생성
   */
  private createTournamentContainer(content: string): string {
    // ModalManager의 스타일과 일관성 유지: bg-terminal-black border border-terminal-gray p-8
    return `
      <div class="w-full h-full flex flex-col bg-terminal-black text-terminal-green border border-terminal-gray p-8">
        ${content}
      </div>
    `;
  }

  /**
   * 개별 플레이어 카드 컴포넌트 렌더링
   */
  private renderPlayerCard(participant: any, isWinner: boolean, isCurrentUser: boolean, score: string, matchStatus: string, emptyText: string = 'TBD'): string {
    // 패배자인지 확인
    const isLoser = (matchStatus === 'completed' || matchStatus === 'finished') && !isWinner;
    const isPlaying = matchStatus === 'playing' || matchStatus === 'in_progress' || matchStatus === 'active';
    const isEmpty = !participant;

    return `
      <div class="p-4 rounded-lg border h-24 ${
        isEmpty
          ? 'border-terminal-gray bg-terminal-gray bg-opacity-10'
          : isPlaying
          ? 'border-blue-400 bg-blue-400 bg-opacity-10' // 진행중
          : isWinner && (matchStatus === 'completed' || matchStatus === 'finished')
          ? 'border-terminal-yellow bg-terminal-yellow bg-opacity-20' // 우승자
          : isLoser
          ? 'border-gray-500 bg-gray-600 bg-opacity-10 opacity-60' // 패배자
          : 'border-terminal-gray bg-terminal-gray bg-opacity-10' // 기본
      }" style="width: 160px;">
        <div class="flex items-start justify-between h-full">
          <div class="flex flex-col flex-grow min-w-0">
            <span class="font-bold truncate text-lg ${isEmpty || isLoser ? 'text-gray-500' : ''}">${
              isEmpty ? emptyText : UIUtils.sanitizePlayerName(participant.display_name || participant.name || 'Unknown')
            }</span>
            <div class="h-6 mt-2 flex items-center gap-2">
              ${!isEmpty && isCurrentUser ? '<span class="inline-block px-2 py-1 text-xs font-bold text-terminal-black bg-terminal-green opacity-65 rounded-full">You</span>' : ''}
              ${!isEmpty && isWinner && (matchStatus === 'completed' || matchStatus === 'finished') ? '<span class="text-lg">🏆</span>' : ''}
            </div>
          </div>
          <div class="text-right font-bold text-2xl ${isEmpty || isLoser ? 'text-gray-500' : ''}">${isEmpty ? '-' : score}</div>
        </div>
      </div>
    `;
  }

  /**
   * 준결승 매치 카드 컨테이너 렌더링 (세로형)
   */
  renderSemifinalMatchContainer(match: any, matchNumber: number): string {
    const hasValidMatch = match && match.participants && match.participants.length >= 2;
    
    // 매치 정보
    const player1 = hasValidMatch ? match.participants[0] : null;
    const player2 = hasValidMatch ? match.participants[1] : null;
    const winner = hasValidMatch ? match.winner_id : null;
    const isPlaying = hasValidMatch && (match.status === 'playing' || match.status === 'in_progress' || match.status === 'active');
    
    // 점수 정보
    const matchResult = hasValidMatch ? this.bracketResults.find(r => r.matchId === match.id) : null;
    const player1Score = matchResult?.scores.find(s => s.playerId === player1?.id)?.score.toString() || '-';
    const player2Score = matchResult?.scores.find(s => s.playerId === player2?.id)?.score.toString() || '-';

    return `
      <div class="h-full flex flex-col">
        <div class="text-center text-sm font-bold mb-2 ${isPlaying ? 'text-blue-400' : hasValidMatch ? 'text-terminal-green' : 'text-terminal-gray'}">
          준결승 ${matchNumber}
        </div>
        <div class="flex-1 flex flex-col justify-center space-y-2">
          ${hasValidMatch 
            ? this.renderPlayerCard(player1, winner === player1.id, !!(this.currentUserId && player1.user_id === this.currentUserId), player1Score, match.status)
            : this.renderPlayerCard(null, false, false, '-', 'waiting', 'TBD')
          }
          <div class="text-center text-xs text-terminal-green opacity-50">vs</div>
          ${hasValidMatch 
            ? this.renderPlayerCard(player2, winner === player2.id, !!(this.currentUserId && player2.user_id === this.currentUserId), player2Score, match.status)
            : this.renderPlayerCard(null, false, false, '-', 'waiting', 'TBD')
          }
        </div>
        ${hasValidMatch ? `<div class="text-center text-xs text-terminal-gray mt-2">Match #${match.id}</div>` : ''}
      </div>
    `;
  }

  /**
   * 결승 매치 카드 컨테이너 렌더링 (횡형)
   */
  renderFinalMatchContainer(match: any): string {
    const hasValidMatch = match && match.participants && match.participants.length >= 2;
    
    // 매치 정보
    const player1 = hasValidMatch ? match.participants[0] : null;
    const player2 = hasValidMatch ? match.participants[1] : null;
    const winner = hasValidMatch ? match.winner_id : null;
    
    // 점수 정보
    const matchResult = hasValidMatch ? this.bracketResults.find(r => r.matchId === match.id) : null;
    const player1Score = matchResult?.scores.find(s => s.playerId === player1?.id)?.score.toString() || '-';
    const player2Score = matchResult?.scores.find(s => s.playerId === player2?.id)?.score.toString() || '-';

    return `
      <div class="h-full flex flex-col justify-center">
        <div class="flex items-center gap-2 justify-center">
          ${hasValidMatch 
            ? this.renderPlayerCard(player1, winner === player1.id, !!(this.currentUserId && player1.user_id === this.currentUserId), player1Score, match.status)
            : this.renderPlayerCard(null, false, false, '-', 'waiting', '?')
          }
          <div class="text-xs text-terminal-green opacity-50 px-2">vs</div>
          ${hasValidMatch 
            ? this.renderPlayerCard(player2, winner === player2.id, !!(this.currentUserId && player2.user_id === this.currentUserId), player2Score, match.status)
            : this.renderPlayerCard(null, false, false, '-', 'waiting', '?')
          }
        </div>
        ${hasValidMatch ? `<div class="text-center text-xs text-terminal-gray mt-2">Match #${match.id}</div>` : ''}
      </div>
    `;
  }

  /**
   * 전체 브라켓 레이아웃 컨테이너 렌더링 (준결승-결승-준결승)
   */
  renderBracketLayoutContainer(semiFinals: any[], finals: any[]): string {
    const semifinal1 = semiFinals[0];
    const semifinal2 = semiFinals[1];
    let final = finals[0];

    // Finals에 진출자가 정해지지 않았다면, 준결승 우승자들로 업데이트
    if (!final || !final.participants || final.participants.length < 2) {
      const semifinal1Winner = semifinal1?.winner_id ? semifinal1.participants?.find((p: any) => p.id === semifinal1.winner_id) : null;
      const semifinal2Winner = semifinal2?.winner_id ? semifinal2.participants?.find((p: any) => p.id === semifinal2.winner_id) : null;
      
      if (semifinal1Winner || semifinal2Winner) {
        final = {
          ...final,
          participants: [
            semifinal1Winner || { id: -1, name: '?', display_name: '?' },
            semifinal2Winner || { id: -2, name: '?', display_name: '?' }
          ]
        };
      }
    }

    return `
        <div class="tournament-bracket flex-1            /* 세로로 남는 공간 전부 차지 */
              min-h-0          /* 세로도 꽉 조이기 허용 */
              flex             /* 자식 3개를 가로 flex로 배치 */
              items-center
              justify-center
              space-x-12       /* 컬럼 간 간격 */
              box-border">
          <!-- 준결승 1 -->
        <div class="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center">
            ${this.renderSemifinalMatchContainer(semifinal1, 1)}
          </div>
          
          <!-- 결승 -->
        <div class="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center">
            ${this.renderFinalMatchContainer(final)}
          </div>
          
          <!-- 준결승 2 -->
        <div class="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center">
            ${this.renderSemifinalMatchContainer(semifinal2, 2)}
          </div>
        </div>
    `;
  }

  /**
   * 제목 섹션 컨테이너 렌더링
   */
  renderTitleSection(title: string, subtitle: string, matchId?: number): string {
    return `
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-terminal-green">${title}</h2>
        <div class="text-lg text-terminal-yellow mt-2">${subtitle}</div>
        ${matchId ? `<div class="text-sm text-terminal-gray mt-1">매치 #${matchId}</div>` : ''}
      </div>
    `;
  }

  /**
   * 카운트다운 섹션 컨테이너 렌더링
   */
  renderCountdownSection(seconds: number, message: string): string {
    return `
      <div class="text-center mb-8">
        <div id="countdown-number" class="text-4xl font-bold text-terminal-cyan">${seconds}</div>
        <div class="text-sm text-terminal-gray mt-1">${message}</div>
      </div>
    `;
  }

  /**
   * 액션 버튼 섹션 컨테이너 렌더링
   */
  renderActionButtonSection(type: 'cancel' | 'home'): string {
    const buttons = {
      cancel: {
        id: 'cancel-tournament-btn',
        text: '토너먼트 나가기',
        class: 'px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all'
      },
      home: {
        id: 'home-btn',
        text: '🏠 홈으로 돌아가기',
        class: 'px-6 py-3 bg-terminal-green text-terminal-black font-bold rounded-lg hover:bg-opacity-80 transition-all text-lg'
      }
    };

    const button = buttons[type];
    return `
      <div class="text-center">
        <button id="${button.id}" class="${button.class}">
          ${button.text}
        </button>
      </div>
    `;
  }

  /**
   * 전체 토너먼트 윈도우 렌더링
   */
  renderTournamentWindow(
    title: string, 
    subtitle: string, 
    bracketHTML: string, 
    countdown?: { seconds: number, message: string }, 
    buttonType?: 'cancel' | 'home', 
    matchId?: number
  ): string {
    return this.createTournamentContainer(`
      <!-- Title -->
      ${this.renderTitleSection(title, subtitle, matchId)}
      
      <!-- Bracket -->
        ${bracketHTML}
      
      <!-- Countdown -->
      ${countdown ? this.renderCountdownSection(countdown.seconds, countdown.message) : '<div class="mb-8"></div>'}
      
      <!-- Button -->
      ${buttonType ? this.renderActionButtonSection(buttonType) : ''}
    `);
  }

  /**
   * 게임 시작 전 카운트다운 컨테이너 렌더링
   */
  renderGameCountdownContainer(time: number): string {
    return this.createTournamentContainer(`
      <div id="waiting-screen" class="flex-1 flex flex-col items-center justify-center">
        <h2 class="text-3xl font-bold mb-4">토너먼트 매치 시작</h2>
        <p class="text-xl mb-8">게임이 곧 시작됩니다...</p>
        <div id="countdown-display" class="text-7xl font-mono font-bold mb-8">${time}</div>
        <div class="text-sm text-terminal-cyan">준비하세요!</div>
      </div>
    `);
  }
}
