import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { TournamentWebSocketService } from '../services/websocket/TournamentWebSocketService';
import { ApiClient } from '../services/ApiClient';
// 필요한 타입 import (예: TournamentBracket 등)

export class TournamentClient {
  private userId: number | null = null;
  private currentGameId: string | null = null;
  private isMatchRunning = false;
  private inputActive = false;
  private finalWinner: number | null = null;

  constructor(
    private container: HTMLElement,
    private wsService: TournamentWebSocketService,
    private renderer: GameRenderer,
    private inputHandler: InputHandler,
    private tournamentId: string,
    userId?: string | number
  ) {
    if (userId) this.userId = Number(userId);
  }

  public async start() {
    if (this.userId == null) {
      const apiClient = new ApiClient();
      const user = await apiClient.user.getProfile();
      this.userId = Number(user.id);
    }
    this.connect();
    this.setupWebSocketListeners();
    this.setupInputHandling();
  }

  private connect() {
    if (!this.userId) throw new Error('userId가 없습니다.');
    this.wsService.connect(this.tournamentId, this.userId);
  }

  private setupWebSocketListeners() {
    this.wsService.on('tournament_bracket', (data) => {
      this.isMatchRunning = false;
      this.inputHandler.deactivate();
      this.renderBracket(data.bracket);
    });
    this.wsService.on('bracket_update', (data) => {
      // 대진표/상태 갱신 (필요시 구현)
      this.renderBracket(data.bracket);
    });
    this.wsService.on('match_starting', (data) => {
      this.currentGameId = data.gameId;
      this.isMatchRunning = true;
      this.showGameScreen();
      this.inputHandler.activate(true);
      this.inputActive = true;
    });
    this.wsService.on('game_state', (gameState) => {
      if (this.isMatchRunning) {
        this.renderer.update(gameState);
      }
    });
    this.wsService.on('game_event', (gameEvent) => {
      this.handleGameEvent(gameEvent);
    });
    this.wsService.on('tournament_end', (data) => {
      this.finalWinner = data.winner;
      this.isMatchRunning = false;
      this.inputHandler.deactivate();
      this.inputActive = false;
      this.renderResult(data);
    });
  }

  private setupInputHandling() {
    this.inputHandler.on('input', (action, playerSide) => {
      if (this.isMatchRunning && this.inputActive && this.userId) {
        this.wsService.sendMessage({
          type: 'player_input',
          data: { playerId: this.userId, input: { action } }
        });
      }
    });
  }

  private renderBracket(bracket: any) {
    this.container.innerHTML = '';
    // 대진표 UI 렌더링 로직 (예: DOM 생성)
    // 예시: this.container.appendChild(...)
  }

  private showGameScreen() {
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.render());
  }

  private handleGameEvent(gameEvent: any) {
    if (gameEvent.event === 'round_start') {
      this.isMatchRunning = true;
      this.showGameScreen();
      this.inputHandler.activate(true);
      this.inputActive = true;
    } else if (gameEvent.event === 'game_end') {
      this.isMatchRunning = false;
      this.inputHandler.deactivate();
      this.inputActive = false;
      // 결과 UI 표시 등
    } else if (gameEvent.event === 'countdown') {
      // 카운트다운 UI 표시 (필요시 GameRenderer 활용)
      this.renderer.showCountdown(gameEvent.data?.remainingTime);
    }
    // 기타 이벤트 처리
  }

  private renderResult(data: any) {
    this.container.innerHTML = '';
    // 결과 화면 렌더링 (예: 우승자, 전체 대진표 등)
    // 예시: this.container.appendChild(...)
  }

  // ... 기타 연결/해제/유틸 메서드 ...
} 