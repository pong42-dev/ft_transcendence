import { GameSession } from './GameSession.js';
import { AIDifficulty } from '../schemas/AITypes.js';
import {
  GameMode,
  PlayerResponseDto,
  PlayerInputDto,
  GameStateDto,
  GameEventDto,
} from '../schemas/games.js';

// GameSession에서 사용할 콜백 타입을 명확히 정의합니다.
type GameStateUpdateCallback = (gameState: GameStateDto) => void;
type GameEventCallback = (gameEvent: GameEventDto) => void;
// import { randomUUID } from 'crypto'; // 더 이상 사용하지 않음

/**
 * GameManager
 * 모든 게임 세션의 생명주기를 관리하는 중앙 관리자입니다.
 * - 게임 세션 생성, 조회, 삭제
 * - 플레이어 입력 및 연결 상태 처리
 * - GameSession의 콜백을 받아 WebSocket 또는 DB 로직과 연동
 */
export class GameManager {
  private sessions = new Map<string, { session: GameSession; dbGameId: number }>();
  private static instance: GameManager;
  private webSocketHandler?: any; // GameWebSocketHandler (순환 참조 방지)
  private gameRepository?: any; // GameRepository (DI)

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public setWebSocketHandler(handler: any) {
    this.webSocketHandler = handler;
  }

  public setGameRepository(repository: any) {
    this.gameRepository = repository;
  }

  // =================================================================
  // Public API - Called by API Routes & WebSocket Handlers
  // =================================================================

  public async createGame(
    mode: GameMode, 
    players: PlayerResponseDto[],
    customCallbacks?: {onStateUpdate: GameStateUpdateCallback; onEvent: GameEventCallback},
    aiSettings?: { difficulty: AIDifficulty }
  ): Promise<string> {
    try {
      console.log(`[GameManager] Creating game - Mode: ${mode}, Players: ${players.length}`);
      
      // 1. DB에 게임 생성
      const dbGameId = await this.gameRepository?.createGameWithPlayers(
        mode, 
        players.map(p => p.id)
      );

      // 2. 게임 세션 생성 (DB ID를 문자열로 변환해서 gameId로 사용)
      const gameId = dbGameId.toString();

      // 3. customCallbacks가 있으면 그것을 사용하고, 없으면 기존의 webSocketHandler를 사용합니다.
      const onStateUpdate = customCallbacks ? customCallbacks.onStateUpdate : (gameState: GameStateDto) => {
        this.webSocketHandler?.broadcastGameState(gameId, gameState);
      };
      
      const onEvent = customCallbacks ? customCallbacks.onEvent : (gameEvent: GameEventDto) => {
        this.webSocketHandler?.broadcastGameEvent(gameId, gameEvent);
        if (gameEvent.event === 'game_end') {
          this._handleGameEnd(gameId, gameEvent.data?.winnerId);
        }
      };
      
      // 4. GameSession 인스턴스 생성
      const aiDifficulty = aiSettings?.difficulty || 'medium';
      
      const session = new GameSession(
        gameId,
        dbGameId,
        mode,
        this.gameRepository,
        onStateUpdate,
        onEvent,
        aiDifficulty
      );

      players.forEach((p) => {
        session.addPlayer(p);
      });
      
      this.sessions.set(gameId, { session, dbGameId });

      console.log(`[GameManager] Game created: ${gameId} (DB: ${dbGameId})`);
      return gameId;
    } catch (error) {
      console.error(`[GameManager] Failed to create game:`, error);
      throw error;
    }
  }

  public getSession(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId)?.session;
  }

  public getDbGameId(gameId: string): number | undefined {
    return this.sessions.get(gameId)?.dbGameId;
  }

  public removeGame(gameId: string) {
    const gameData = this.sessions.get(gameId);
    if (gameData) {
      gameData.session.stop('error');
      this.sessions.delete(gameId);
      console.log(`[GameManager] Game removed: ${gameId}`);
    }
  }

  public handlePlayerConnection(gameId: string, playerId: number) {
    const session = this.getSession(gameId);
    if (!session) return;

    console.log(`[GameManager] Player ${playerId} connected to game ${gameId}`);
    session.startCountdown();
  }

  public handlePlayerDisconnection(gameId: string, playerId: number) {
    const session = this.getSession(gameId);
    if (!session) return;

    session.removePlayer(playerId);

    // 세션에 남은 플레이어가 없으면 게임 제거
    if (session.getPlayers().length === 0) {
      this.removeGame(gameId);
    }
  }

  public handlePlayerInput(gameId: string, playerId: number, input: PlayerInputDto) {
    this.getSession(gameId)?.handlePlayerInput(playerId, input);
  }

  /**
   * WebSocket 연결 끊김으로 인한 게임 종료 처리
   */
  public async handleGameDisconnection(gameId: string) {
    const gameData = this.sessions.get(gameId);
    if (!gameData) {
      console.log(`[GameManager] Game ${gameId} not found for disconnect handling`);
      return;
    }

    console.log(`[GameManager] Handling disconnect for game ${gameId}`);
    
    try {
      // 게임 세션에서 모든 플레이어 제거 (이렇게 하면 removePlayer 로직이 실행됨)
      const players = gameData.session.getPlayers();
      for (const player of players) {
        gameData.session.removePlayer(player.id);
      }
      
      // 추가로 강제 종료도 실행
      await gameData.session.stop('player_left');
      
      console.log(`[GameManager] Game ${gameId} terminated due to disconnect`);
    } catch (error) {
      console.error(`[GameManager] Error handling disconnect for game ${gameId}:`, error);
    }
  }

  // =================================================================
  // Internal Logic
  // =================================================================

  private async _handleGameEnd(gameId: string, winnerId?: number) {
    console.log(`[GameManager] Game ended: ${gameId}${winnerId ? `, Winner: ${winnerId}` : ''}`);

    const gameData = this.sessions.get(gameId);
    if (!gameData) return;

    try {
      // DB에 게임 결과 저장
      if (winnerId) {
        await this.gameRepository?.setGameWinner(gameData.dbGameId, winnerId);
      }
      await this.gameRepository?.updateGameStatus(gameData.dbGameId, 'finished');

      // TODO: 플레이어별 최종 점수도 저장해야 함
      // const players = gameData.session.getPlayers();
      // for (const player of players) {
      //   await this.gameRepository?.updatePlayerScore(gameData.dbGameId, player.id, finalScore);
      // }

    } catch (error) {
      console.error(`[GameManager] Failed to save game result:`, error);
    }

    // 10분 후 게임 세션 정리 (status API에서 충분히 조회할 수 있도록)
    setTimeout(() => this.removeGame(gameId), 10 * 60 * 1000);
  }
}