import { GameSession } from './GameSession.js';
import { Player, GameMode, GameStatus } from '../schemas/games.js';

/**
 * GameManager
 * 
 * 게임 세션들의 생명주기를 관리하는 중앙 관리자
 * 메모리 기반으로 게임 세션들을 저장하고 관리
 * 
 * @responsibilities
 * - 게임 세션 생성/삭제/조회
 * - 게임 ID 관리
 * - 토너먼트 시스템 연동 인터페이스 제공
 * - WebSocket 브로드캐스트 연동
 */
export class GameManager {
  private sessions: { [key: string]: GameSession } = {};
  private gameIdCounter: number = 1;
  private static instance: GameManager;
  private webSocketHandler?: any; // GameWebSocketHandler 타입 (순환 참조 방지)

  constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * WebSocket 핸들러 등록
   */
  public setWebSocketHandler(handler: any): void {
    this.webSocketHandler = handler;
  }

  /**
   * 새로운 게임 세션 생성
   * @param player1 첫 번째 플레이어
   * @param player2 두 번째 플레이어 (선택적)
   * @param gameMode 게임 모드
   * @returns 생성된 게임 ID
   */
  public createGame(player1: Player, player2?: Player, gameMode: GameMode = '1v1'): string {
    const gameId = this.generateGameId();
    
    // GameSession 생성 (생성자 시그니처에 맞게)
    const session = new GameSession(
      gameId,
      800, // canvasWidth
      600, // canvasHeight
      (gameState) => {
        // 게임 상태 업데이트 콜백
        this.handleGameStateUpdate(gameId, gameState);
      },
      (winner, gameResult) => {
        // 게임 종료 콜백
        this.handleGameEnd(gameId, winner, gameResult);
      }
    );
    
    // 게임 모드 설정
    session.setGameMode(gameMode);
    
    // 플레이어 추가
    session.addPlayer(player1);
    if (player2) {
      session.addPlayer(player2);
    }
    
    this.sessions[gameId] = session;
    console.log(`Game created: ${gameId}, Mode: ${gameMode}, Players: ${player1.name}${player2 ? ` vs ${player2.name}` : ' (waiting for player 2)'}`);
    
    return gameId;
  }

  /**
   * 게임 세션 조회
   * @param gameId 게임 ID
   * @returns GameSession 또는 null
   */
  public getSession(gameId: string): GameSession | null {
    return this.sessions[gameId] || null;
  }

  /**
   * 게임 세션 삭제
   * @param gameId 게임 ID
   * @returns 삭제 성공 여부
   */
  public removeGame(gameId: string): boolean {
    if (this.sessions[gameId]) {
      delete this.sessions[gameId];
      console.log(`Game removed: ${gameId}`);
      return true;
    }
    return false;
  }

  /**
   * 활성 게임 세션 목록 조회
   */
  public getActiveSessions(): Array<{id: string, playerCount: number}> {
    const result: Array<{id: string, playerCount: number}> = [];
    
    for (const gameId in this.sessions) {
      const session = this.sessions[gameId];
      result.push({
        id: gameId,
        playerCount: session.getPlayerCount()
      });
    }
    
    return result;
  }

  /**
   * 게임 시작
   * @param gameId 게임 ID
   * @returns 시작 성공 여부
   */
  public startGame(gameId: string): boolean {
    const session = this.sessions[gameId];
    if (session && session.getPlayerCount() === 2) {
      session.start();
      console.log(`Game started: ${gameId}`);
      return true;
    }
    return false;
  }

  /**
   * 게임 통계 조회
   */
  public getStats(): {
    totalSessions: number;
  } {
    const sessionCount = Object.keys(this.sessions).length;
    return {
      totalSessions: sessionCount
    };
  }

  /**
   * 게임 ID 생성
   * @returns 고유한 게임 ID
   */
  private generateGameId(): string {
    return `game_${this.gameIdCounter++}_${Date.now()}`;
  }

  /**
   * 게임 상태 업데이트 처리
   * @param gameId 게임 ID
   * @param gameState 게임 상태
   */
  private handleGameStateUpdate(gameId: string, gameState: any): void {
    // WebSocket을 통해 클라이언트들에게 게임 상태 브로드캐스트
    if (this.webSocketHandler) {
      this.webSocketHandler.broadcastGameState(gameId, gameState);
    }
    
    // 로깅
    console.log(`Game state updated: ${gameId}`);
  }

  /**
   * 게임 종료 처리
   * @param gameId 게임 ID
   * @param winner 승자
   * @param gameResult 게임 결과
   */
  private handleGameEnd(gameId: string, winner: string, gameResult: any): void {
    console.log(`Game ended: ${gameId}, Winner: ${winner}`, gameResult);
    
    // WebSocket을 통해 게임 종료 브로드캐스트
    if (this.webSocketHandler) {
      this.webSocketHandler.broadcastGameEnd(gameId, gameResult);
    }
    
    // 게임 결과 저장 로직 (추후 구현)
    // 토너먼트 시스템에 결과 전달 (추후 구현)
    
    // 일정 시간 후 게임 세션 정리
    setTimeout(() => {
      this.removeGame(gameId);
    }, 30000); // 30초 후 정리
  }

  // === 토너먼트 연동 인터페이스 ===
  
  /**
   * 토너먼트용 매치 생성
   * @param player1 플레이어 1
   * @param player2 플레이어 2
   * @returns 게임 ID
   */
  public createTournamentMatch(player1: Player, player2: Player): string {
    return this.createGame(player1, player2, 'tournament');
  }

  /**
   * 매치 시작
   * @param gameId 게임 ID
   * @returns 시작 성공 여부
   */
  public startMatch(gameId: string): boolean {
    return this.startGame(gameId);
  }

  /**
   * 게임 종료 이벤트 구독 (토너먼트에서 사용)
   * @param gameId 게임 ID
   * @param callback 콜백 함수
   */
  public onMatchEnd(gameId: string, callback: (result: any) => void): void {
    const session = this.sessions[gameId];
    if (session) {
      // GameSession에 이벤트 리스너 등록 로직 추가 필요
      // 현재는 기본 구조만 제공
      console.log(`Match end listener registered for game: ${gameId}`);
    }
  }

  /**
   * 게임 취소
   * @param gameId 게임 ID
   * @param reason 취소 이유
   * @param playerId 취소한 플레이어 ID (선택적)
   * @returns 취소 성공 여부
   */
  public cancelGame(gameId: string, reason: 'user_exit' | 'page_unload' | 'network_error', playerId?: string): boolean {
    const session = this.sessions[gameId];
    if (!session) {
      return false;
    }

    // 게임 중단
    session.stop();
    
    console.log(`Game cancelled: ${gameId}, Reason: ${reason}${playerId ? `, Player: ${playerId}` : ''}`);
    
    // 취소된 게임은 즉시 정리하지 않고 잠시 보관 (재연결 가능성)
    if (reason === 'network_error') {
      setTimeout(() => {
        this.removeGame(gameId);
      }, 60000); // 1분 후 정리
    } else {
      // 다른 이유로 취소된 경우 즉시 정리
      this.removeGame(gameId);
    }
    
    return true;
  }

  /**
   * 플레이어가 게임에 참여하고 있는지 확인
   * @param playerId 플레이어 ID
   * @returns 참여 중인 게임 ID 배열
   */
  public getPlayerGames(playerId: string): string[] {
    const gameIds: string[] = [];
    
    for (const gameId in this.sessions) {
      const session = this.sessions[gameId];
      if (session.hasPlayer(playerId)) {
        gameIds.push(gameId);
      }
    }
    
    return gameIds;
  }

  /**
   * 게임 상태 정보 조회
   * @param gameId 게임 ID
   * @returns 게임 상태 정보 또는 null
   */
  public getGameInfo(gameId: string): { 
    id: string; 
    status: GameStatus; 
    mode: GameMode; 
    playerCount: number; 
    players: Player[];
    isStarted: boolean;
    duration: number;
  } | null {
    const session = this.sessions[gameId];
    if (!session) {
      return null;
    }

    return {
      id: gameId,
      status: session.getGameStatus(),
      mode: session.getGameMode(),
      playerCount: session.getPlayerCount(),
      players: session.getPlayers(),
      isStarted: session.isGameStarted(),
      duration: session.getGameDuration()
    };
  }
}