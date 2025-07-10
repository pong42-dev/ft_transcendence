import { GameClient } from './GameClient';
import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { authStore } from '../store/authStore';
import { ModalManager, ModalContent } from '../managers/ModalManager';
import { GameEndModal } from '../components/modals/GameEndModal';

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
  private matchModalId: string | null = null;
  private resultModalId: string | null = null;
  private bracketModalId: string | null = null;
  private gamePage: any; // GamePage 타입으로 교체 필요

  // 브라켓 결과 상태 추가
  private bracketResults: TournamentMatchResult[] = [];
  private initialBracketModalShown: boolean = false;

  constructor(
    container: HTMLElement,
    tournamentId: number,
    currentUserId: number | null,
    renderer: GameRenderer,
    inputHandler: InputHandler,
    gamePage: any // GamePage 타입으로 교체 필요
  ) {
    this.container = container;
    this.tournamentId = tournamentId;
    this.currentUserId = currentUserId;
    this.renderer = renderer;
    this.inputHandler = inputHandler;
    this.modalManager = ModalManager.getInstance();
    this.gamePage = gamePage;
  }

  public start(): void {
    this.connectToTournament();
  }

  public destroy(): void {
    this.gameClient?.destroy();
    this.webSocketService?.disconnect();
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
      title: i18next.t('tournament.client.bracketModal.title'),
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
    this.webSocketService.on('tournament_end', (data: any) => {
      this.handleTournamentEnd(data);
    });
    this.webSocketService.on('error', (error: any) => {
      alert(i18next.t('tournament.client.alert.connectionError'));
      this.destroy();
    });
  }

  private renderTournamentWaitingScreen(): void {
    this.container.innerHTML = `
      <div id="tournament-waiting-screen" class="w-full h-full flex flex-col items-center justify-center bg-terminal-black text-terminal-green">
        <h2 class="text-3xl font-bold mb-4">${i18next.t('tournament.client.waitingScreen.title')}</h2>
        <p class="text-xl mb-8">${i18next.t('tournament.client.waitingScreen.preparingBracket')}</p>
        <div id="tournament-status" class="text-lg mb-4 text-terminal-yellow">${i18next.t('tournament.client.waitingScreen.initializing')}</div>
        <div id="participants-list" class="text-sm mb-8 p-4 border border-terminal-green rounded-lg">
          <div class="mb-2 font-bold text-terminal-cyan">${i18next.t('tournament.client.waitingScreen.participantsTitle')}</div>
          <div class="text-xs space-y-1">
            <div class="flex items-center">
              <span class="mr-2">👤</span>
              <span>${i18next.t('tournament.client.waitingScreen.currentUser', { userId: this.currentUserId })}</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>${i18next.t('tournament.client.waitingScreen.guestPlayer', { playerNum: 1 })}</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>${i18next.t('tournament.client.waitingScreen.guestPlayer', { playerNum: 2 })}</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">🤖</span>
              <span>${i18next.t('tournament.client.waitingScreen.guestPlayer', { playerNum: 3 })}</span>
            </div>
          </div>
        </div>
        <div class="text-xs text-terminal-gray mb-4">${i18next.t('tournament.client.waitingScreen.tournamentId', { tournamentId: this.tournamentId })}</div>
        <div class="text-sm text-terminal-cyan mb-4">${i18next.t('tournament.client.waitingScreen.autoStartTime')}</div>
        <button id="cancel-tournament-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
          ${i18next.t('tournament.client.button.cancelTournament')}
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
        <h2 class="text-3xl font-bold mb-2">${i18next.t('tournament.client.bracketScreen.title')}</h2>
        <div class="text-sm text-terminal-gray mb-6">${i18next.t('tournament.client.bracketScreen.tournamentId', { tournamentId: this.tournamentId })}</div>
        <div id="bracket-container" class="w-full max-w-4xl mb-8">
          ${this.generateBracketHTML(bracket)}
        </div>
        <div id="tournament-controls" class="flex gap-4">
          <button id="start-tournament-btn" class="px-6 py-3 border border-terminal-green text-terminal-green rounded-lg hover:bg-terminal-green hover:bg-opacity-10 transition-all">
            ${i18next.t('tournament.client.button.startTournament')}
          </button>
          <button id="cancel-tournament-btn" class="px-6 py-3 border border-terminal-red text-terminal-red rounded-lg hover:bg-terminal-red hover:bg-opacity-10 transition-all">
            ${i18next.t('tournament.client.button.cancel')}
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
      return `<div class="text-center text-red-500">${i18next.t('tournament.client.bracket.invalidData')}</div>`;
    }
    const semiFinals = bracket.rounds[0];
    const final = bracket.rounds[1][0];
    // 준결승 2경기, 결승 1경기 가정
    return `
      <div class="grid grid-cols-3 gap-8 items-center justify-center w-full">
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(semiFinals[0], i18next.t('tournament.client.bracket.semiFinal1'))}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(final, i18next.t('tournament.client.bracket.final'))}
        </div>
        <div class="flex flex-col gap-8 items-center">
          ${this.renderBracketMatch(semiFinals[1], i18next.t('tournament.client.bracket.semiFinal2'))}
        </div>
      </div>
    `;
  }

  private renderBracketMatch(match: any, label: string): string {
    const player1Name = match?.player1?.nickname || match?.player1?.name || i18next.t('common.player.unknown');
    const player2Name = match?.player2?.nickname || match?.player2?.name || i18next.t('common.player.unknown');
    const matchId = match?.matchId || match?.id || '';
    const winner = match?.winnerId || match?.winner_id;
    return `
      <div class="p-4 border-2 rounded-lg bg-terminal-black bg-opacity-50 w-56 text-center ${label === i18next.t('tournament.client.bracket.final') ? 'border-terminal-yellow' : 'border-terminal-green'}">
        <div class="text-lg font-bold mb-2">${label}</div>
        <div class="flex flex-col gap-2">
          <div class="${winner === match?.player1?.id ? 'text-terminal-yellow font-bold' : ''}">${player1Name}</div>
          <div class="text-terminal-green">${i18next.t('common.vs')}</div>
          <div class="${winner === match?.player2?.id ? 'text-terminal-yellow font-bold' : ''}">${player2Name}</div>
        </div>
        <div class="text-xs text-terminal-gray mt-2">${i18next.t('common.id')}: ${matchId}</div>
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
    this.openBracketModal('waiting', i18next.t('tournament.client.modal.waitingForTournament'));
  }

  private handleBracketUpdate(data: any): void {
    if (data && data.matches) {
      this.bracketMatches = data.matches;
      this.updateBracketDisplay();
    }
  }

  private handleMatchStarting(data: any): void {
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
      this.webSocketService!, // 반드시 TournamentClient가 관리하는 WebSocketService 인스턴스 전달
      this.renderer,
      this.inputHandler,
      {
        onPreGameCountdown: (time) => this.gamePage.updateWaitingScreenCountdown(time),
        onGameStart: () => this.gamePage.transitionToGameScreen(),
        onFinish: (result: any) => {
          if (result) {
            try {
              // GameResult를 TournamentMatchResult로 변환
              const tournamentResult = this.convertGameResultToTournamentResult(result);
              this.showBracketResultModal(tournamentResult);
            } catch (error) {
              console.error('Error converting game result to tournament result:', error);
              // 변환 실패 시 기본 메시지 표시
              console.log('Game result that failed to convert:', result);
            }
          }
          this.handleMatchFinish(matchId);
        }
      }
    );
    this.gameClient.connectAndListen();
  }

  private handleTournamentEnd = (data: any): void => {
    // 최종 결과 모달만 띄우고, 브라켓은 그대로 유지
    this.handleMatchFinish();
  };

  public handleMatchFinish(matchId?: number) {
    if (matchId === undefined) {
      console.warn('[WARN] handleMatchFinish: matchId가 undefined입니다.');
      return;
    }

    // 중복 처리 방지
    if (this.currentMatch && this.currentMatch.resultSent) {
      console.log('Match result already sent, skipping...');
      return;
    }
    if (this.currentMatch) this.currentMatch.resultSent = true;

    // 게임 클라이언트 리소스 정리 (비동기로 처리)
    setTimeout(() => {
      this.gameClient?.destroy();
      this.gameClient = null;
    }, 100);

    // UI 업데이트를 먼저 수행 (빠른 피드백)
    this.renderMainView({ status: 'in_progress', message: '매치 결과 처리 중...' });
    if (this.bracketMatches) {
      this.updateBracketDisplay();
    }

    // 매치 정보 조회를 비동기로 처리
    this.fetchMatchResultAsync(matchId);
  }

  private async fetchMatchResultAsync(matchId: number) {
    try {
      const res = await fetch(`/api/tournaments/${this.tournamentId}/matches/${matchId}`);
      const match = await res.json();
      
      if (match.status !== 'finished') {
        console.warn('[WARN] handleMatchFinish: match가 아직 finished 상태가 아님', match);
        // 잠시 후 다시 시도
        setTimeout(() => this.fetchMatchResultAsync(matchId), 1000);
        return;
      }

      const winnerId = match.winner_id;
      const scores = match.participants.map((p: any) => ({ 
        id: p.id, 
        score: p.score, 
        display_name: p.display_name 
      }));

      if (winnerId === undefined || winnerId === null) {
        console.warn('[WARN] handleMatchFinish: winnerId가 undefined/null입니다. match:', match);
        return;
      }

      // UI 업데이트
      this.renderMainView({ status: 'in_progress', message: '다음 경기를 기다리는 중...' });
      if (this.bracketMatches) {
        this.updateBracketDisplay();
      }

      // 결과 모달을 비동기로 표시
      setTimeout(() => {
        this.showMatchResultModal(winnerId, scores);
      }, 300);

    } catch (e) {
      console.error('handleMatchFinish: match 정보 조회 실패', e);
      // 에러 발생 시 기본 메시지 표시
      this.renderMainView({ status: 'error', message: '매치 결과 조회 중 오류가 발생했습니다.' });
    }
  }

  private showMatchResultModal(winnerId: number, scores: any[]) {
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
    console.log(i18next.t('tournament.client.log.startingTournament'));
    
    if (this.currentUserId !== null) {
      this.webSocketService?.sendMessage({
        type: 'tournament_start',
        data: { playerId: this.currentUserId }
      });
    }
    
    // 토너먼트 시작 상태로 UI 업데이트
    const startButton = this.container.querySelector('#start-tournament-btn');
    if (startButton) {
      startButton.textContent = i18next.t('tournament.client.button.starting');
      startButton.setAttribute('disabled', 'true');
      startButton.classList.add('opacity-50');
    }
  }

  // private startCountdown(): void {
  //   let countdown = 5;
  //   const statusElement = this.container.querySelector('#tournament-status');
    
  //   const countdownInterval = setInterval(() => {
  //     if (statusElement) {
  //       statusElement.textContent = `Starting in ${countdown}...`;
  //     }
      
  //     countdown--;
      
  //     if (countdown < 0) {
  //       clearInterval(countdownInterval);
  //       console.log('Countdown finished, starting tournament...');
        
  //       if (this.currentUserId !== null) {
  //         this.webSocketService?.sendMessage({
  //           type: 'tournament_start',
  //           data: { playerId: this.currentUserId }
  //         });
  //       }
        
  //       // 상태 업데이트
  //       if (statusElement) {
  //         statusElement.textContent = 'Starting tournament...';
  //         statusElement.className = 'text-lg mb-4 text-terminal-green';
  //       }
  //     }
  //   }, 1000);
    
  //   // 카운트다운 인터벌을 클래스 멤버로 저장하여 취소 시 중단할 수 있도록 함
  //   (this as any).countdownInterval = countdownInterval;
  // }

  private cancelTournament(): void {
    console.log(i18next.t('tournament.client.log.cancelingTournament'));
    this.webSocketService?.sendMessage({
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
      leftPlayer: scores.find(p => p.id === this.currentMatch?.participants[0]?.id) || { nickname: i18next.t('game.renderer.playerInfo.defaultPlayer1'), score: 0 },
      rightPlayer: scores.find(p => p.id === this.currentMatch?.participants[1]?.id) || { nickname: i18next.t('game.renderer.playerInfo.defaultPlayer2'), score: 0 },
      totalRounds: (scores.find(p => p.id === this.currentMatch?.participants[0]?.id)?.score || 0) + (scores.find(p => p.id === this.currentMatch?.participants[1]?.id)?.score || 0),
      gameMode: 'tournament'
    };
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
