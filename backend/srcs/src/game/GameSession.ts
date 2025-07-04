import { GameEngine } from './GameEngine.js';
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
  private loop: NodeJS.Timeout | null = null;
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
  ) {
    this.id = id;
    this.gameId = gameId;
    this._mode = mode;
    this.gameRepository = gameRepository;
    this.onGameStateUpdate = onStateUpdate;
    this.onGameEvent = onEvent;

    this.config = new GameConfig();
    this.engine = new GameEngine(this.config);
    
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
    this.players.delete(playerId);
    this.playerInputs.delete(playerId);
    // 플레이어가 나가면 게임 중단
    if (this.status === 'playing' || this.status === 'countdown') {
      this.stop('player_left');
    }
  }

  public handlePlayerInput(playerId: number, input: PlayerInputDto) {
    if (this.status !== 'playing' || !this.playerInputs.has(playerId)) return;
    this.playerInputs.set(playerId, input.action);
  }

  public async stop(reason: 'normal' | 'player_left' | 'error') {
    console.log(`[GameSession] stop called with reason: ${reason}, gameId: ${this.gameId}, current status: ${this.status}`);
    
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = null;
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
    if (this.status !== 'waiting') return;
    let remainingTime = 5;
    this.status = 'countdown';
    this.loop = setInterval(() => {
      this.onGameEvent({ event: 'countdown', data: { remainingTime } });
      remainingTime--;
      if (remainingTime < 0) {
        clearInterval(this.loop!);
        this._startGameLoop();
      }
    }, 1000);
  }

  // =================================================================
  // Internal Game Flow
  // =================================================================

  private async _startGameLoop() {
    this.status = 'playing';
    // this._startTime = Date.now(); // 나중에 필요시 사용
    // DB에 게임 시작 상태 업데이트
    await this.gameRepository.updateGameStatus(this.gameId, 'playing');
    this.onGameEvent({ event: 'round_start' });

    this.loop = setInterval(() => {
      this._updateGame();
    }, this.config.gameLoopInterval);
  }

  private _updateGame() {
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

  private async _handleRoundEnd(winnerSide: 'left' | 'right') {
    const players = Array.from(this.players.values());
    if (players.length < 2) return;

    const winner = winnerSide === 'left' ? players[0] : players[1];
    this.onGameEvent({ event: 'round_end', data: { winnerId: winner.id } });

    // GameEngine의 handleRoundEnd는 게임 종료 여부와 승자 정보를 반환
    const result = this.engine.handleRoundEnd(winnerSide);

    // 현재 점수를 DB에 업데이트
    const scores = this.engine.getRoundWins();
    const leftPlayer = players[0];
    const rightPlayer = players[1];
    
    await this.gameRepository.updatePlayerScore(this.gameId, leftPlayer.id, scores.left);
    await this.gameRepository.updatePlayerScore(this.gameId, rightPlayer.id, scores.right);

    if (result.gameEnded && result.matchWinner) {
      const matchWinnerPlayer =
        result.matchWinner === 'left' ? players[0] : players[1];
      
      // DB에 게임 승자 설정
      await this.gameRepository.setGameWinner(this.gameId, matchWinnerPlayer.id);
      
      // 마지막 라운드 종료 이벤트를 먼저 보내서 클라이언트가 점수를 업데이트하도록 함
      this.onGameEvent({
        event: 'round_end',
        data: {},
      });
      
      // 최종 점수가 반영된 게임 상태를 바로 보냄
      this.onGameEvent({
        event: 'game_state',
        data: this._createGameStateDto(),
      });
      
      // 그 다음에 'game_end' 이벤트를 보냄
      this.onGameEvent({
        event: 'game_end',
        data: { 
          winnerId: matchWinnerPlayer.id,
          finalScores: {
            player1: scores.left,
            player2: scores.right
          }
        },
      });
      // 그 다음에 게임 루프를 중지시킵니다.
      await this.stop('normal');
    } else {
      // 다음 라운드 준비
      this.engine.resetRound();
    }
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