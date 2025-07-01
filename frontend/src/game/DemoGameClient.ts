// frontend/src/game/DemoGameClient.ts

import { GameRenderer } from './GameRenderer';
import { InputHandler } from './InputHandler';
import { GameLogic } from './GameLogic';
import { GameConfig } from './GameConfig';

/**
 * Demo Game Client
 * 
 * 로그인 화면 등에서 사용할 데모 게임 클라이언트
 * 서버 연결 없이 로컬에서 AI 게임을 실행
 * develop 브랜치의 PongGameModular와 유사한 기능 제공
 */
export class DemoGameClient {
  private config: GameConfig;
  private renderer: GameRenderer;
  private inputHandler: InputHandler;
  private gameLogic: GameLogic;
  
  // Demo state
  private animationId: number = 0;
  private gameStarted: boolean = false;
  private gameElement: HTMLElement | null = null;

  constructor() {
    this.config = new GameConfig();
    this.renderer = new GameRenderer();
    this.inputHandler = new InputHandler();
    this.gameLogic = new GameLogic(this.config);
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
    this.gameLogic.resetGame();
    this.gameStarted = false;
    this.updateDOMElements();
  }

  private startGame(): void {
    this.gameStarted = true;
    this.inputHandler.activate();
    this.update();
  }

  private update(): void {
    if (!this.gameStarted) return;
    
    // 캔버스 크기 가져오기
    const rect = this.gameElement?.getBoundingClientRect();
    const canvasWidth = rect?.width || this.config.canvasWidth;
    const canvasHeight = rect?.height || this.config.canvasHeight;
    
    // 공 위치 업데이트 및 골 체크
    const goalScorer = this.gameLogic.updateBallPosition(canvasWidth, canvasHeight);
    if (goalScorer) {
      // 데모에서는 바로 리셋 (점수 카운트 안함)
      this.resetGame();
      return;
    }
    
    // 패들 위치 업데이트 (데모에서는 AI만 사용, 사용자 입력 무시)
    this.gameLogic.updatePaddlePositions('NONE', 'NONE', false);
    
    // DOM 요소 업데이트
    this.updateDOMElements();
    
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  private updateDOMElements(): void {
    const ballPos = this.gameLogic.getBallPosition();
    const paddlePos = this.gameLogic.getPaddlePositions();
    
    // GameRenderer의 update 메서드와 호환되도록 가짜 상태 생성
    const demoState = {
      ball: { x: ballPos.x, y: ballPos.y },
      paddles: {
        player1: { y: paddlePos.left },
        player2: { y: paddlePos.right }
      },
      scores: { player1: 0, player2: 0 },
      settings: {
        canvasWidth: this.config.canvasWidth,
        canvasHeight: this.config.canvasHeight,
        paddleWidth: this.config.paddleWidth,
        paddleHeight: this.config.paddleHeight,
        ballSize: this.config.ballSize,
        paddleOffset: this.config.paddleOffset
      }
    };
    
    this.renderer.update(demoState);
  }
}
