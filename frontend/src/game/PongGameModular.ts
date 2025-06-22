import { Player, GameResult } from '../types/types.js';
import { GameConfig } from './GameConfig.js';
import { GameRenderer } from './GameRenderer.js';
import { InputHandler } from './InputHandler.js';
import { GameLogic } from './GameLogic.js';

/**
 * Modular Pong Game - Main Integration Module
 * 
 * 분리된 모듈들을 통합하여 원본 PongGame.ts와 동일한 API를 제공하는 클래스
 * 모든 기존 로직을 그대로 유지하면서 모듈식 아키텍처의 이점을 제공
 * 
 * @role 모듈 통합 및 외부 API 제공
 * @compatible_with PongGame.ts (Drop-in replacement 가능)
 * @modules GameConfig, InputHandler, GameRenderer, GameLogic
 */
export class PongGameModular {
  private config: GameConfig;
  private renderer: GameRenderer;
  private inputHandler: InputHandler;
  private gameLogic: GameLogic;
  
  // Game state
  private onGameEnd?: (winner: 'left' | 'right') => void;
  public gameMode: 'regular' | 'tournament' | 'demo' = 'demo';
  public isTournamentFinal: boolean = false;
  private gameStarted: boolean = false;
  private countdownTimer: number | null = null;
  private leftPlayer: Player | null = null;
  private rightPlayer: Player | null = null;
  private animationId: number = 0;
  private isMultiplayer: boolean = false;
  
  // Cache game element for performance
  private gameElement: HTMLElement | null = null;

  constructor(onGameEnd?: (winner: 'left' | 'right') => void) {
    this.config = new GameConfig();
    this.renderer = new GameRenderer(this.config);
    this.inputHandler = new InputHandler();
    this.gameLogic = new GameLogic(this.config);
    this.onGameEnd = onGameEnd;
  }

  // =================================================================
  // Public API - 원본 PongGame과 동일한 인터페이스
  // =================================================================

  public setPlayers(leftPlayer: Player, rightPlayer: Player): void {
    this.leftPlayer = leftPlayer;
    this.rightPlayer = rightPlayer;
    this.renderer.updatePlayerInfo(leftPlayer, rightPlayer);
    this.updateScore();
    this.updateRound();
  }

  public setGameMode(mode: 'regular' | 'tournament' | 'demo'): void {
    this.gameMode = mode;
    if (mode === 'demo') {
      this.setPlayers(
        { nickname: 'Player 1' },
        { nickname: 'Player 2' }
      );
    }
  }

  public setMultiplayerMode(enabled: boolean): void {
    this.isMultiplayer = enabled;
  }

  public render(): HTMLElement {
    const gameElement = this.renderer.render();
    this.gameElement = gameElement; // Cache for performance
    this.updateScore();
    this.updateRound();
    return gameElement;
  }

  public start(): void {
    this.resetGame();
    if (this.gameMode !== 'demo') {
      this.startCountdown();
    } else {
      this.startGame();
    }
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }
    this.gameStarted = false;
    this.inputHandler.deactivate();
    this.resetGameState();
  }

  public getGameResult(): GameResult {
    const roundWins = this.gameLogic.getRoundWins();
    const winner: 'left' | 'right' = roundWins.left > roundWins.right ? 'left' : 'right';
    
    return {
      winner,
      leftPlayer: {
        nickname: this.leftPlayer?.nickname || 'Player 1',
        score: roundWins.left,
        avatarUrl: this.leftPlayer?.avatarUrl
      },
      rightPlayer: {
        nickname: this.rightPlayer?.nickname || 'Player 2', 
        score: roundWins.right,
        avatarUrl: this.rightPlayer?.avatarUrl
      },
      totalRounds: roundWins.left + roundWins.right,
      gameMode: this.gameMode as 'regular' | 'tournament' | 'demo'
    };
  }

  // =================================================================
  // Private Methods - 원본 로직을 분리된 클래스들로 위임
  // =================================================================

  private startCountdown(): void {
    let count = 3;
    const currentRound = this.gameLogic.getCurrentRound();
    
    const updateCount = () => {
      if (count > 0) {
        this.renderer.showCountdown(count, currentRound);
        count--;
        this.countdownTimer = window.setTimeout(updateCount, 1000);
      } else {
        this.renderer.hideCountdown();
        this.startGame();
      }
    };
    
    updateCount();
  }

  private startGame(): void {
    this.gameStarted = true;
    this.inputHandler.activate();
    this.update();
  }

  private resetGame(): void {
    this.gameLogic.resetGame();
    this.gameStarted = false;
    this.updateDOMElements();
  }

  private resetRound(): void {
    this.gameLogic.resetRound();
    this.updateDOMElements();
    this.startCountdown();
  }

  private resetGameState(): void {
    this.gameLogic.resetGameState();
    this.updateScore();
    this.updateRound();
  }

  private handleRoundEnd(winner: 'left' | 'right'): void {
    const result = this.gameLogic.handleRoundEnd(winner);

    if (result.gameEnded && result.matchWinner) {
      // Match is over
      if (this.onGameEnd) {
        this.onGameEnd(result.matchWinner);
        this.stop();
      }
    } else {
      // Start next round
      this.updateScore();
      this.updateRound();
      this.resetRound();
    }
  }

  private update(): void {
    if (!this.gameStarted) return;
    
    // Use cached game element instead of calling renderer.render() every frame
    const rect = this.gameElement?.getBoundingClientRect();
    const canvasWidth = rect?.width || this.config.canvasWidth;
    const canvasHeight = rect?.height || this.config.canvasHeight;
    
    // Update ball position and check for goals
    const goalScorer = this.gameLogic.updateBallPosition(canvasWidth, canvasHeight);
    if (goalScorer) {
      if (this.gameMode !== 'demo') {
        this.handleRoundEnd(goalScorer);
        return;
      } else {
        this.resetGame();
      }
    }
    
    // Update paddle positions
    const inputs = this.inputHandler.getPlayerInputs(this.isMultiplayer);
    this.gameLogic.updatePaddlePositions(inputs.leftInput, inputs.rightInput, this.isMultiplayer);
    
    // Update DOM elements
    this.updateDOMElements();
    
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  private updateDOMElements(): void {
    const ballPos = this.gameLogic.getBallPosition();
    const paddlePos = this.gameLogic.getPaddlePositions();
    
    this.renderer.updateBallPosition(ballPos.x, ballPos.y);
    this.renderer.updatePaddlePositions(paddlePos.left, paddlePos.right);
  }

  private updateScore(): void {
    const roundWins = this.gameLogic.getRoundWins();
    this.renderer.updateScore(roundWins.left, roundWins.right);
  }

  private updateRound(): void {
    const currentRound = this.gameLogic.getCurrentRound();
    this.renderer.updateRound(currentRound);
  }
}
