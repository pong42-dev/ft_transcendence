import { GameEngine } from './GameEngine.js';
import { AIDifficulty } from '../schemas/AITypes.js';
import {
  PlayerResponseDto,
  GameStateDto,
  GameEventDto,
  PlayerInputDto,
  GameMode,
  GameStatus,
} from '../schemas/games.js';
import { GameConfig } from './GameConfig.js';
import { createGameRepository } from '../plugins/app/game/game-repository.js';

// GameSession 내부에서 사용할 콜백 타입 정의
type GameStateUpdateCallback = (dto: GameStateDto) => void;
type GameEventCallback = (dto: GameEventDto) => void;
type GameRepositoryType = ReturnType<typeof createGameRepository>;

/**
 * GameSession
 * 개별 게임 세션을 관리하고, 게임 로직(GameEngine)과 외부(GameManager)를 연결합니다.
 * - 게임의 생명주기(waiting, countdown, playing 등)를 관리합니다.
 * - 백엔드 주도 카운트다운을 실행합니다.
 * - GameEngine의 상태를 DTO로 변환하여 콜백으로 전달합니다.
 */
export class GameSession {
  private engine: GameEngine;
  private config: GameConfig;
  private gameRepository: GameRepositoryType;

  // Session Info
  public readonly id: string;
  public readonly gameId: number; // DB의 games 테이블 ID
  private players = new Map<number, PlayerResponseDto>();
  private playerInputs = new Map<number, 'UP' | 'DOWN' | 'NONE'>();

  // State
  private status: GameStatus = 'waiting';
  private _mode: GameMode = 'local_1v1';
  private loop: ReturnType<typeof setInterval> | null = null;
  private intermissionTimer: ReturnType<typeof setTimeout> | null = null;
  // private _startTime: number = 0; // 나중에 필요시 사용

  // Callbacks
  private onGameStateUpdate: GameStateUpdateCallback;
  private onGameEvent: GameEventCallback;

  constructor(
    id: string,
    gameId: number,
    mode: GameMode,
    gameRepository: GameRepositoryType,
    onStateUpdate: GameStateUpdateCallback,
    onEvent: GameEventCallback,
    aiDifficulty: AIDifficulty = 'medium'
  ) {
    this.id = id;
    this.gameId = gameId;
    this._mode = mode;
    this.gameRepository = gameRepository;
    this.onGameStateUpdate = onStateUpdate;
    this.onGameEvent = onEvent;

    this.config = new GameConfig();
    
    // AI 모드인 경우 AI 설정을 전달
    if (mode === 'ai_1v1') {
      this.engine = new GameEngine(this.config, aiDifficulty);
    } else {
      this.engine = new GameEngine(this.config);
    }
    
    console.log(`[GameSession] Created session ${id} with mode ${mode}`);
  }

  // =================================================================
  // Public API - Called by GameManager
  // =================================================================

  public addPlayer(player: PlayerResponseDto) {
    if (this.players.size >= 2) return;
    this.players.set(player.id, player);
    this.playerInputs.set(player.id, 'NONE');
    }

  public removePlayer(playerId: number) {
    console.log(`[GameSession] Removing player ${playerId} from game ${this.id}, current status: ${this.status}`);
    
    this.players.delete(playerId);
    this.playerInputs.delete(playerId);
    
    // 플레이어가 나가면 게임 중단 (대기 상태 포함)
    if (this.status === 'playing' || this.status === 'countdown' || this.status === 'waiting') {
      console.log(`[GameSession] Player left, stopping game ${this.id}`);
      this.stop('player_left');
    }
    
    // 플레이어가 모두 나갔다면 확실히 종료
    if (this.players.size === 0) {
      console.log(`[GameSession] No players left, force stopping game ${this.id}`);
      this.stop('player_left');
    }
  }

  public handlePlayerInput(playerId: number, input: PlayerInputDto) {
    if (this.status !== 'playing' || !this.playerInputs.has(playerId)) return;
    this.playerInputs.set(playerId, input.action);
  }

  public async stop(reason: 'normal' | 'player_left' | 'error') {
    console.log(`[GameSession] stop called with reason: ${reason}, gameId: ${this.gameId}, current status: ${this.status}`);
    
    // 모든 타이머 정리
    if (this.loop) {
      clearInterval(this.loop);
      clearTimeout(this.loop); // setTimeout도 고려
      this.loop = null;
    }
    if (this.intermissionTimer) {
      clearTimeout(this.intermissionTimer);
      this.intermissionTimer = null;
    }
    
    // 'waiting' 상태에서도 취소 가능하도록 조건 확장
    if (this.status === 'playing' || this.status === 'countdown' || this.status === 'waiting') {
      if (reason === 'normal') {
        this.status = 'finished';
        // DB에 게임 상태 업데이트
        console.log(`[GameSession] Updating DB status to 'finished' for gameId: ${this.gameId}`);
        await this.gameRepository.updateGameStatus(this.gameId, 'finished');
        // 정상 종료 시에는 'game_canceled' 이벤트를 보내지 않음
      } else {
        this.status = 'canceled';
        // DB에 게임 상태 업데이트
        console.log(`[GameSession] Updating DB status to 'canceled' for gameId: ${this.gameId}`);
        await this.gameRepository.updateGameStatus(this.gameId, 'canceled');
        // 비정상 종료 시에만 'game_canceled' 이벤트를 보냄
        this.onGameEvent({ event: 'game_canceled' });
      }
    }
  }

  public startCountdown() {
    // if (this.status !== 'waiting') return;
    let remainingTime = 5;
    this.status = 'countdown';
    
    const countdown = () => {
      if (!this.isActive()) return;
      
      this.onGameEvent({ event: 'countdown', data: { remainingTime } });
      remainingTime--;
      
      if (remainingTime < 0) {
        // 카운트다운 완료 후 게임 시작
        this._startGameLoop();
      } else {
        // 다음 카운트다운을 1초 후에 실행
        this.loop = setTimeout(countdown, 1000);
      }
    };
    
    // 첫 카운트다운 즉시 시작
    countdown();
  }

  // =================================================================
  // Internal Game Flow
  // =================================================================

  private async _startGameLoop() {
    console.log(`[GameSession] _startGameLoop called, current status: ${this.status}`);
    if (!this.isActive()) return;
    
    this.status = 'playing';
    // this._startTime = Date.now(); // 나중에 필요시 사용
    // DB에 게임 시작 상태 업데이트
    await this.gameRepository.updateGameStatus(this.gameId, 'playing');
    
    console.log(`[GameSession] Starting first round intermission`);
    // 첫 라운드도 인터미션을 거친 후 시작
    this._startRoundIntermission();
  }

  /**
   * [신규] 실제 게임 물리 로직(공 움직임)을 실행하는 루프입니다.
   */
  private _startGamePhysicsLoop() {
    if (!this.isActive()) return;
    
    // 이전 루프가 있다면 정리
    if (this.loop) {
      clearInterval(this.loop);
      clearTimeout(this.loop);
    }
    
    this.engine.resetRound(); // 라운드 시작 전 상태 초기화
    this.loop = setInterval(() => {
      this._updateGame();
    }, this.config.gameLoopInterval);
  }

  private _updateGame() {
    if (!this.isActive()) return;
    
    const players = Array.from(this.players.values());
    // players 배열이 비어있거나 1명일 경우의 엣지 케이스 처리
    if (players.length < 2) {
        this.stop('error'); // 혹은 다른 적절한 처리
        return;
    }

    let leftPlayerInput, rightPlayerInput;
    
    if (this._mode === 'ai_1v1') {
      // AI 게임: 사용자는 왼쪽 패들, AI는 오른쪽 패들
      const userPlayer = players.find(p => p.type === 'user');
      // const aiPlayer = players.find(p => p.type === 'ai');
      
      leftPlayerInput = 'AI_CONTROLLED';
      rightPlayerInput = userPlayer ? (this.playerInputs.get(userPlayer.id) || 'NONE') : 'NONE';
    } else {
      // 로컬 게임: 플레이어 순서대로
      leftPlayerInput = this.playerInputs.get(players[0].id) || 'NONE';
      rightPlayerInput = this.playerInputs.get(players[1].id) || 'NONE';
    }

    // 엔진 업데이트 (GameEngine의 실제 메서드 호출)
    // 1. 패들 위치 업데이트
    // TODO: isMultiplayer 로직을 mode에 따라 결정하도록 수정 필요
    this.engine.updatePaddlePositions(leftPlayerInput, rightPlayerInput, true);

    // 2. 공 위치 업데이트 및 득점자 확인
    const goalScorer = this.engine.updateBallPosition(
      this.config.canvasWidth,
      this.config.canvasHeight,
    );

    // 3. 득점 발생 시 라운드 종료 처리
    if (goalScorer) {
      this._handleRoundEnd(goalScorer);
      return; // 라운드가 끝났으므로 아래 로직은 실행하지 않음
    }

    // 상태 DTO 생성 및 전파
    const gameStateDto = this._createGameStateDto();
    this.onGameStateUpdate(gameStateDto);
  }

// GameSession.ts - _handleRoundEnd (수정 후)

  private async _handleRoundEnd(winnerSide: 'left' | 'right') {
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = null;
    }
    const players = Array.from(this.players.values());
    if (players.length < 2) return;

    const winner = winnerSide === 'left' ? players[0] : players[1];
    
    // 1. 엔진의 라운드 종료 처리 및 점수 업데이트를 먼저 수행합니다.
    const result = this.engine.handleRoundEnd(winnerSide);

    // 2. 업데이트된 최종 점수를 가져옵니다.
    const finalScores = this.engine.getRoundWins();

    // 3. DB에 최종 점수를 업데이트합니다.
    await this.gameRepository.updatePlayerScore(this.gameId, players[0].id, finalScores.left);
    await this.gameRepository.updatePlayerScore(this.gameId, players[1].id, finalScores.right);

    // 4. 라운드 종료 이벤트를 전송합니다.
    this.onGameEvent({ event: 'round_end', data: { winnerId: winner.id } });

    // 4.5. 업데이트된 점수를 즉시 클라이언트에 전송합니다.
    const updatedGameState = this._createGameStateDto();
    this.onGameStateUpdate(updatedGameState);

    // 5. 게임이 완전히 종료되었는지 확인합니다.
    if (result.gameEnded && result.matchWinner) {
      const matchWinnerPlayer = result.matchWinner === 'left' ? players[0] : players[1];
      await this.gameRepository.setGameWinner(this.gameId, matchWinnerPlayer.id);
      
      const finalGameState = this._createGameStateDto();
      this.onGameStateUpdate(finalGameState);
      
      this.onGameEvent({
        event: 'game_end',
        data: { 
          winnerId: matchWinnerPlayer.id,
          finalScores: { // ✅ 이제 여기에 최종 점수가 정확히 담깁니다.
            player1: finalScores.left,
            player2: finalScores.right
          }
        },
      });

      await this.stop('normal');
    } else {
        // ✅ 게임이 끝나지 않았다면, 다음 라운드를 위해 인터미션을 시작합니다.
        this._startRoundIntermission();
    }
  }

  /**
   * [신규] 3초간의 라운드 인터미션을 시작하고 카운트다운 이벤트를 전송합니다.
   * 라운드 종료 후 다음 라운드 시작 전에만 사용됩니다.
   */
  private _startRoundIntermission() {
    let remainingTime = 3;
    const scores = this.engine.getRoundWins();
    const currentRound = scores.left + scores.right + 1;
    
    console.log(`[GameSession] Starting round intermission for round ${currentRound}, scores: ${scores.left}-${scores.right}`);

    const countdown = () => {
      if (this.status !== 'playing') {
        console.log(`[GameSession] Intermission stopped due to status change: ${this.status}`);
        return; // 게임이 중단되면 타이머도 멈춤
      }

      console.log(`[GameSession] Intermission countdown: ${remainingTime}, round: ${currentRound}`);
      
      this.onGameEvent({
        event: 'intermission_countdown',
        data: { remainingTime, round: currentRound }
      });

      remainingTime--;

      if (remainingTime < 0) {
        // 카운트다운이 끝나면 다음 라운드 시작
        console.log(`[GameSession] Intermission complete, starting round ${currentRound}`);
        this.onGameEvent({ event: 'round_start' });
        this._startGamePhysicsLoop();
      } else {
        this.intermissionTimer = setTimeout(countdown, 1000);
      }
    };
    
    countdown(); // 인터미션 시작
  }

  // =================================================================
  // DTO Creation
  // =================================================================

  private _createGameStateDto(): GameStateDto {
    // GameEngine의 개별 getter를 사용하여 상태 DTO 생성
    const ballPos = this.engine.getBallPosition();
    const paddlePos = this.engine.getPaddlePositions();
    const scores = this.engine.getRoundWins();

    return {
      ball: { x: ballPos.x, y: ballPos.y },
      paddles: {
        player1: { y: paddlePos.left },
        player2: { y: paddlePos.right },
      },
      scores: {
        player1: scores.left,
        player2: scores.right,
      },
      settings: {
        canvasWidth: this.config.canvasWidth,
        canvasHeight: this.config.canvasHeight,
        paddleWidth: this.config.paddleWidth,
        paddleHeight: this.config.paddleHeight,
        ballSize: this.config.ballSize,
        paddleOffset: this.config.paddleOffset,
      }
    };
  }

  // =================================================================
  // Getters
  // =================================================================

  public isActive(): boolean {
    return this.status !== 'canceled' && this.status !== 'finished';
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayers(): PlayerResponseDto[] {
    return Array.from(this.players.values());
  }

  public getMode(): GameMode {
    return this._mode;
  }

  public getGameMode(): GameMode {
    return this._mode;
  }
}