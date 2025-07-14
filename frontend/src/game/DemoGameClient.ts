// frontend/src/game/DemoGameClient.ts

import { GameRenderer } from './GameRenderer.js';
import { InputHandler } from './InputHandler.js';

/**
 * Demo Game Client
 * 
 * 로그인 화면 등에서 사용할 데모 게임 클라이언트
 * 서버 연결 없이 로컬에서 AI 게임을 실행
 * develop 브랜치의 PongGameModular와 유사한 기능 제공
 */
export class DemoGameClient {
  private renderer: GameRenderer;
  private inputHandler: InputHandler;
  
  // Demo state
  private animationId: number = 0;
  private gameStarted: boolean = false;
  private gameElement: HTMLElement | null = null;

  constructor() {
    this.renderer = new GameRenderer();
    this.inputHandler = new InputHandler();
  }

  public render(): HTMLElement {
    this.gameElement = this.renderer.render();
    this.setupDemoPlayers();
    return this.gameElement;
  }

  public start(): void {
    this.resetGame();
    this.startGame();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.gameStarted = false;
    this.inputHandler.deactivate();
  }

  private setupDemoPlayers(): void {
    // 데모용 플레이어 설정
    this.renderer.updatePlayerInfoWithAvatar(
      { name: 'Player 1' },
      { name: 'Player 2' }
    );
    this.renderer.updateScore(0, 0);
    this.renderer.updateRound(1);
  }

  private resetGame(): void {
    this.gameStarted = false;
  }

  private startGame(): void {
    this.gameStarted = true;
    this.inputHandler.activate();
    this.update();
  }

  private update(): void {
    if (!this.gameStarted) return;
    
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

}
