import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { ModalManager, ModalContent } from '../managers/ModalManager';

// TournamentFinalResultModal: 최종 토너먼트 결과를 보여주는 모달 (홈으로 버튼 있음)
export class TournamentFinalResultModal {
  private modalManager: ModalManager;
  private bracketMatches: TournamentMatch[];
  private bracketResults: TournamentMatchResult[];
  private onClose?: () => void;

  constructor(bracketMatches: TournamentMatch[], bracketResults: TournamentMatchResult[] = [], onClose?: () => void) {
    this.modalManager = ModalManager.getInstance();
    this.bracketMatches = bracketMatches;
    this.bracketResults = bracketResults;
    this.onClose = onClose;
  }

  public show(): void {
    const modalContent: ModalContent = {
      title: '🏆 토너먼트 최종 결과',
      content: () => {
        const el = document.createElement('div');
        el.className = 'modal-body';
        el.innerHTML = this.renderFinalBracket();
        
        // 홈으로 버튼 추가
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-6 flex justify-center';
        
        const homeButton = document.createElement('button');
        homeButton.className = 'px-6 py-2 bg-terminal-green text-terminal-black font-bold rounded hover:bg-terminal-yellow transition-colors';
        homeButton.textContent = '홈으로';
        homeButton.addEventListener('click', () => {
          this.modalManager.hide();
          // 프로필로 돌아가기
          window.location.hash = '#profile';
        });
        
        buttonContainer.appendChild(homeButton);
        el.appendChild(buttonContainer);
        
        return el;
      },
      onShow: () => {},
      onClose: () => { if (this.onClose) this.onClose(); },
      config: {
        closable: false, // 자동으로 닫히지 않도록
        closeOnOutsideClick: false,
        sizeClass: 'max-w-[800px] w-[95%]'
      }
    };
    this.modalManager.show(modalContent);
  }

  private renderFinalBracket(): string {
    if (!this.bracketMatches || this.bracketMatches.length === 0) {
      return '<div class="text-center text-terminal-yellow">토너먼트 결과를 불러오는 중...</div>';
    }

    // matches 배열을 라운드별로 분류
    const semiFinals = this.bracketMatches.filter(m => m.round_number === 1);
    const finals = this.bracketMatches.filter(m => m.round_number === 2);
    
    return `
      <div class="text-center mb-6">
        <div class="text-3xl font-bold text-terminal-yellow mb-4">🏆 토너먼트 완료!</div>
        <div class="text-lg text-terminal-green mb-6">모든 경기가 종료되었습니다</div>
      </div>
      <div class="grid grid-cols-3 gap-8 items-center justify-center w-full">
        <div class="flex flex-col gap-8 items-center">
          ${semiFinals[0] ? this.renderFinalBracketMatch(semiFinals[0], '준결승 1') : '<div class="text-terminal-gray">준결승 1</div>'}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${finals[0] ? this.renderFinalBracketMatch(finals[0], '🏆 결승') : '<div class="text-terminal-gray">결승</div>'}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${semiFinals[1] ? this.renderFinalBracketMatch(semiFinals[1], '준결승 2') : '<div class="text-terminal-gray">준결승 2</div>'}
        </div>
      </div>
    `;
  }

  private renderFinalBracketMatch(match: TournamentMatch, label: string): string {
    // 매치 데이터에서 참가자 정보 추출
    let player1Name = 'Player 1';
    let player2Name = 'Player 2';
    let player1Id = null;
    let player2Id = null;
    let player1Score = '-';
    let player2Score = '-';

    if (match.participants && Array.isArray(match.participants)) {
      player1Name = match.participants[0]?.display_name || match.participants[0]?.name || 'Player 1';
      player2Name = match.participants[1]?.display_name || match.participants[1]?.name || 'Player 2';
      player1Id = match.participants[0]?.id;
      player2Id = match.participants[1]?.id;
    }

    // bracketResults에서 해당 매치의 점수 정보 찾기
    const matchResult = this.bracketResults.find(r => r.matchId === match.id);
    if (matchResult) {
      const player1ScoreObj = matchResult.scores.find(s => s.playerId === player1Id);
      const player2ScoreObj = matchResult.scores.find(s => s.playerId === player2Id);
      player1Score = player1ScoreObj ? player1ScoreObj.score.toString() : '-';
      player2Score = player2ScoreObj ? player2ScoreObj.score.toString() : '-';
    }

    const winner = match.winner_id;
    const isChampion = label.includes('결승') && winner;
    
    return `
      <div class="p-4 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-full text-center ${isChampion ? 'border-terminal-yellow shadow-lg' : label.includes('결승') ? 'border-terminal-yellow' : 'border-terminal-green'}">
        <div class="text-lg font-bold mb-2">${label}</div>
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center ${winner === player1Id ? 'text-terminal-yellow font-bold' : ''}">
            <span class="truncate flex-1 text-left">${player1Name}</span>
            <span class="ml-2 text-lg font-mono">${player1Score}</span>
            ${winner === player1Id && isChampion ? '<span class="ml-1">👑</span>' : ''}
          </div>
          <div class="text-terminal-green text-sm">vs</div>
          <div class="flex justify-between items-center ${winner === player2Id ? 'text-terminal-yellow font-bold' : ''}">
            <span class="truncate flex-1 text-left">${player2Name}</span>
            <span class="ml-2 text-lg font-mono">${player2Score}</span>
            ${winner === player2Id && isChampion ? '<span class="ml-1">👑</span>' : ''}
          </div>
        </div>
        <div class="text-xs text-terminal-gray mt-2">ID: ${match.id}</div>
        ${match.status ? `<div class="text-xs text-terminal-cyan mt-1">${match.status}</div>` : ''}
        ${isChampion ? '<div class="text-xs text-terminal-yellow mt-2 font-bold">🏆 우승자</div>' : ''}
      </div>
    `;
  }
}

export interface TournamentMatch {
  id: number;
  round_number: number;
  status: string;
  participants: Array<{
    id: number;
    name: string;
    display_name?: string;
    user_id?: number;
    type?: 'user' | 'guest'; // 플레이어 타입 추가
    avatarUrl?: string; // 아바타 URL 추가
  }>;
  winner_id?: number;
  started_at?: string;
  resultSent?: boolean; // 결과 전송 여부 추적
}

export interface TournamentProgress {
  tournament_id: number;
  status: string;
  current_match?: TournamentMatch;
  next_matches: TournamentMatch[];
  completed_matches: TournamentMatch[];
  participants: Array<{
    id: number;
    name: string;
    user_id?: number;
    eliminated: boolean;
  }>;
}

// TournamentMatchResult 타입 실제 선언
export type TournamentMatchResult = {
  matchId: number;
  winnerId: number;
  scores: Array<{ playerId: number; score: number }>;
  participants: Array<{
    id: number;
    name: string;
    type: 'user' | 'guest';
    displayName?: string;
    userId?: number | null;
  }>;
};

export class TournamentClient {
  private container: HTMLElement;
  private tournamentId: number;
  private currentUserId: number | null;
  // 각 매치마다 새로운 GameClient, GameRenderer, InputHandler 인스턴스를 생성하므로 필드로 보관하지 않음
  private webSocketService: WebSocketService | null = null;
  private currentMatch: TournamentMatch | null = null; // 현재 매치 정보를 단일 인스턴스로 관리
  private bracketMatches: TournamentMatch[] | null = null; // 브라켓 정보를 저장할 배열
  private modalManager: ModalManager;

  // 브라켓 결과 상태 추가
  private bracketResults: TournamentMatchResult[] = [];
  private initialBracketModalShown: boolean = false;
  
  // 타이밍 제어를 위한 상태 추가
  private isProcessingMatch: boolean = false;
  private currentTimeout: number | null = null;

  constructor(
    container: HTMLElement,
    tournamentId: number,
    currentUserId: number | null
  ) {
    this.container = container;
    this.tournamentId = tournamentId;
    this.currentUserId = currentUserId;
    this.modalManager = ModalManager.getInstance();
  }

  public start(): void {
    this.connectToTournament();
  }

  public destroy(): void {
    // 타이머 정리
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // WebSocket 연결 정리 (GameClient는 각 매치에서 개별적으로 정리됨)
    this.webSocketService?.disconnect();
    this.container.innerHTML = '';
    this.isProcessingMatch = false;
  }

  private connectToTournament(): void {
    if (!this.currentUserId) {
      console.error('User ID is required');
      alert('연결 실패: 사용자 ID가 필요합니다');
      this.destroy();
      return;
    }

    console.log(`Connecting to tournament ${this.tournamentId} with user ${this.currentUserId}`);

    // WebSocketService 인스턴스 생성 및 연결
    this.webSocketService = new WebSocketService();
    const wsUrl = `ws://localhost:3000/ws/tournament/${this.tournamentId}?userId=${this.currentUserId}`;
    this.webSocketService.connect(wsUrl);

    this.webSocketService.on('open', () => {
      // 연결 성공 시 tournament_start 메시지 자동 전송
      if (this.currentUserId !== null) {
        this.webSocketService?.sendMessage({
          type: 'tournament_start',
          data: { playerId: this.currentUserId }
        });
      }
    });

    this.webSocketService.on('tournament_bracket', (data: any) => {
      this.handleTournamentBracket(data);
    });
    this.webSocketService.on('bracket_update', (data: any) => {
      this.handleBracketUpdate(data);
    });
    this.webSocketService.on('match_starting', (data: any) => {
      this.handleMatchStarting(data);
    });
    this.webSocketService.on('tournament_end', () => {
      this.handleTournamentEnd();
    });
    this.webSocketService.on('error', () => {
      alert('토너먼트 연결 중 오류가 발생했습니다.');
      this.destroy();
    });
  }

  private generateBracketHTML(bracketData: any): string {
    // bracketData가 배열인 경우 (matches 배열) 또는 객체인 경우 (rounds 포함) 모두 처리
    let matches: any[];
    
    if (Array.isArray(bracketData)) {
      matches = bracketData;
    } else if (bracketData && bracketData.rounds && Array.isArray(bracketData.rounds)) {
      // 기존 형태: rounds 배열
      if (bracketData.rounds.length < 2) {
        return '<div class="text-center text-red-500">Invalid bracket data</div>';
      }
      const semiFinals = bracketData.rounds[0];
      const final = bracketData.rounds[1][0];
      return `
        <div class="grid grid-cols-3 gap-4 items-center justify-center w-full h-full max-h-full">
          <div class="flex flex-col gap-4 items-center h-full justify-center">
            ${this.renderBracketMatch(semiFinals[0], '준결승 1')}
          </div>
          <div class="flex flex-col gap-4 items-center h-full justify-center">
            ${this.renderBracketMatch(final, '결승')}
          </div>
          <div class="flex flex-col gap-4 items-center h-full justify-center">
            ${this.renderBracketMatch(semiFinals[1], '준결승 2')}
          </div>
        </div>
      `;
    } else {
      return '<div class="text-center text-red-500">No bracket data available</div>';
    }

    // matches 배열을 라운드별로 분류
    const semiFinals = matches.filter(m => m.round_number === 1);
    const finals = matches.filter(m => m.round_number === 2);
    
    if (semiFinals.length === 0 && finals.length === 0) {
      return '<div class="text-center text-terminal-yellow">브라켓 로딩 중...</div>';
    }

    return `
      <div class="grid grid-cols-3 gap-4 items-center justify-center w-full h-full max-h-full">
        <div class="flex flex-col gap-4 items-center h-full justify-center">
          ${semiFinals[0] ? this.renderBracketMatch(semiFinals[0], '준결승 1') : '<div class="text-terminal-gray text-sm">대기중</div>'}
        </div>
        <div class="flex flex-col gap-4 items-center h-full justify-center">
          ${finals[0] ? this.renderBracketMatch(finals[0], '결승') : '<div class="text-terminal-gray text-sm">대기중</div>'}
        </div>
        <div class="flex flex-col gap-4 items-center h-full justify-center">
          ${semiFinals[1] ? this.renderBracketMatch(semiFinals[1], '준결승 2') : '<div class="text-terminal-gray text-sm">대기중</div>'}
        </div>
      </div>
    `;
  }

  private renderBracketMatch(match: any, label: string): string {
    if (!match) {
      return `
        <div class="p-3 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-full max-w-48 text-center border-terminal-gray">
          <div class="text-sm font-bold mb-2">${label}</div>
          <div class="text-terminal-gray text-xs">대기중</div>
        </div>
      `;
    }

    // 매치 데이터에서 참가자 정보 추출
    let player1Name = 'Player 1';
    let player2Name = 'Player 2';
    let player1Id = null;
    let player2Id = null;
    let player1Score = '-';
    let player2Score = '-';

    if (match.participants && Array.isArray(match.participants)) {
      player1Name = match.participants[0]?.display_name || match.participants[0]?.name || 'Player 1';
      player2Name = match.participants[1]?.display_name || match.participants[1]?.name || 'Player 2';
      player1Id = match.participants[0]?.id;
      player2Id = match.participants[1]?.id;
    } else if (match.player1 && match.player2) {
      player1Name = match.player1.nickname || match.player1.name || 'Player 1';
      player2Name = match.player2.nickname || match.player2.name || 'Player 2';
      player1Id = match.player1.id;
      player2Id = match.player2.id;
    }

    // bracketResults에서 해당 매치의 점수 정보 찾기
    const matchResult = this.bracketResults.find(r => r.matchId === (match.matchId || match.id));
    if (matchResult) {
      const player1ScoreObj = matchResult.scores.find(s => s.playerId === player1Id);
      const player2ScoreObj = matchResult.scores.find(s => s.playerId === player2Id);
      player1Score = player1ScoreObj ? player1ScoreObj.score.toString() : '-';
      player2Score = player2ScoreObj ? player2ScoreObj.score.toString() : '-';
    }

    const matchId = match.matchId || match.id || '';
    const winner = match.winnerId || match.winner_id;
    
    // 매치 상태 확인 및 스타일 결정
    const isCompleted = match.status === 'completed' || winner;
    const isPlaying = match.status === 'playing' || match.status === 'in_progress' || match.status === 'active';
    
    // 스타일 클래스 결정
    let containerClass = 'p-3 border-2 rounded-lg w-full max-w-48 text-center';
    let borderClass = '';
    let bgClass = '';
    let pulseClass = '';
    
    if (isPlaying) {
      // 현재 진행 중인 경기 - 밝은 파란색으로 강조
      borderClass = 'border-blue-400 border-4';
      bgClass = 'bg-blue-900 bg-opacity-70';
      pulseClass = 'animate-pulse';
    } else if (isCompleted) {
      // 완료된 경기 - 녹색 테두리
      borderClass = 'border-green-400';
      bgClass = 'bg-terminal-black bg-opacity-50';
    } else {
      // 기본 스타일
      borderClass = label === '결승' ? 'border-terminal-yellow' : 'border-terminal-green';
      bgClass = 'bg-terminal-black bg-opacity-50';
    }
    
    return `
      <div class="${containerClass} ${borderClass} ${bgClass} ${pulseClass}">
        <div class="text-sm font-bold mb-2 ${isPlaying ? 'text-blue-300' : ''}">${label}</div>
        ${isPlaying ? '<div class="text-xs text-blue-400 mb-1">⚡ Playing</div>' : ''}
        <div class="flex flex-col gap-1 text-xs">
          <div class="flex justify-between items-center ${winner === player1Id ? 'text-yellow-300 font-bold bg-green-800 bg-opacity-50 px-2 py-1 rounded' : ''}">
            <span class="truncate flex-1 text-left">${player1Name}</span>
            <span class="ml-2 text-sm font-mono">${player1Score}</span>
            ${winner === player1Id ? '<span class="ml-1 text-lg">🏆</span>' : ''}
          </div>
          <div class="text-terminal-green text-xs">vs</div>
          <div class="flex justify-between items-center ${winner === player2Id ? 'text-yellow-300 font-bold bg-green-800 bg-opacity-50 px-2 py-1 rounded' : ''}">
            <span class="truncate flex-1 text-left">${player2Name}</span>
            <span class="ml-2 text-sm font-mono">${player2Score}</span>
            ${winner === player2Id ? '<span class="ml-1 text-lg">🏆</span>' : ''}
          </div>
        </div>
        <div class="text-xs text-terminal-gray mt-1">ID: ${matchId}</div>
        ${match.status ? `<div class="text-xs ${isPlaying ? 'text-blue-400' : 'text-terminal-cyan'} mt-1">${match.status}</div>` : ''}
      </div>
    `;
  }

  private handleTournamentBracket(data: any): void {
    console.log('Tournament bracket received:', data);
    this.bracketMatches = data.matches;
    this.updateBracketDisplay();
    
    // 토너먼트 시작 시 초기 브라켓을 한 번만 표시
    if (!this.initialBracketModalShown) {
      this.initialBracketModalShown = true;
      // 초기 브라켓을 5초간 표시
      this.showBracketWithCountdown(0, 5, '토너먼트 시작');
    }
  }

  private handleBracketUpdate(data: any): void {
    if (data && data.matches) {
      this.bracketMatches = data.matches;
      this.updateBracketDisplay();
    }
  }

  private handleMatchStarting(data: any): void {
    console.log('Match starting, data received:', data);
    
    // 이미 매치 처리 중이면 무시
    if (this.isProcessingMatch) {
      console.log('Already processing a match, ignoring');
      return;
    }
    
    this.isProcessingMatch = true;
    
    const { matchId, gameId, participants, round_number } = data;
    this.currentMatch = {
      id: matchId,
      round_number: round_number,
      status: 'starting',
      participants: participants || [],
      winner_id: undefined,
      started_at: undefined,
      resultSent: false
    };
    
    // 1. 브라켓과 함께 5초 카운트다운 표시
    this.showBracketWithCountdown(matchId, 5, '매치 시작');
    
    // 2. 5초 후 게임 시작
    this.currentTimeout = window.setTimeout(() => {
      // 컨테이너 완전히 비우기 - 게임 화면만 표시되도록
      this.container.innerHTML = '';
      
      // GameResponseDto 형태로 변환 - 실제 플레이어 정보가 포함되도록 수정
      const gameInfo = {
        gameId,
        type: 'tournament' as const,
        status: 'countdown' as const,
        players: participants.map((p: any) => {
          // 전체 참가자 정보에서 아바타 URL 등 추가 정보 찾기
          const fullParticipantInfo = this.bracketMatches
            ?.flatMap(m => m.participants)
            .find(fp => fp.id === p.id);

          return {
            id: p.id,
            type: p.user_id ? 'user' : 'guest',
            name: p.display_name || p.name || `Player${p.id}`,
            avatarUrl: fullParticipantInfo?.avatarUrl || undefined
          };
        })
      };
      
      console.log('Starting tournament match with game info:', gameInfo);
      
      // startWaitingFlow와 동일한 로직 사용
      this.startTournamentMatchFlow(gameInfo);
    }, 5000); // 5초 대기
  }

  /**
   * 브라켓과 함께 카운트다운을 표시하는 메서드
   */
  private showBracketWithCountdown(matchId: number, seconds: number, message: string): void {
    // 브라켓 HTML 생성
    const bracketHTML = this.bracketMatches ? this.generateBracketHTML(this.bracketMatches) : 
      '<div class="text-center text-terminal-gray">브라켓 정보를 불러오는 중...</div>';
    
    // 초기 화면 렌더링 (한 번만)
    this.container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green p-4">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold mb-2">🏆 토너먼트 진행 중 🏆</h2>
          <div class="text-lg text-terminal-yellow mb-2">${message}</div>
          <div id="countdown-number" class="text-4xl font-bold text-terminal-cyan mb-2">${seconds}</div>
          <div class="text-sm text-terminal-gray">매치 #${matchId}</div>
        </div>
        
        <div class="flex-1 w-full flex items-center justify-center overflow-hidden">
          <div class="w-full h-full flex justify-center items-center">
            ${bracketHTML}
          </div>
        </div>
      </div>
    `;
    
    // 카운트다운 요소 참조
    const countdownElement = this.container.querySelector('#countdown-number');
    let countdown = seconds;
    
    const updateCountdown = () => {
      countdown--;
      if (countdownElement && countdown >= 0) {
        countdownElement.textContent = countdown.toString();
        if (countdown >= 0) {
          setTimeout(updateCountdown, 1000);
        }
      }
    };
    
    // 1초 후부터 카운트다운 시작
    setTimeout(updateCountdown, 1000);
  }

  /**
   * 토너먼트 매치를 위한 대기 화면 플로우 시작
   * GamePage의 startWaitingFlow와 동일한 패턴을 따름
   */
  private startTournamentMatchFlow(gameInfo: any): void {
    console.log('Starting tournament match flow with game info:', gameInfo);
    
    // 1. 이번 매치를 위한 새로운 GameRenderer와 InputHandler 생성
    const renderer = new GameRenderer();
    const inputHandler = new InputHandler();
    
    // 2. 대기 화면을 먼저 렌더링합니다.
    this.renderWaitingScreen();

    // 3. 기존 토너먼트 WebSocket을 재사용 (GamePage와 다른 점)
    const gameWebSocketService = this.webSocketService!;
    
    // 4. 이번 매치를 위한 새로운 GameClient 생성하고 콜백을 전달합니다.
    const gameClient = new GameClient(
      gameInfo,
      gameWebSocketService, // 토너먼트 WebSocket 재사용
      renderer,
      inputHandler,
      {
        onPreGameCountdown: (time) => this.updateWaitingScreenCountdown(time),
        onGameStart: () => this.transitionToGameScreen(renderer),
        onFinish: (result: any) => {
          console.log('Game finished, processing result and updating bracket');
          
          if (result) {
            try {
              const tournamentResult = this.convertGameResultToTournamentResult(result);
              this.onGameResult(tournamentResult);
              
              // 게임 결과 후 브라켓과 카운트다운 표시 (5초)
              this.showGameResultWithBracket(tournamentResult);
              
            } catch (error) {
              console.error('Error converting game result:', error);
            }
          }

          // 게임 클라이언트 리소스 정리 (하지만 토너먼트 WebSocket은 유지)
          gameClient.destroy();
          this.isProcessingMatch = false; // 매치 처리 완료  
        }
      }
    );
    
    // 5. GameClient에 연결 및 이벤트 수신 시작을 지시합니다. (이미 연결된 WebSocket 사용)
    gameClient.connectAndListen();
  }

  /**
   * 대기 화면 렌더링 (GamePage의 renderWaitingScreen과 동일)
   */
  private renderWaitingScreen(): void {
    this.container.innerHTML = `
      <div id="waiting-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
        <h2 class="text-3xl font-bold mb-4">토너먼트 매치 시작</h2>
        <p class="text-xl mb-8">게임이 곧 시작됩니다...</p>
        <div id="countdown-display" class="text-7xl font-mono font-bold mb-8"></div>
        <div class="text-sm text-terminal-cyan">준비하세요!</div>
      </div>
    `;
  }

  /**
   * 대기 화면 카운트다운 업데이트 (GamePage의 updateWaitingScreenCountdown과 동일)
   */
  private updateWaitingScreenCountdown(time: number): void {
    const countdownDisplay = this.container.querySelector('#countdown-display');
    if (countdownDisplay) {
      countdownDisplay.textContent = time > 0 ? time.toString() : '';
    }
  }

  /**
   * 게임 화면으로 전환 (매치별 renderer 인스턴스 사용)
   */
  private transitionToGameScreen(renderer: GameRenderer): void {
    this.container.innerHTML = ''; // 대기 화면 UI 제거
    this.container.appendChild(renderer.render()); // 게임 렌더러의 DOM 요소 추가
  }

  private handleTournamentEnd = (): void => {
    console.log('Tournament ended');
    
    // 타이머 정리
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // 토너먼트 종료 시 모든 모달 닫기
    this.modalManager.hide();
    this.isProcessingMatch = false;
    
    // 즉시 최종 토너먼트 결과 표시
    this.showFinalTournamentResultModal();
  };

  private updateBracketDisplay(): void {
    // 브라켓 모달이 열려있으면 내용만 갱신
    const bracketDiv = document.querySelector('#bracket-container');
    if (bracketDiv && this.bracketMatches) {
      bracketDiv.innerHTML = this.generateBracketHTML(this.bracketMatches);
    }
  }

  /**
   * 게임 결과와 함께 업데이트된 브라켓을 표시하는 메서드
   */
  private showGameResultWithBracket(result: TournamentMatchResult): void {
    // 우승자 정보 표시
    const winnerInfo = result.participants.find(p => p.id === result.winnerId);
    const winnerName = winnerInfo ? (winnerInfo.displayName || winnerInfo.name) : 'Unknown';
    
    // 브라켓 HTML 생성
    const bracketHTML = this.bracketMatches ? this.generateBracketHTML(this.bracketMatches) : 
      '<div class="text-center text-terminal-gray">브라켓 정보를 불러오는 중...</div>';
    
    // 초기 화면 렌더링 (한 번만)
    this.container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green p-4">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold mb-2">🏆 매치 결과 🏆</h2>
          <div class="text-lg text-terminal-yellow mb-2">
            승자: <span class="font-bold">${winnerName}</span>
          </div>
          <div class="text-md text-terminal-cyan mb-2">다음 매치 준비 중...</div>
          <div id="result-countdown" class="text-4xl font-bold text-terminal-cyan mb-2">5</div>
          <div class="text-sm text-terminal-gray">매치 #${result.matchId} 완료</div>
        </div>
        
        <div class="flex-1 w-full flex items-center justify-center overflow-hidden">
          <div class="w-full h-full flex justify-center items-center">
            ${bracketHTML}
          </div>
        </div>
      </div>
    `;
    
    // 카운트다운 요소 참조
    const countdownElement = this.container.querySelector('#result-countdown');
    let countdown = 5;
    
    const updateCountdown = () => {
      countdown--;
      if (countdownElement && countdown >= 0) {
        countdownElement.textContent = countdown.toString();
        if (countdown >= 0) {
          setTimeout(updateCountdown, 1000);
        }
      }
    };
    
    // 1초 후부터 카운트다운 시작
    setTimeout(updateCountdown, 1000);
  }

  // GameResult를 TournamentMatchResult로 변환하는 헬퍼 메서드
  private convertGameResultToTournamentResult(gameResult: any): TournamentMatchResult {
    if (!this.currentMatch) {
      throw new Error('Current match is not available for result conversion');
    }

    console.log('Converting game result:', gameResult);
    console.log('Current match:', this.currentMatch);

    const matchId = this.currentMatch.id;
    
    // 참가자 정보를 더 정확하게 매핑
    const participants = this.currentMatch.participants.map((p, index) => {
      // 실제 이름 우선순위: display_name > name > fallback
      let displayName = p.display_name || p.name;
      
      // 만약 여전히 Player 1, Player 2 같은 기본값이면 gameResult에서 찾아보기
      if (!displayName || displayName.startsWith('Player')) {
        if (index === 0 && gameResult.leftPlayer?.name) {
          displayName = gameResult.leftPlayer.name;
        } else if (index === 1 && gameResult.rightPlayer?.name) {
          displayName = gameResult.rightPlayer.name;
        }
      }
      
      return {
        id: p.id || index + 1,
        name: displayName || `Player ${index + 1}`,
        type: (p.type || 'guest') as 'user' | 'guest',
        displayName: displayName,
        userId: p.user_id || null
      };
    });

    // GameResult에서 winnerId 추출 (더 안전한 방식)
    let winnerId: number;
    const leftScore = gameResult.leftPlayer?.score || 0;
    const rightScore = gameResult.rightPlayer?.score || 0;
    
    if (gameResult.winner === 'left' || leftScore > rightScore) {
      winnerId = participants[0]?.id || 1;
    } else {
      winnerId = participants[1]?.id || 2;
    }

    // 점수 정보 생성
    const scores = [
      {
        playerId: participants[0]?.id || 1,
        score: leftScore
      },
      {
        playerId: participants[1]?.id || 2,
        score: rightScore
      }
    ];

    const result: TournamentMatchResult = {
      matchId,
      winnerId,
      scores,
      participants
    };

    console.log('Converted tournament result:', result);
    return result;
  }

  // result를 받아 브라켓 상태를 갱신하고 렌더링하는 public 메서드
  public onGameResult(result: TournamentMatchResult) {
    const idx = this.bracketResults.findIndex(r => r.matchId === result.matchId);
    if (idx >= 0) {
      this.bracketResults[idx] = result;
    } else {
      this.bracketResults.push(result);
    }
    
    // 브라켓 디스플레이 실시간 업데이트
    this.updateBracketDisplay();
  }

  // TournamentClient에 최종 토너먼트 결과 모달을 띄우는 메서드 (홈으로 버튼 있음)
  public showFinalTournamentResultModal() {
    // 최종 우승자 찾기
    const finalMatch = this.bracketMatches?.find(m => m.round_number === 2);
    const winnerId = finalMatch?.winner_id;
    const winner = finalMatch?.participants?.find(p => p.id === winnerId);
    const winnerName = winner ? (winner.display_name || winner.name) : 'Unknown';
    
    // 브라켓 HTML 생성
    const bracketHTML = this.bracketMatches ? this.generateBracketHTML(this.bracketMatches) : 
      '<div class="text-center text-terminal-gray">브라켓 정보를 불러올 수 없습니다.</div>';
    
    // 최종 결과 화면 표시
    this.container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green p-4">
        <div class="text-center mb-4">
          <h2 class="text-3xl font-bold mb-2">🏆 토너먼트 완료! 🏆</h2>
          <div class="text-2xl text-terminal-yellow mb-4">
            우승자: <span class="font-bold">${winnerName}</span>
          </div>
          <div class="text-lg text-terminal-cyan mb-2">축하합니다!</div>
        </div>
        
        <div class="flex-1 w-full flex items-center justify-center overflow-hidden mb-4">
          <div class="w-full h-full flex justify-center items-center">
            ${bracketHTML}
          </div>
        </div>
        
        <div class="flex gap-4">
          <button id="home-btn" class="px-6 py-2 bg-terminal-green text-terminal-black font-bold rounded-lg hover:bg-opacity-80 transition-all">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    `;
    
    // 홈 버튼 이벤트 리스너 추가
    const homeBtn = this.container.querySelector('#home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
  }
}
