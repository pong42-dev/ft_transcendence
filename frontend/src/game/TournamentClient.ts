import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { TournamentWebSocketService } from '../services/websocket/TournamentWebSocketService';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { authStore } from '../store/authStore';

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
  }

  public start(): void {
    this.renderTournamentWaitingScreen();
    this.connectToTournament();
  }

  public destroy(): void {
    this.gameClient?.destroy();
    this.tournamentWebSocketService?.disconnect();
    this.container.innerHTML = '';
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

    this.tournamentWebSocketService.on('open', () => {
      this.startCountdown();
    });
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
    console.log('Generating bracket HTML with data:', bracket);
    
    if (!bracket || !bracket.rounds || !Array.isArray(bracket.rounds)) {
      return '<div class="text-center text-red-500">Invalid bracket data</div>';
    }

    let html = '<div class="grid grid-cols-1 gap-6">';
    
    // 각 라운드 처리
    bracket.rounds.forEach((round: any[], roundIndex: number) => {
      const roundNumber = roundIndex + 1;
      const isFinal = roundIndex === bracket.rounds.length - 1;
      
      html += `
        <div class="text-center p-6 border-2 ${isFinal ? 'border-terminal-yellow' : 'border-terminal-green'} rounded-lg bg-terminal-black bg-opacity-50">
          <h3 class="text-2xl font-bold mb-4 text-terminal-yellow">
            ${isFinal ? '🏆 Final 🏆' : `Round ${roundNumber}`}
          </h3>
          <div class="space-y-3">
      `;
      
      // 각 매치 처리
      round.forEach((match: any, matchIndex: number) => {
        const player1Name = match.player1?.nickname || 'Unknown Player';
        const player2Name = match.player2?.nickname || 'Unknown Player';
        const matchId = match.matchId || `match-${roundIndex}-${matchIndex}`;
        
        html += `
          <div class="p-3 border ${isFinal ? 'border-terminal-yellow' : 'border-terminal-green'} rounded bg-terminal-black bg-opacity-30">
            <span class="font-bold">Match ${matchIndex + 1}:</span> 
            <span class="text-terminal-cyan">${player1Name}</span> 
            <span class="text-terminal-green">vs</span> 
            <span class="text-terminal-cyan">${player2Name}</span>
            <div class="text-xs text-terminal-gray mt-1">ID: ${matchId}</div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
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
    console.log('Tournament bracket received:', data);
    
    // 중복 처리 방지 - 이미 브라켓이 렌더링되었는지 확인
    if (this.container.querySelector('#bracket-container')) {
      console.log('Bracket already rendered, skipping...');
      return;
    }
    
    this.renderTournamentBracket(data.bracket);
    
    // 토너먼트가 시작되었으므로 시작 버튼 상태 업데이트
    const startButton = this.container.querySelector('#start-tournament-btn');
    if (startButton) {
      startButton.textContent = '🏆 Tournament Started';
      startButton.setAttribute('disabled', 'true');
      startButton.classList.add('opacity-50', 'text-terminal-yellow');
    }
  }

  private handleBracketUpdate(data: any): void {
    console.log('Bracket update received:', data);
    if (data && data.matches) {
      this.bracketMatches = data.matches;
    }
    if (this.currentMatch && this.currentMatch.status === 'starting') {
      console.log('Match in progress, skipping bracket update. currentMatch:', this.currentMatch);
      return;
    }
    if (!this.currentMatch) {
      console.log('No current match, skipping bracket update.');
      return;
    }
    const matchId = this.currentMatch.id;
    if (this.currentMatch.resultSent) {
      console.log('Match result already sent, skipping update. currentMatch:', this.currentMatch);
      return;
    }
    if (data.matchId && data.matchId === matchId) {
      if (data.status) {
        this.currentMatch.status = data.status;
      }
      if (data.winnerId) {
        this.currentMatch.winner_id = data.winnerId;
        this.currentMatch.resultSent = true;
      }
      this.updateBracketDisplay();
    }
  }

  private handleMatchStarting(data: any): void {
    console.log('[LOG] handleMatchStarting 진입', data);
    const { matchId, gameId, participants, round_number } = data;
    // round_number 우선순위: data.round_number → bracketMatches에서 찾기 → 1
    let roundNum = round_number;
    if (roundNum === undefined && this.bracketMatches) {
      const match = this.bracketMatches.find((m: any) => m.id == matchId);
      if (match && match.round_number !== undefined) {
        roundNum = match.round_number;
      }
    }
    if (roundNum === undefined) roundNum = 1;
    // === currentMatch를 항상 새 매치 정보로 갱신 ===
    this.currentMatch = {
      id: matchId,
      round_number: roundNum,
      status: 'starting',
      participants: participants || [],
      winner_id: undefined,
      started_at: undefined,
      resultSent: false // 반드시 false로 초기화
    };
    console.log('[LOG] handleMatchStarting 후 currentMatch:', this.currentMatch);
    if (this.gameClient) {
      this.gameClient.destroy();
      this.gameClient = null;
    }
    let gameContainer = this.container.querySelector('#game-container');
    if (!gameContainer) {
      gameContainer = document.createElement('div');
      gameContainer.id = 'game-container';
      gameContainer.className = 'flex-1 flex flex-col';
      this.container.appendChild(gameContainer);
    }
    this.gameClient = new GameClient(
      {
        gameId: gameId,
        type: 'tournament',
        status: 'waiting',
        players: participants
      },
      new WebSocketService(),
      this.renderer,
      this.inputHandler,
      {
        onPreGameCountdown: () => {},
        onGameStart: () => {},
        onFinish: (winner: any) => {
          this.handleMatchFinish(winner);
        },
      },
    );
    console.log('[LOG] gameClient 생성 완료:', this.gameClient);
    const renderResult = this.renderer.render();
    console.log('[LOG] renderer.render() 반환값:', renderResult);
    gameContainer.appendChild(renderResult);
    this.gameClient.connectAndListen();
  }

  private handleTournamentEnd(data: any): void {
    console.log('Tournament ended:', data);
    this.renderTournamentEndScreen(data.winner);
  }

  private handleMatchFinish(winner: any): void {
    console.log('Match finished, winner:', winner);
    // === winnerId가 undefined/null이면 participants에서 닉네임/점수로 찾아서 보정 ===
    let winnerId = winner?.id;
    if (winnerId === undefined || winnerId === null) {
      if (winner && winner.winner && this.currentMatch && this.currentMatch.participants) {
        const winnerName = typeof winner.winner === 'string' ? winner.winner : winner.winner.nickname || winner.winner.name;
        const found = this.currentMatch.participants.find(
          (p: any) => p.name === winnerName || p.nickname === winnerName || p.display_name === winnerName
        );
        if (found) {
          winnerId = found.id;
          console.log('[보정] winnerId를 participants에서 찾아서 할당:', winnerId);
        }
      }
      if ((winnerId === undefined || winnerId === null) && winner && winner.leftPlayer && winner.rightPlayer) {
        const left = this.currentMatch?.participants[0];
        const right = this.currentMatch?.participants[1];
        if (left && right) {
          if (winner.leftPlayer.score > winner.rightPlayer.score) winnerId = left.id;
          else if (winner.leftPlayer.score < winner.rightPlayer.score) winnerId = right.id;
        }
        if (winnerId) console.log('[보정] 점수로 winnerId 추정:', winnerId);
      }
    }
    if (winnerId === undefined || winnerId === null) {
      console.warn('[WARN] handleMatchFinish: winnerId가 undefined/null입니다. winner:', winner, 'participants:', this.currentMatch?.participants);
      return;
    }
    // 게임 클라이언트 정리
    this.gameClient?.destroy();
    this.gameClient = null;
    // 중복 결과 전송 방지
    if (!this.currentMatch) {
      console.log('No current match, skipping result send.');
      return;
    }
    const matchId = this.currentMatch.id;
    if (this.currentMatch.resultSent) {
      console.log('Match result already sent, skipping...');
      return;
    }
    console.log('Sending match result to server:', {
      matchId: matchId,
      winnerId: winnerId,
      resultSent: this.currentMatch.resultSent
    });
    this.tournamentWebSocketService?.sendMessage({
      type: 'match_result',
      data: {
        matchId: matchId,
        winnerId: winnerId
      }
    });
    this.currentMatch.resultSent = true;
    console.log('[LOG] handleMatchFinish 후 currentMatch:', this.currentMatch);
    this.renderWaitingForNextMatch();
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
    const bracketContainer = this.container.querySelector('#bracket-container');
    // 단순화: 브라켓 정보가 있으면 업데이트
    if (bracketContainer && this.currentMatch) {
      console.log('Updating bracket display for current match:', this.currentMatch);
      // 실제 브라켓 정보가 필요하다면 별도 관리 필요
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
} 
