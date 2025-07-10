import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { ModalManager, ModalContent } from '../managers/ModalManager';

// TournamentBracketModal: 게임 종료 후 브라켓 결과를 보여주는 모달
export class TournamentBracketModal {
  private modalManager: ModalManager;
  private result: TournamentMatchResult;
  private onClose?: () => void;

  constructor(result: TournamentMatchResult, onClose?: () => void) {
    this.modalManager = ModalManager.getInstance();
    this.result = result;
    this.onClose = onClose;
  }

  public show(): void {
    const modalContent: ModalContent = {
      title: '토너먼트 결과',
      content: () => {
        const el = document.createElement('div');
        el.className = 'modal-body';
        el.innerHTML = this.renderBracketResult();
        return el;
      },
      onShow: () => {},
      onClose: () => { if (this.onClose) this.onClose(); },
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'max-w-[600px] w-[95%]'
      }
    };
    this.modalManager.show(modalContent);
  }

  private renderBracketResult(): string {
    // 안전성 확인
    if (!this.result.participants || !Array.isArray(this.result.participants)) {
      return '<div class="text-center text-red-500">매치 결과 데이터가 올바르지 않습니다.</div>';
    }
    
    if (!this.result.scores || !Array.isArray(this.result.scores)) {
      return '<div class="text-center text-red-500">점수 데이터가 올바르지 않습니다.</div>';
    }

    const winner = this.result.participants.find(p => p.id === this.result.winnerId);
    const playerBlocks = this.result.participants.map(participant => {
      const scoreObj = this.result.scores.find(s => s.playerId === participant.id);
      const isWinner = participant.id === this.result.winnerId;
      return `
        <div class="flex items-center gap-2 ${isWinner ? 'font-bold text-terminal-yellow' : ''}">
          <span>${participant.displayName || participant.name}</span>
          <span class="text-xs text-terminal-gray">(${participant.type === 'user' ? '유저' : '게스트'})</span>
          <span class="ml-2 text-lg">${scoreObj ? scoreObj.score : '-'}</span>
          ${isWinner ? '<span class="ml-1">🏆</span>' : ''}
        </div>
      `;
    }).join('');
    return `
      <div class="text-center mb-4">
        <div class="text-2xl font-bold mb-2">매치 #${this.result.matchId} 결과</div>
        <div class="mb-4">승자: <span class="text-terminal-yellow font-bold">${winner ? (winner.displayName || winner.name) : '-'}</span></div>
        <div class="flex flex-col gap-2 items-center">${playerBlocks}</div>
      </div>
    `;
  }
}
import i18next from 'i18next';

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
  private renderer: GameRenderer;
  private inputHandler: InputHandler;
  private gameClient: GameClient | null = null;
  private webSocketService: WebSocketService | null = null;
  private currentMatch: TournamentMatch | null = null; // 현재 매치 정보를 단일 인스턴스로 관리
  private bracketMatches: TournamentMatch[] | null = null; // 브라켓 정보를 저장할 배열
  private modalManager: ModalManager;
  private bracketModalId: string | null = null;

  // 브라켓 결과 상태 추가
  private bracketResults: TournamentMatchResult[] = [];
  private initialBracketModalShown: boolean = false;

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
    this.webSocketService?.disconnect();
    this.container.innerHTML = '';
  }

  // 카운트다운 화면 렌더링
  private showCountdownScreen(time: number): void {
    this.container.innerHTML = `
      <div class="countdown-screen flex flex-col items-center justify-center h-full bg-gray-900 text-white">
        <h2 class="text-3xl font-bold mb-8">경기 곧 시작</h2>
        <div class="text-8xl font-bold text-blue-500">${time}</div>
        <p class="text-xl mt-4">준비하세요!</p>
      </div>
    `;
  }

  // 게임 화면 렌더링
  private showGameScreen(): void {
    this.container.innerHTML = `
      <div class="game-screen h-full w-full bg-black">
        <canvas id="gameCanvas" class="w-full h-full"></canvas>
      </div>
    `;
  }

  private openBracketModal(message?: string) {
    // 기존 모달 닫기
    if (this.bracketModalId) {
      this.modalManager.hide();
      this.bracketModalId = null;
    }
    const modalContent = {
      title: i18next.t('tournament.client.bracketModal.title'),
      content: () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-[700px] min-h-[400px] flex flex-col items-center justify-center';
        const bracketDiv = document.createElement('div');
        bracketDiv.id = 'bracket-container';
        bracketDiv.className = 'w-full max-w-4xl flex flex-col items-center justify-center mb-8';
        if (this.bracketMatches) {
          bracketDiv.innerHTML = this.generateBracketHTML(this.bracketMatches);
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
    this.bracketModalId = 'bracket-modal';
  }

  private showInitialBracketModal(bracketData: any) {
    const modalManager = ModalManager.getInstance();
    modalManager.show({
      title: '토너먼트 대진표',
      content: () => {
        const el = document.createElement('div');
        el.className = 'modal-body';
        el.innerHTML = this.generateBracketHTML(bracketData);
        return el;
      },
      onShow: () => {},
      onClose: () => {},
      config: {
        closable: true,
        closeOnOutsideClick: true,
        sizeClass: 'max-w-[700px] w-[95%]'
      }
    });
  }

  private connectToTournament(): void {
    if (!this.currentUserId) {
      console.error(i18next.t('tournament.client.error.userIdRequired'));
      alert(i18next.t('tournament.client.alert.connectionFailedUserId'));
      this.destroy();
      return;
    }

    console.log(i18next.t('tournament.client.log.connecting', { tournamentId: this.tournamentId, currentUserId: this.currentUserId }));

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
      <div class="grid grid-cols-3 gap-8 items-center justify-center w-full">
        <div class="flex flex-col gap-8 items-center">
          ${semiFinals[0] ? this.renderBracketMatch(semiFinals[0], '준결승 1') : '<div class="text-terminal-gray">대기중</div>'}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${finals[0] ? this.renderBracketMatch(finals[0], '결승') : '<div class="text-terminal-gray">대기중</div>'}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${semiFinals[1] ? this.renderBracketMatch(semiFinals[1], '준결승 2') : '<div class="text-terminal-gray">대기중</div>'}
        </div>
      </div>
    `;
  }

  private renderBracketMatch(match: any, label: string): string {
    if (!match) {
      return `
        <div class="p-4 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-56 text-center border-terminal-gray">
          <div class="text-lg font-bold mb-2">${label}</div>
          <div class="text-terminal-gray">대기중</div>
        </div>
      `;
    }

    // 매치 데이터에서 참가자 정보 추출
    let player1Name = 'Player 1';
    let player2Name = 'Player 2';
    let player1Id = null;
    let player2Id = null;

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

    const matchId = match.matchId || match.id || '';
    const winner = match.winnerId || match.winner_id;
    
    return `
      <div class="p-4 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-56 text-center ${label === i18next.t('tournament.client.bracket.final') ? 'border-terminal-yellow' : 'border-terminal-green'}">
        <div class="text-lg font-bold mb-2">${label}</div>
        <div class="flex flex-col gap-2">
          <div class="${winner === player1Id ? 'text-terminal-yellow font-bold' : ''}">${player1Name}</div>
          <div class="text-terminal-green">vs</div>
          <div class="${winner === player2Id ? 'text-terminal-yellow font-bold' : ''}">${player2Name}</div>
        </div>
        <div class="text-xs text-terminal-gray mt-2">ID: ${matchId}</div>
        ${match.status ? `<div class="text-xs text-terminal-cyan mt-1">${match.status}</div>` : ''}
      </div>
    `;
  }

  private handleTournamentBracket(data: any): void {
    this.bracketMatches = data.matches;
    this.updateBracketDisplay();
    if (!this.initialBracketModalShown) {
      this.showInitialBracketModal(data);
      this.initialBracketModalShown = true;
    }
    this.openBracketModal('토너먼트 대기 중...');
  }

  private handleBracketUpdate(data: any): void {
    if (data && data.matches) {
      this.bracketMatches = data.matches;
      this.updateBracketDisplay();
    }
  }

  private handleMatchStarting(data: any): void {
    console.log('Match starting, hiding all modals and preparing for game');
    
    // 모든 모달 닫기
    this.modalManager.hide();
    this.bracketModalId = null;
    
    // 컨테이너 완전히 비우기 - 게임 화면만 표시되도록
    this.container.innerHTML = '';
    
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
    
    // GameResponseDto 형태로 변환
    const gameInfo = {
      gameId,
      type: 'tournament' as const,
      status: 'countdown' as const,
      players: participants
    };
    
    // GameClient를 TournamentClient에서 직접 생성
    if (this.gameClient) {
      this.gameClient.destroy();
      this.gameClient = null;
    }
    
    this.gameClient = new GameClient(
      gameInfo,
      this.webSocketService!,
      this.renderer,
      this.inputHandler,
      {
        onPreGameCountdown: (time) => {
          // 5초 카운트다운 화면을 직접 렌더링
          this.showCountdownScreen(time);
        },
        onGameStart: () => {
          // 게임 시작 시 화면 전환
          this.showGameScreen();
        },
        onFinish: (result: any) => {
          if (result) {
            try {
              // GameResult를 TournamentMatchResult로 변환
              const tournamentResult = this.convertGameResultToTournamentResult(result);
              // 결과 모달만 표시
              setTimeout(() => {
                this.showBracketResultModal(tournamentResult);
              }, 500); // 잠시 후 결과 모달 표시
            } catch (error) {
              console.error('Error converting game result to tournament result:', error);
              console.log('Game result that failed to convert:', result);
            }
          }
          
          // 게임 클라이언트 리소스 정리
          setTimeout(() => {
            this.gameClient?.destroy();
            this.gameClient = null;
          }, 100);
        }
      }
    );
    this.gameClient.connectAndListen();
  }

  private handleTournamentEnd = (): void => {
    console.log('Tournament ended');
    // 토너먼트 종료 시 모든 모달 닫기
    this.modalManager.hide();
    this.bracketModalId = null;
  };

  private updateBracketDisplay(): void {
    // 브라켓 모달이 열려있으면 내용만 갱신
    const bracketDiv = document.querySelector('#bracket-container');
    if (bracketDiv && this.bracketMatches) {
      bracketDiv.innerHTML = this.generateBracketHTML(this.bracketMatches);
    }
  }

  // GameResult를 TournamentMatchResult로 변환하는 헬퍼 메서드
  private convertGameResultToTournamentResult(gameResult: any): TournamentMatchResult {
    if (!this.currentMatch) {
      throw new Error('Current match is not available for result conversion');
    }

    console.log('Converting game result:', gameResult);
    console.log('Current match:', this.currentMatch);

    const matchId = this.currentMatch.id;
    const participants = this.currentMatch.participants.map((p, index) => ({
      id: p.id || index + 1, // fallback ID
      name: p.display_name || p.name || `Player ${index + 1}`,
      type: (p.type || 'guest') as 'user' | 'guest',
      displayName: p.display_name || p.name,
      userId: p.user_id || null
    }));

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
    this.renderBracket(this.bracketResults);
  }

  // result 배열 기반 브라켓 렌더링 함수
  private renderBracket(results: TournamentMatchResult[]): void {
    const matchHtmlList = results.map((result: TournamentMatchResult) => {
      const playerBlocks = result.participants.map((participant: TournamentMatchResult['participants'][0]) => {
        const scoreObj = result.scores.find((s: { playerId: number; score: number }) => s.playerId === participant.id);
        const isWinner = participant.id === result.winnerId;
        return `
          <div class="flex items-center gap-2 ${isWinner ? 'font-bold text-terminal-yellow' : ''}">
            <span>${participant.displayName || participant.name}</span>
            <span class="text-xs text-terminal-gray">(${participant.type === 'user' ? '유저' : '게스트'})</span>
            <span class="ml-2 text-lg">${scoreObj ? scoreObj.score : '-'}</span>
            ${isWinner ? '<span class="ml-1">🏆</span>' : ''}
          </div>
        `;
      }).join('');
      return `
        <div class="p-4 border rounded-lg bg-terminal-black bg-opacity-50 w-56 text-center mb-4">
          <div class="text-lg font-bold mb-2">매치 #${result.matchId}</div>
          ${playerBlocks}
        </div>
      `;
    });
    const html = `
      <div class="flex flex-row gap-8 justify-center">
        ${matchHtmlList.join('')}
      </div>
    `;
    const bracketDiv = document.getElementById('bracket-container');
    if (bracketDiv) {
      bracketDiv.innerHTML = html;
    }
  }

  // TournamentClient에 게임 종료 후 브라켓 결과 모달을 띄우는 메서드 추가
  public showBracketResultModal(result: TournamentMatchResult) {
    const modal = new TournamentBracketModal(result);
    modal.show();
  }
}
