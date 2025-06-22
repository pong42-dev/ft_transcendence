import { GameConfig } from './GameConfig.js';

/**
 * Game Logic Module
 * 
 * 게임 물리 엔진 및 핵심 로직을 담당하는 모듈
 * 원본 PongGame.ts의 공/패들 움직임, 충돌 감지, 점수 계산 로직을 분리
 * 
 * @role 게임 물리 및 핵심 로직
 * @extracted_from PongGame.ts (기존 로직 그대로 유지)
 */
export class GameLogic {
  private config: GameConfig;
  
  // Game state
  private ballX: number = 0;
  private ballY: number = 0;
  private ballSpeedX: number = 0;
  private ballSpeedY: number = 0;
  private leftPaddleY: number = 0;
  private rightPaddleY: number = 0;
  private currentRound: number = 1;
  private roundWins: { left: number; right: number } = { left: 0, right: 0 };
  
  // Dynamic canvas size (updated every frame like in original)
  private canvasWidth: number = 600;
  private canvasHeight: number = 400;

  constructor(config: GameConfig) {
    this.config = config;
    this.resetGame();
  }

  public resetGame(): void {
    this.ballX = this.config.canvasWidth / 2 - this.config.ballSize / 2;
    this.ballY = this.config.canvasHeight / 2 - this.config.ballSize / 2;
    this.ballSpeedX = this.config.ballSpeedX * (Math.random() > 0.5 ? 1 : -1);
    this.ballSpeedY = this.config.ballSpeedY * (Math.random() > 0.5 ? 1 : -1);
    this.leftPaddleY = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
    this.rightPaddleY = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
  }

  public resetRound(): void {
    this.ballX = this.config.canvasWidth / 2 - this.config.ballSize / 2;
    this.ballY = this.config.canvasHeight / 2 - this.config.ballSize / 2;
    this.ballSpeedX = this.config.ballSpeedX * (Math.random() > 0.5 ? 1 : -1);
    this.ballSpeedY = this.config.ballSpeedY * (Math.random() > 0.5 ? 1 : -1);
    this.leftPaddleY = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
    this.rightPaddleY = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
  }

  public updateBallPosition(canvasWidth: number, canvasHeight: number): 'left' | 'right' | null {
    // Update dynamic canvas size (like in original)
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.ballX += this.ballSpeedX;
    this.ballY += this.ballSpeedY;
    
    // Ball collision with top/bottom walls (use dynamic height)
    if (this.ballY <= 0 || this.ballY + this.config.ballSize >= this.canvasHeight) {
      this.ballSpeedY = -this.ballSpeedY;
    }
    
    // Check for goals (use dynamic width)
    if (this.ballX <= 0) {
      return 'right'; // Right player scores
    } else if (this.ballX + this.config.ballSize >= this.canvasWidth) {
      return 'left'; // Left player scores
    }
    
    // Ball collision with paddles
    this.checkPaddleCollision();
    
    return null; // No goal
  }

  private checkPaddleCollision(): void {
    // Left paddle collision - 원본과 동일한 하드코딩 방식
    if (
      this.ballX <= 40 + this.config.paddleWidth &&
      this.ballY + this.config.ballSize >= this.leftPaddleY &&
      this.ballY <= this.leftPaddleY + this.config.paddleHeight
    ) {
      this.ballSpeedX = Math.abs(this.ballSpeedX);
      this.ballSpeedY += (Math.random() * 2 - 1);
      this.ballX = 40 + this.config.paddleWidth;
    }
    
    // Right paddle collision - 원본과 동일하게 동적 캔버스 크기 사용
    const rightPaddleX = this.canvasWidth - 40 - this.config.paddleWidth;
    if (
      this.ballX + this.config.ballSize >= rightPaddleX &&
      this.ballY + this.config.ballSize >= this.rightPaddleY &&
      this.ballY <= this.rightPaddleY + this.config.paddleHeight
    ) {
      this.ballSpeedX = -Math.abs(this.ballSpeedX);
      this.ballSpeedY += (Math.random() * 2 - 1);
      this.ballX = rightPaddleX - this.config.ballSize;
    }
  }

  public updatePaddlePositions(
    leftInput: 'UP' | 'DOWN' | 'NONE',
    rightInput: 'UP' | 'DOWN' | 'NONE',
    isMultiplayer: boolean
  ): void {
    // Update right paddle (player input) - use dynamic canvas height
    if (rightInput === 'UP') {
      this.rightPaddleY = Math.max(0, this.rightPaddleY - this.config.paddleSpeed);
    }
    if (rightInput === 'DOWN') {
      this.rightPaddleY = Math.min(this.canvasHeight - this.config.paddleHeight, this.rightPaddleY + this.config.paddleSpeed);
    }

    if (isMultiplayer) {
      // Multiplayer: Update left paddle with player input - use dynamic canvas height
      if (leftInput === 'UP') {
        this.leftPaddleY = Math.max(0, this.leftPaddleY - this.config.paddleSpeed);
      }
      if (leftInput === 'DOWN') {
        this.leftPaddleY = Math.min(this.canvasHeight - this.config.paddleHeight, this.leftPaddleY + this.config.paddleSpeed);
      }
    } else {
      // AI mode: Update left paddle with AI logic
      this.updateAI();
    }
  }

  private updateAI(): void {
    const leftPaddleCenter = this.leftPaddleY + this.config.paddleHeight / 2;
    const targetY = this.ballY + this.config.ballSize / 2;

    if (this.ballSpeedX < 0) { // Ball moving towards AI paddle
      if (leftPaddleCenter < targetY - 10) {
        this.leftPaddleY += this.config.aiSpeed;
      } else if (leftPaddleCenter > targetY + 10) {
        this.leftPaddleY -= this.config.aiSpeed;
      }
    }

    // Use dynamic canvas height like original
    this.leftPaddleY = Math.max(0, Math.min(this.canvasHeight - this.config.paddleHeight, this.leftPaddleY));
  }

  public handleRoundEnd(winner: 'left' | 'right'): { gameEnded: boolean; matchWinner?: 'left' | 'right' } {
    if (winner === 'left') {
      this.roundWins.left++;
    } else {
      this.roundWins.right++;
    }

    if (this.roundWins.left >= 2 || this.roundWins.right >= 2) {
      // Match is over
      const matchWinner = this.roundWins.left > this.roundWins.right ? 'left' : 'right';
      return { gameEnded: true, matchWinner };
    } else {
      // Start next round
      this.currentRound++;
      return { gameEnded: false };
    }
  }

  // Getters
  public getBallPosition(): { x: number; y: number } {
    return { x: this.ballX, y: this.ballY };
  }

  public getPaddlePositions(): { left: number; right: number } {
    return { left: this.leftPaddleY, right: this.rightPaddleY };
  }

  public getRoundWins(): { left: number; right: number } {
    return { ...this.roundWins };
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public resetGameState(): void {
    this.currentRound = 1;
    this.roundWins = { left: 0, right: 0 };
  }
}
