import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { TournamentWebSocketService } from '../services/websocket/TournamentWebSocketService';
// 필요한 타입 import (예: TournamentBracket 등)

export class TournamentClient {
  private isMatchRunning = false;

  constructor(
    private container: HTMLElement,
    private wsService: TournamentWebSocketService,
    private renderer: GameRenderer,
    private inputHandler: InputHandler
  ) {}

  public start() {
    this.connect();
    this.setupWebSocketListeners();
    this.setupInputHandling();
  }

  private connect() {
    // 실제로는 tournamentId, playerId 등 인자를 받아야 함
    // this.wsService.connect(tournamentId, playerId);
  }

  private setupWebSocketListeners() {
    this.wsService.on('tournament_bracket', (data) => {
      this.isMatchRunning = false;
      this.inputHandler.deactivate();
      this.renderBracket(data.bracket);
    });

    this.wsService.on('game_state', (gameState) => {
      if (this.isMatchRunning) {
        this.renderer.update(gameState);
      }
    });

    this.wsService.on('game_event', (gameEvent) => {
      if (gameEvent.event === 'round_start') {
        this.isMatchRunning = true;
        this.showGameScreen();
        this.inputHandler.activate(true);
      }
      // 필요시 game_end 등 추가 처리
    });
  }

  private setupInputHandling() {
    this.inputHandler.on('input', (action, playerSide) => {
      if (this.isMatchRunning) {
        this.wsService.sendMessage({
          type: 'player_input',
          data: { action, playerSide }
        });
      }
    });
  }

  private renderBracket(bracket: any) {
    this.container.innerHTML = '';
    // 대진표 UI 렌더링 로직 (예: DOM 생성)
  }

  private showGameScreen() {
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.render());
  }

  // ... 기타 연결/해제/유틸 메서드 ...
} 