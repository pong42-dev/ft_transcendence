import { FastifyInstance, FastifyRequest } from 'fastify'
import { WebSocket } from 'ws'
import { GameManager } from '../game/GameManager.js'
import { 
  WSPlayerInputMessage, 
  WSGameStateMessage, 
  WSGameEventMessage, 
  WSErrorMessage
} from '../schemas/game-websocket.js'
import { PlayerInputDto, GameStateDto, GameEventDto } from '../schemas/games.js'

/**
 * GameWebSocketHandler
 * 
 * 게임용 WebSocket 연결 및 메시지 처리
 * - 게임 세션별 룸 관리
 * - 실시간 플레이어 입력 처리
 * - 게임 상태 브로드캐스트
 */
export class GameWebSocketHandler {
  private gameManager: GameManager
  private gameRooms: Map<string, Set<WebSocket>> = new Map()

  constructor() {
    this.gameManager = GameManager.getInstance()
    // GameManager에 WebSocket 핸들러 등록
    this.gameManager.setWebSocketHandler(this)
  }

  /**
   * Fastify WebSocket 라우트 등록
   */
  public registerRoutes(fastify: FastifyInstance): void {
    // WebSocket 연결: /ws/game/:gameId
    fastify.get('/ws/game/:gameId', { websocket: true }, (connection, request) => {
      // connection 객체에서 실제 WebSocket 인스턴스는 .socket 속성에 있습니다.
      this.handleConnection(connection.socket, request)
    })
  }

  /**
   * WebSocket 연결 처리
   */
  public handleConnection(socket: WebSocket, request: FastifyRequest): void {
    const { gameId } = request.params as { gameId: string }
    
    console.log(`[WebSocket] Connection attempt - gameId: ${gameId}`)
    
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) {
      console.log(`[WebSocket] Game not found: ${gameId}`)
      this.sendError(socket, 'Game not found', 'GAME_NOT_FOUND')
      socket.close()
      return
    }

    // 게임 룸에 클라이언트 추가
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set())
    }
    this.gameRooms.get(gameId)!.add(socket)
    
    console.log(`[WebSocket] Client connected to game ${gameId}`)

    // GameManager에 연결 알림 (플레이어 특정 없이)
    // 필요 시 GameManager에 handleGameConnection(gameId) 같은 메서드 구현 가능
    // 현재는 모든 플레이어가 연결되었다고 가정하고 게임 시작 로직을 트리거할 수 있음
    gameSession.getPlayers().forEach(p => {
      this.gameManager.handlePlayerConnection(gameId, p.id)
    })

    // 메시지 처리
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(gameId, socket, message)
      } catch (error) {
        this.sendError(socket, 'Invalid message format', 'INVALID_MESSAGE')
      }
    })

    // 연결 종료 처리
    socket.on('close', () => {
      this.removeClientFromRoom(gameId, socket)
      console.log(`Client disconnected from game ${gameId}`)
      // 게임 disconnect 처리 - 즉시 게임 종료
      this.gameManager.handleGameDisconnection(gameId)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error in game ${gameId}:`, error)
      this.removeClientFromRoom(gameId, socket)
    })
  }

  /**
   * 메시지 처리
   */
  private handleMessage(gameId: string, socket: WebSocket, message: any): void {
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) {
      this.sendError(socket, 'Game session not found', 'SESSION_NOT_FOUND')
      return
    }

    switch (message.type) {
      case 'player_input':
        if (!isPlayerInputMessageValid(message)) {
          this.sendError(socket, 'Invalid player_input data structure', 'INVALID_PAYLOAD')
          return
        }
        this.handlePlayerInput(gameId, message as WSPlayerInputMessage)
        break
      
      default:
        this.sendError(socket, 'Unknown message type', 'UNKNOWN_MESSAGE_TYPE')
    }
  }

  /**
   * 플레이어 입력 처리
   */
  private handlePlayerInput(gameId: string, message: WSPlayerInputMessage): void {
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) return

    const targetPlayerId = message.data.playerId; // 메시지에서 실제 조작할 플레이어 ID
    const playerInput: PlayerInputDto = message.data.input

    // 로컬 게임이므로, 메시지에 포함된 playerId를 그대로 사용하여 입력 처리
    this.gameManager.handlePlayerInput(gameId, targetPlayerId, playerInput);
  }

  /**
   * 게임 상태 브로드캐스트 (GameManager에서 호출)
   */
  public broadcastGameState(gameId: string, gameState: GameStateDto): void {
    const clients = this.gameRooms.get(gameId)
    if (!clients || clients.size === 0) return

    const message: WSGameStateMessage = {
      type: 'game_state',
      data: gameState
    }

    this.broadcast(gameId, message)
  }

  /**
   * 게임 이벤트 브로드캐스트 (GameManager에서 호출)
   */
  public broadcastGameEvent(gameId: string, gameEvent: GameEventDto): void {
    const message: WSGameEventMessage = {
      type: 'game_event',
      data: gameEvent
    }

    this.broadcast(gameId, message)
    
    // 게임 종료 이벤트인 경우 5초 후에 연결 정리
    if (gameEvent.event === 'game_end') {
      setTimeout(() => {
        this.closeGameRoom(gameId)
      }, 5000)
    }
  }

  /**
   * 룸 관리 메서드들
   */
  private removeClientFromRoom(gameId: string, socket: WebSocket): void {
    const room = this.gameRooms.get(gameId)
    if (room) {
      room.delete(socket)
      if (room.size === 0) {
        this.gameRooms.delete(gameId)
        console.log(`[WebSocket] Game room ${gameId} is now empty and has been removed.`)
      }
    }
  }

  private closeGameRoom(gameId: string): void {
    const room = this.gameRooms.get(gameId)
    if (room) {
      room.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
      })
      this.gameRooms.delete(gameId)
    }
    console.log(`[WebSocket] Closed game room ${gameId}`)
  }

  private broadcast(gameId: string, message: any): void {
    const clients = this.gameRooms.get(gameId)
    if (clients) {
      const data = JSON.stringify(message)
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data)
        }
      })
    }
  }

  private sendError(socket: WebSocket, message: string, code: string): void {
    const error: WSErrorMessage = {
      type: 'error',
      data: {
        code,
        message
      }
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(error))
    }
  }
}

function isPlayerInputMessageValid(message: any): boolean {
  // 1. 최상위 객체와 type 필드 검사
  if (!message || typeof message !== 'object' || message.type !== 'player_input') {
    return false;
  }

  // 2. data 필드 검사
  const data = message.data;
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 3. playerId 필드 검사
  if (typeof data.playerId !== 'number' || data.playerId < 0) {
    return false;
  }

  // 4. input 필드 검사
  const input = data.input;
  if (!input || typeof input !== 'object') {
    return false;
  }

  // 5. input.direction 필드 검사
  const { action } = input;

  // 5-1. action 키가 존재하고, 문자열인지 먼저 확인
  if (typeof action !== 'string') {
    return false;
  }
  
  // 5-2. 값을 소문자로 변환하여 비교
  const lowercasedAction = action.toLowerCase();
  if (lowercasedAction !== 'up' && lowercasedAction !== 'down' && lowercasedAction !== 'none') {
    return false;
  }


  // 모든 검사를 통과하면 유효한 메시지
  return true;
}
