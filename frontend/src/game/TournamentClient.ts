import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { TournamentWebSocketService } from '../services/websocket/TournamentWebSocketService';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { authStore } from '../store/authStore';
import { ModalManager } from '../managers/ModalManager';
import { GameEndModal } from '../components/modals/GameEndModal';

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

export class TournamentClient {
  private container: HTMLElement;
  private tournamentId: number;
  private currentUserId: number | null;
  private renderer: GameRenderer;
  private inputHandler: InputHandler;
  private gameClient: GameClient | null = null;
  private tournamentWebSocketService: TournamentWebSocketService | null = null;
  private currentMatch: TournamentMatch | null = null; // 현재 매치 정보를 단일 인스턴스로 관리
  private bracketMatches: TournamentMatch[] | null = null; // 브라켓 정보를 저장할 배열
  private modalManager: ModalManager;
  private matchModalId: string | null = null;
  private resultModalId: string | null = null;
  private bracketModalId: string | null = null;

  constructor(
    container: HTMLElement,
    tournamentId: number,
    currentUserId: number | null,
    renderer: GameRenderer,
    inputHandler: InputHandler
  ) {
    this.container = container;
    this.tournamentId = tournamentId;
    this.currentUserId = currentUserId;
    this.renderer = renderer;
    this.inputHandler = inputHandler;
    this.modalManager = ModalManager.getInstance();
  }

  public start(): void {
    this.connectToTournament();
  }

  public destroy(): void {
    this.gameClient?.destroy();
    this.tournamentWebSocketService?.disconnect();
    this.container.innerHTML = '';
  }

  private renderMainView({ status, message }: { status: string; message?: string }) {
    // 항상 브라켓을 메인에 렌더링, 상태 메시지는 오버레이로 표시
    this.container.innerHTML = `
      <div id="tournament-bracket-root" class="relative w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green p-8">
        <div id="bracket-container" class="w-full max-w-4xl flex flex-col items-center justify-center mb-8">
          <!-- 브라켓이 여기에 렌더링됨 -->
        </div>
        <div id="tournament-status-overlay" class="absolute top-0 left-0 w-full flex justify-center z-20 pointer-events-none">
          ${message ? `<div class="bg-terminal-black bg-opacity-80 px-6 py-3 rounded-lg text-terminal-yellow text-xl font-bold shadow-lg mt-8">${message}</div>` : ''}
        </div>
      </div>
    `;
    if (this.bracketMatches) {
      this.updateBracketDisplay();
    }
  }

  private openBracketModal(status: string, message?: string) {
    // 기존 모달 닫기
    if (this.bracketModalId) {
      this.modalManager.hide();
      this.bracketModalId = null;
    }
    const modalContent = {
      title: '토너먼트 브라켓',
      content: () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-[700px] min-h-[400px] flex flex-col items-center justify-center';
        const bracketDiv = document.createElement('div');
        bracketDiv.id = 'bracket-container';
        bracketDiv.className = 'w-full max-w-4xl flex flex-col items-center justify-center mb-8';
        if (this.bracketMatches) {
          const bracket = { rounds: [this.bracketMatches.filter(m => m.round_number === 1), this.bracketMatches.filter(m => m.round_number === 2)] };
          bracketDiv.innerHTML = this.generateBracketHTML(bracket);
        }
        wrapper.appendChild(bracketDiv);
        if (message) {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'bg-terminal-black bg-opacity-80 px-6 py-3 rounded-lg text-terminal-yellow text-xl font-bold shadow-lg mt-8';
          msgDiv.textContent = message;
          wrapper.appendChild(msgDiv);
        }
        return wrapper;
      },
      onShow: () => {},
      onClose: () => {},
      config: {
        closable: false,
        closeOnOutsideClick: false,
        sizeClass: 'max-w-[750px] w-[95%] min-h-[400px] flex items-center justify-center'
      }
    };
    this.modalManager.show(modalContent);
    this.bracketModalId = null;
  }

  private connectToTournament(): void {
    if (!this.currentUserId) {
      console.error('Current user ID is required to connect to tournament');
      alert('토너먼트 연결에 실패했습니다. 사용자 ID가 필요합니다.');
      this.destroy();
      return;
    }

    console.log(`Connecting to tournament ${this.tournamentId} with user ID ${this.currentUserId}`);

    // 토너먼트 웹소켓 서비스 생성 및 연결
    this.tournamentWebSocketService = new TournamentWebSocketService();
    this.tournamentWebSocketService.connect(this.tournamentId.toString(), this.currentUserId);

    this.tournamentWebSocketService.on('tournament_bracket', (data: any) => {
      this.handleTournamentBracket(data);
    });
    this.tournamentWebSocketService.on('bracket_update', (data: any) => {
      this.handleBracketUpdate(data);
    });
    this.tournamentWebSocketService.on('match_starting', (data: any) => {
      this.handleMatchStarting(data);
    });
    this.tournamentWebSocketService.on('tournament_end', (data: any) => {
      this.handleTournamentEnd(data);
    });
    this.tournamentWebSocketService.on('error', (error: any) => {
      alert('토너먼트 연결 중 오류가 발생했습니다.');
      this.destroy();
    });
  }

  private renderTournamentWaitingScreen(): void {
    this.container.innerHTML = `
      <div id="tournament-waiting-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
        <h2 class="text-3xl font-bold mb-4">🏆 Tournament Starting 🏆</h2>
        <p class="text-xl mb-8">Preparing tournament bracket...</p>
        <div id="tournament-status" class="text-lg mb-4 text-terminal-yellow">Initializing...</div>
        <div id="participants-list" class="text-sm mb-8 p-4 border border-terminal-green rounded-lg">
          <div class="mb-2 font-bold text-terminal-cyan">Tournament Participants:</div>
          <div class="text-xs space-y-1">
            <div class="flex items-center">
              <span class="mr-2">👤</span>
              <span>Current User (ID: ${this.currentUserId})</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>Guest Player 1</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>Guest Player 2</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>Guest Player 3</span>
            </div>
          </div>
        </div>
        <div class="text-xs text-terminal-gray mb-4">Tournament ID: ${this.tournamentId}</div>
        <div class="text-sm text-terminal-cyan mb-4">⏳ Tournament will start automatically in 5 seconds...</div>
        <button id="cancel-tournament-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
          Cancel Tournament
        </button>
      </div>
    `;

    // 취소 버튼 이벤트 리스너
    this.container.querySelector('#cancel-tournament-btn')?.addEventListener('click', () => {
      // 카운트다운 중단
      if ((this as any).countdownInterval) {
        clearInterval((this as any).countdownInterval);
        (this as any).countdownInterval = null;
      }
      this.cancelTournament();
    });
  }

  private renderTournamentBracket(bracket: any): void {
    this.container.innerHTML = `
      <div id="tournament-bracket-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green p-8">
        <h2 class="text-3xl font-bold mb-2">🏆 Tournament Bracket 🏆</h2>
        <div class="text-sm text-terminal-gray mb-6">Tournament ID: ${this.tournamentId}</div>
        <div id="bracket-container" class="w-full max-w-4xl mb-8">
          ${this.generateBracketHTML(bracket)}
        </div>
        <div id="tournament-controls" class="flex gap-4">
          <button id="start-tournament-btn" class="px-6 py-3 border border-terminal-green text-terminal-green rounded-lg hover:bg-terminal-green hover:bg-opacity-10 transition-all">
            🚀 Start Tournament
          </button>
          <button id="cancel-tournament-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
            ❌ Cancel
          </button>
        </div>
      </div>
    `;

    // 버튼 이벤트 리스너들
    this.container.querySelector('#start-tournament-btn')?.addEventListener('click', () => {
      this.startTournament();
    });

    this.container.querySelector('#cancel-tournament-btn')?.addEventListener('click', () => {
      this.cancelTournament();
    });
  }

  private generateBracketHTML(bracket: any): string {
    // 2열 준결승 + 중앙 결승 구조로 브라켓을 렌더링
    if (!bracket || !bracket.rounds || !Array.isArray(bracket.rounds) || bracket.rounds.length < 2) {
      return '<div class="text-center text-red-500">Invalid bracket data</div>';
    }
    const semiFinals = bracket.rounds[0];
    const final = bracket.rounds[1][0];
    // 준결승 2경기, 결승 1경기 가정
    return `
      <div class="grid grid-cols-3 gap-8 items-center justify-center w-full">
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(semiFinals[0], '준결승 1')}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(final, '결승')}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(semiFinals[1], '준결승 2')}
        </div>
      </div>
    `;
  }

  private renderBracketMatch(match: any, label: string): string {
    const player1Name = match?.player1?.nickname || match?.player1?.name || 'Unknown';
    const player2Name = match?.player2?.nickname || match?.player2?.name || 'Unknown';
    const matchId = match?.matchId || match?.id || '';
    const winner = match?.winnerId || match?.winner_id;
    return `
      <div class="p-4 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-56 text-center ${label === '결승' ? 'border-terminal-yellow' : 'border-terminal-green'}">
        <div class="text-lg font-bold mb-2">${label}</div>
        <div class="flex flex-col gap-2">
          <div class="${winner === match?.player1?.id ? 'text-terminal-yellow font-bold' : ''}">${player1Name}</div>
          <div class="text-terminal-green">vs</div>
          <div class="${winner === match?.player2?.id ? 'text-terminal-yellow font-bold' : ''}">${player2Name}</div>
        </div>
        <div class="text-xs text-terminal-gray mt-2">ID: ${matchId}</div>
      </div>
    `;
  }

  private renderMatchScreen(match: TournamentMatch): void {
    const player1Name = match.participants[0]?.name || 'Player 1';
    const player2Name = match.participants[1]?.name || 'Player 2';
    
    this.container.innerHTML = `
      <div id="match-screen" class="w-full h-full flex flex-col bg-terminal-black text-terminal-green">
        <div id="match-info" class="text-center p-4 border-b border-terminal-green">
          <h2 class="text-2xl font-bold mb-2">🏆 Tournament Match 🏆</h2>
          <div class="text-lg mb-2">
            <span class="text-terminal-cyan font-bold">${player1Name}</span> 
            <span class="text-terminal-green mx-4">vs</span> 
            <span class="text-terminal-cyan font-bold">${player2Name}</span>
          </div>
          <div id="match-status" class="text-sm text-terminal-yellow">Starting...</div>
          <div class="text-xs text-terminal-gray mt-1">Match ID: ${match.id}</div>
        </div>
        <div id="game-container" class="flex-1 flex items-center justify-center">
          <div class="text-lg">Loading game...</div>
        </div>
      </div>
    `;
  }

  private renderTournamentEndScreen(winner: any): void {
    this.container.innerHTML = `
      <div id="tournament-end-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
        <h2 class="text-4xl font-bold mb-6">🏆 Tournament Complete! 🏆</h2>
        <div class="text-2xl mb-8">
          Winner: <span class="text-terminal-yellow font-bold">${winner?.name || 'Unknown'}</span>
        </div>
        <div id="final-results" class="text-lg mb-8 p-6 border border-terminal-green rounded-lg">
          <div class="mb-4 text-xl font-bold">Final Results:</div>
          <div class="text-sm space-y-2">
            <div class="flex items-center">
              <span class="mr-2">🥇</span>
              <span>1st Place: ${winner?.name || 'Unknown'}</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🥈</span>
              <span>2nd Place: Runner-up</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🥉</span>
              <span>3rd Place: Third Place</span>
            </div>
          </div>
        </div>
        <button id="return-to-main-btn" class="px-6 py-3 border border-terminal-green text-terminal-green rounded-lg hover:bg-terminal-green hover:bg-opacity-10 transition-all">
          Return to Main Menu
        </button>
      </div>
    `;

    this.container.querySelector('#return-to-main-btn')?.addEventListener('click', () => {
      this.destroy();
    });
  }

  private handleTournamentBracket(data: any): void {
    this.bracketMatches = data.matches;
    this.updateBracketDisplay();
    this.openBracketModal('waiting', '토너먼트 대기 중...');
  }

  private handleBracketUpdate(data: any): void {
    if (data && data.matches) {
      this.bracketMatches = data.matches;
      this.updateBracketDisplay();
    }
  }

  private handleMatchStarting(data: any): void {
    // 매치 시작 시 브라켓 모달을 닫고, 메인 컨테이너에 게임 전체화면을 렌더링합니다.
    if (this.bracketModalId) {
      this.modalManager.hide();
      this.bracketModalId = null;
    }
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
      this.renderGameToMain({ gameId, participants });
  }

  private handleTournamentEnd = (data: any): void => {
    // 최종 결과 모달만 띄우고, 브라켓은 그대로 유지
    this.handleMatchFinish();
  };

  private renderGameToMain({ gameId, participants }: { gameId: string; participants: any[] }) {
    // 메인 콘텐츠 영역을 찾아 게임 렌더러의 결과물로 교체합니다.
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) {
      console.error('메인 콘텐츠 영역을 찾을 수 없습니다.');
      return;
    }
    // 기존 내용을 비우고 게임 화면을 채웁니다.
    mainContent.innerHTML = '';
    // 새로운 GameClient를 생성합니다.
    this.gameClient = new GameClient(
      { gameId, type: 'tournament', status: 'waiting', players: participants },
      new WebSocketService(),
      this.renderer, // TournamentClient가 이미 가지고 있는 renderer를 재사용
      this.inputHandler,
      {
        onPreGameCountdown: () => {},
        onGameStart: () => {},
        onFinish: () => {
          // matchId만 넘김 (undefined 방지)
          if (this.currentMatch?.id !== undefined) {
            this.handleMatchFinish(this.currentMatch.id);
          } else {
            console.warn('[WARN] onFinish: currentMatch.id가 undefined입니다.');
          }
        },
      },
    );
    // 렌더러의 DOM 요소를 메인 콘텐츠에 추가
    mainContent.appendChild(this.renderer.render());
    // 게임 클라이언트의 WebSocket 연결을 시작합니다.
    this.gameClient.connectAndListen();
  }

  // handleMatchFinish를 matchId만 받아서, match 정보를 API로 조회 후 렌더링
  private async handleMatchFinish(matchId?: number) {
    if (matchId === undefined) {
      console.warn('[WARN] handleMatchFinish: matchId가 undefined입니다.');
      return;
    }
    // 게임 클라이언트 리소스 정리
    this.gameClient?.destroy();
    this.gameClient = null;
    try {
      const res = await fetch(`/api/tournaments/${this.tournamentId}/matches/${matchId}`);
      const match = await res.json();
      if (match.status !== 'finished') {
        console.warn('[WARN] handleMatchFinish: match가 아직 finished 상태가 아님', match);
        return;
      }
      const winner = match.winner_id;
      const scores = match.participants.map((p: any) => ({ id: p.id, score: p.score, display_name: p.display_name }));
      // 이하 기존 winner, scores로 결과 렌더링 로직
      let winnerId = winner;
      if (winnerId === undefined || winnerId === null) {
        console.warn('[WARN] handleMatchFinish: winnerId가 undefined/null입니다. match:', match);
        return;
      }
      if (this.currentMatch && this.currentMatch.resultSent) {
        console.log('Match result already sent, skipping...');
        return;
      }
      if (this.currentMatch) this.currentMatch.resultSent = true;
      this.renderMainView({ status: 'in_progress', message: '다음 경기를 기다리는 중...' });
      if (this.bracketMatches) {
        this.updateBracketDisplay();
      }
      // 결과 모달 띄우기 등 기존 로직 유지
      const isFinal = this.currentMatch?.round_number === 2;
      const gameResult = this.makeGameResult({ id: winnerId }, scores);
      const resultModal = new GameEndModal(
        gameResult,
        true, // isTournament
        isFinal,
        () => {
          this.modalManager.hide();
          this.resultModalId = null;
          if (!isFinal) {
            this.openBracketModal('waiting', '다음 매치 대기 중...');
          }
        },
        isFinal ? undefined : () => {
          this.modalManager.hide();
          this.resultModalId = null;
          this.openBracketModal('waiting', '다음 매치 대기 중...');
        },
        undefined,
        'tournament'
      );
      resultModal.show();
      this.resultModalId = null;
    } catch (e) {
      console.error('handleMatchFinish: match 정보 조회 실패', e);
    }
  }

  private renderWaitingForNextMatch(): void {
    this.container.innerHTML = `
      <div id="waiting-next-match" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
        <h2 class="text-3xl font-bold mb-4">🎉 Match Complete! 🎉</h2>
        <p class="text-xl mb-8">Waiting for next match...</p>
        <div id="next-match-info" class="text-lg p-4 border border-terminal-green rounded-lg">
          <div class="mb-2 font-bold">Preparing next round...</div>
          <div class="text-sm text-terminal-yellow">Please wait while the tournament progresses.</div>
        </div>
      </div>
    `;
  }

  private updateBracketDisplay(): void {
    // 브라켓 모달이 열려있으면 내용만 갱신
    const bracketDiv = document.querySelector('#bracket-container');
    if (bracketDiv && this.bracketMatches) {
      const bracket = { rounds: [this.bracketMatches.filter(m => m.round_number === 1), this.bracketMatches.filter(m => m.round_number === 2)] };
      bracketDiv.innerHTML = this.generateBracketHTML(bracket);
    }
  }

  private startTournament(): void {
    console.log('Starting tournament...');
    
    this.tournamentWebSocketService?.sendMessage({
      type: 'tournament_start',
      data: { playerId: this.currentUserId }
    });
    
    // 토너먼트 시작 상태로 UI 업데이트
    const startButton = this.container.querySelector('#start-tournament-btn');
    if (startButton) {
      startButton.textContent = '🚀 Starting...';
      startButton.setAttribute('disabled', 'true');
      startButton.classList.add('opacity-50');
    }
  }

  private startCountdown(): void {
    let countdown = 5;
    const statusElement = this.container.querySelector('#tournament-status');
    
    const countdownInterval = setInterval(() => {
      if (statusElement) {
        statusElement.textContent = `Starting in ${countdown}...`;
      }
      
      countdown--;
      
      if (countdown < 0) {
        clearInterval(countdownInterval);
        console.log('Countdown finished, starting tournament...');
        
        this.tournamentWebSocketService?.sendMessage({
          type: 'tournament_start',
            data: { playerId: this.currentUserId }
        });
        
        // 상태 업데이트
        if (statusElement) {
          statusElement.textContent = 'Starting tournament...';
          statusElement.className = 'text-lg mb-4 text-terminal-green';
        }
      }
    }, 1000);
    
    // 카운트다운 인터벌을 클래스 멤버로 저장하여 취소 시 중단할 수 있도록 함
    (this as any).countdownInterval = countdownInterval;
  }

  private cancelTournament(): void {
    console.log('Canceling tournament...');
    this.tournamentWebSocketService?.sendMessage({
      type: 'cancel_tournament',
      data: { tournamentId: this.tournamentId }
    });
    this.destroy();
  }

  private makeGameResult(winner: any, scores: any[]): any {
    // GameEndModal에 전달할 GameResult 객체 생성 (간략화)
    // 실제 구현에서는 점수, 플레이어 정보 등 추가 필요
    return {
      winner: winner?.id,
      leftPlayer: scores.find(p => p.id === this.currentMatch?.participants[0]?.id) || { nickname: 'Player 1', score: 0 },
      rightPlayer: scores.find(p => p.id === this.currentMatch?.participants[1]?.id) || { nickname: 'Player 2', score: 0 },
      totalRounds: (scores.find(p => p.id === this.currentMatch?.participants[0]?.id)?.score || 0) + (scores.find(p => p.id === this.currentMatch?.participants[1]?.id)?.score || 0),
      gameMode: 'tournament'
    };
  }
} 
