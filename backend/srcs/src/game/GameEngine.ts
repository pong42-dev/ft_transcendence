import { GameConfig } from './GameConfig.js';
import { AIPlayer } from './AIPlayer.js';
import { GameState, AIDifficulty } from '../schemas/AITypes.js';

/**
 * Game Engine Module
 * 
 * 게임 물리 엔진 및 핵심 로직을 담당하는 모듈
 * 원본 PongGame.ts의 공/패들 움직임, 충돌 감지, 점수 계산 로직을 분리
 * 
 * @role 게임 물리 및 핵심 로직
 * @extracted_from PongGame.ts (기존 로직 그대로 유지)
 */
export class GameEngine {
  private config: GameConfig;
  private aiPlayer: AIPlayer;
  
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

  constructor(config: GameConfig, aiDifficulty: AIDifficulty = 'medium') {
    this.config = config;
    this.aiPlayer = new AIPlayer(aiDifficulty);
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
    leftInput: string,
    rightInput: string,
    isMultiplayer: boolean
  ): void {
    // 왼쪽 패들 처리 (AI 또는 사용자)
    if (leftInput === 'AI_CONTROLLED') {
      this.updateAI();
    } else {
      if (leftInput === 'UP') {
        this.leftPaddleY = Math.max(0, this.leftPaddleY - this.config.paddleSpeed);
      }
      if (leftInput === 'DOWN') {
        this.leftPaddleY = Math.min(this.canvasHeight - this.config.paddleHeight, this.leftPaddleY + this.config.paddleSpeed);
      }
    }
    // 오른쪽 패들 처리 (사용자)
    if (rightInput === 'UP') {
      this.rightPaddleY = Math.max(0, this.rightPaddleY - this.config.paddleSpeed);
    }
    if (rightInput === 'DOWN') {
      this.rightPaddleY = Math.min(this.canvasHeight - this.config.paddleHeight, this.rightPaddleY + this.config.paddleSpeed);
    }
    
  }

  private updateAI(): void {
    // 현재 게임 상태 생성 (점수 정보 포함)
    const scores = this.getRoundWins();
    const gameState: GameState = {
      ballX: this.ballX,
      ballY: this.ballY,
      ballSpeedX: this.ballSpeedX,
      ballSpeedY: this.ballSpeedY,
      paddleY: this.leftPaddleY,
      opponentPaddleY: this.rightPaddleY,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      paddleHeight: this.config.paddleHeight,
      paddleWidth: this.config.paddleWidth,
      ballSize: this.config.ballSize,
      aiScore: scores.left,        // AI는 왼쪽 패들
      playerScore: scores.right    // 플레이어는 오른쪽 패들
    };

    // AI 결정 생성
    const decision = this.aiPlayer.update(gameState, Date.now());
    
    // 패들 위치 업데이트
    this.leftPaddleY = this.aiPlayer.calculatePaddleMovement(
      this.leftPaddleY,
      decision,
      this.config.paddleHeight,
      this.canvasHeight,
      this.config.paddleSpeed
    );
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

  // AI 관련 메서드들
  public updateAISettings(difficulty: AIDifficulty): void {
    this.aiPlayer.updateConfig(difficulty);
  }

  public getAIDebugInfo() {
    return this.aiPlayer.getDebugInfo();
  }
}
