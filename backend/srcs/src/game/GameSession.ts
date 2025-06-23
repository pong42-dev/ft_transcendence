import { GameConfig } from './GameConfig.js';
import { GameEngine } from './GameEngine.js';

/**
 * GameSession - Server-side Game Session Management
 * 
 * PongGameModular.ts를 서버 환경에 맞게 변경한 클래스
 * - 개별 게임 세션을 관리
 * - 60fps 게임 루프 실행
 * - WebSocket을 통한 실시간 상태 브로드캐스트
 * 
 * @role 서버사이드 게임 세션 관리
 * @based_on PongGameModular.ts
 */

// 임시 타입 정의 (나중에 schemas/games.ts에서 import)
interface Player {
  id: string;
  type: 'user' | 'guest';
  user_id?: number;
  guest_name?: string;
  name: string;
}

interface GameState {
  game_id: string;
  ball: { x: number; y: number };
  paddles: { left: { y: number }; right: { y: number } };
  score: { left: number; right: number };
  round: number;
  status: 'playing' | 'round_end' | 'game_end';
  timestamp: number;
}

interface PlayerInput {
  player_id: string;
  action: 'UP' | 'DOWN' | 'NONE';
  timestamp: number;
}

export class GameSession {
  private config: GameConfig;
  private gameEngine: GameEngine;
  
  // Game session info
  private gameId: string;
  private players: Map<string, Player> = new Map();
  private playerInputs: Map<string, 'UP' | 'DOWN' | 'NONE'> = new Map();
  
  // Game state
  private gameStarted: boolean = false;
  private gameMode: 'regular' | 'tournament' | 'demo' = 'regular';
  private isMultiplayer: boolean = true;
  
  // Dynamic canvas size (like frontend)
  private canvasWidth: number;
  private canvasHeight: number;
  
  // Game loop
  private gameLoop: any = null;
  private readonly FPS = 60;
  private readonly FRAME_TIME = 1000 / this.FPS;
  
  // Callbacks
  private onGameStateUpdate?: (gameState: GameState) => void;
  private onGameEnd?: (winner: 'left' | 'right', gameResult: any) => void;

  constructor(
    gameId: string, 
    canvasWidth?: number,
    canvasHeight?: number,
    onGameStateUpdate?: (gameState: GameState) => void,
    onGameEnd?: (winner: 'left' | 'right', gameResult: any) => void
  ) {
    this.gameId = gameId;
    this.config = new GameConfig();
    this.gameEngine = new GameEngine(this.config);
    
    // 동적 캔버스 크기 설정 (Frontend와 동일)
    this.canvasWidth = canvasWidth || this.config.canvasWidth;
    this.canvasHeight = canvasHeight || this.config.canvasHeight;
    
    this.onGameStateUpdate = onGameStateUpdate;
    this.onGameEnd = onGameEnd;
  }

  // =================================================================
  // Public API - 게임 세션 관리
  // =================================================================

  public addPlayer(player: Player): boolean {
    if (this.players.size >= 2) {
      return false; // 이미 2명의 플레이어가 있음
    }
    
    this.players.set(player.id, player);
    this.playerInputs.set(player.id, 'NONE');
    
    // 2명이 모이면 게임 시작 준비
    if (this.players.size === 2) {
      this.prepareGame();
    }
    
    return true;
  }

  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.playerInputs.delete(playerId);
    
    // 플레이어가 나가면 게임 중단
    if (this.gameStarted) {
      this.stop();
    }
  }

  public handlePlayerInput(input: PlayerInput): void {
    if (!this.players.has(input.player_id)) {
      return; // 해당 플레이어가 게임에 없음
    }
    
    this.playerInputs.set(input.player_id, input.action);
  }

  public start(): void {
    // Frontend와 동일하게 에러 체크 제거 (주석으로 남김)
    // if (this.players.size !== 2) {
    //   throw new Error('게임을 시작하려면 2명의 플레이어가 필요합니다');
    // }
    
    this.resetGame();
    this.startGame();
  }

  public stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.gameStarted = false;
  }

  // 캔버스 크기 동적 업데이트 (Frontend와 동일)
  public updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public getGameState(): GameState {
    const ballPos = this.gameEngine.getBallPosition();
    const paddlePos = this.gameEngine.getPaddlePositions();
    const roundWins = this.gameEngine.getRoundWins();
    const currentRound = this.gameEngine.getCurrentRound();
    
    return {
      game_id: this.gameId,
      ball: { x: ballPos.x, y: ballPos.y },
      paddles: { 
        left: { y: paddlePos.left }, 
        right: { y: paddlePos.right } 
      },
      score: { left: roundWins.left, right: roundWins.right },
      round: currentRound,
      status: this.gameStarted ? 'playing' : 'game_end',
      timestamp: Date.now()
    };
  }

  public getGameResult() {
    const roundWins = this.gameEngine.getRoundWins();
    const winner: 'left' | 'right' = roundWins.left > roundWins.right ? 'left' : 'right';
    const playersArray = Array.from(this.players.values());
    
    return {
      winner,
      leftPlayer: {
        ...playersArray[0],
        score: roundWins.left
      },
      rightPlayer: {
        ...playersArray[1],
        score: roundWins.right
      },
      totalRounds: roundWins.left + roundWins.right,
      gameMode: this.gameMode
    };
  }

  // =================================================================
  // Private Methods - 게임 로직 처리
  // =================================================================

  private prepareGame(): void {
    // 2명의 플레이어가 모였을 때 호출
    const playersArray = Array.from(this.players.values());
    
    // 멀티플레이어 모드 설정
    this.isMultiplayer = true;
    
    console.log(`Game ${this.gameId} ready with players:`, playersArray.map(p => p.name));
  }

  private startGame(): void {
    this.gameStarted = true;
    
    // 60fps 게임 루프 시작
    this.gameLoop = setInterval(() => {
      this.updateGame();
      this.broadcastGameState();
    }, this.FRAME_TIME);
    
    console.log(`Game ${this.gameId} started`);
  }

  private resetGame(): void {
    this.gameEngine.resetGame();
    this.gameStarted = false;
    
    // 플레이어 입력 초기화
    for (const playerId of this.players.keys()) {
      this.playerInputs.set(playerId, 'NONE');
    }
  }

  private updateGame(): void {
    if (!this.gameStarted) return;
    
    // 플레이어 입력 가져오기
    const playersArray = Array.from(this.players.keys());
    const leftInput = this.playerInputs.get(playersArray[0]) || 'NONE';
    const rightInput = this.playerInputs.get(playersArray[1]) || 'NONE';
    
    // 동적 캔버스 크기 사용 (Frontend와 동일)
    const goalScorer = this.gameEngine.updateBallPosition(
      this.canvasWidth, 
      this.canvasHeight
    );
    
    if (goalScorer) {
      this.handleRoundEnd(goalScorer);
      return;
    }
    
    // 패들 위치 업데이트
    this.gameEngine.updatePaddlePositions(leftInput, rightInput, this.isMultiplayer);
  }

  private handleRoundEnd(winner: 'left' | 'right'): void {
    const result = this.gameEngine.handleRoundEnd(winner);

    if (result.gameEnded && result.matchWinner) {
      // 게임 종료
      this.stop();
      if (this.onGameEnd) {
        this.onGameEnd(result.matchWinner, this.getGameResult());
      }
    } else {
      // 다음 라운드 시작
      this.resetRound();
    }
  }

  private resetRound(): void {
    this.gameEngine.resetRound();
    
    // 잠시 멈춤 후 다시 시작 (카운트다운 대신)
    setTimeout(() => {
      if (this.gameStarted) {
        console.log(`Game ${this.gameId} - Round ${this.gameEngine.getCurrentRound()} started`);
      }
    }, 1000);
  }

  private broadcastGameState(): void {
    if (this.onGameStateUpdate) {
      const gameState = this.getGameState();
      this.onGameStateUpdate(gameState);
    }
  }

  // =================================================================
  // Getters
  // =================================================================

  public getGameId(): string {
    return this.gameId;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public isGameStarted(): boolean {
    return this.gameStarted;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getCanvasSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }
}