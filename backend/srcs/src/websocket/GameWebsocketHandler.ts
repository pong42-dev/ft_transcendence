import { FastifyInstance, FastifyRequest } from 'fastify'
import { WebSocket } from 'ws'
import { GameManager } from '../game/GameManager.js'
import { 
  WSPlayerInputMessage, 
  WSGameStateMessage, 
  WSGameEndMessage, 
  WSErrorMessage
} from '../schemas/game-websocket.js'
import { PlayerInput } from '../schemas/games.js'

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
  }

  /**
   * Fastify WebSocket 라우트 등록
   */
  public registerRoutes(fastify: FastifyInstance): void {
    // WebSocket 연결: /ws/game/:gameId
    const self = this
    fastify.register(async function (fastifyInstance: FastifyInstance) {
      fastifyInstance.get('/ws/game/:gameId', { websocket: true }, (connection: any, request: FastifyRequest) => {
        self.handleConnection(connection.socket, request)
      })
    })
  }

  /**
   * WebSocket 연결 처리
   */
  private handleConnection(socket: WebSocket, request: FastifyRequest): void {
    const { gameId } = request.params as { gameId: string }
    
    // 게임 세션 존재 확인
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) {
      this.sendError(socket, 'Game not found', 'GAME_NOT_FOUND')
      socket.close()
      return
    }

    // 게임 룸에 클라이언트 추가
    this.addClientToRoom(gameId, socket)
    
    // 연결 성공 알림
    console.log(`Client connected to game ${gameId}`)
    
    // 현재 게임 상태 전송
    this.sendGameState(socket, gameSession.getGameState())

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

    const playerInput: PlayerInput = {
      ...message.data,
      timestamp: Date.now() // 서버 타임스탬프로 덮어쓰기
    }

    // GameSession에 입력 전달
    gameSession.handlePlayerInput(playerInput)
  }

  /**
   * 게임 상태 브로드캐스트
   */
  public broadcastGameState(gameId: string, gameState: any): void {
    const clients = this.gameRooms.get(gameId)
    if (!clients || clients.size === 0) return

    const message: WSGameStateMessage = {
      type: 'game_state',
      data: gameState
    }

    this.broadcast(gameId, message)
  }

  /**
   * 게임 종료 브로드캐스트
   */
  public broadcastGameEnd(gameId: string, gameResult: any): void {
    const message: WSGameEndMessage = {
      type: 'game_end',
      data: gameResult
    }

    this.broadcast(gameId, message)
    
    // 게임 종료 후 5초 뒤에 모든 연결 종료
    setTimeout(() => {
      this.closeGameRoom(gameId)
    }, 5000)
  }

  /**
   * 룸 관리 메서드들
   */
  private addClientToRoom(gameId: string, socket: WebSocket): void {
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set())
    }
    
    this.gameRooms.get(gameId)!.add(socket)
  }

  private removeClientFromRoom(gameId: string, socket: WebSocket): void {
    const room = this.gameRooms.get(gameId)
    if (room) {
      room.delete(socket)
      if (room.size === 0) {
        this.gameRooms.delete(gameId)
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
  }

  /**
   * 메시지 전송 유틸리티들
   */
  private broadcast(gameId: string, message: any): void {
    const clients = this.gameRooms.get(gameId)
    if (!clients) return

    const messageStr = JSON.stringify(message)
    
    clients.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr)
      }
    })
  }

  private sendGameState(socket: WebSocket, gameState: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      const message: WSGameStateMessage = {
        type: 'game_state',
        data: gameState
      }
      socket.send(JSON.stringify(message))
    }
  }

  private sendError(socket: WebSocket, message: string, code?: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      const errorMessage: WSErrorMessage = {
        type: 'error',
        data: { message, code }
      }
      socket.send(JSON.stringify(errorMessage))
    }
  }

  /**
   * 활성 연결 통계
   */
  public getStats(): { totalRooms: number; totalConnections: number } {
    let totalConnections = 0
    this.gameRooms.forEach(room => {
      totalConnections += room.size
    })

    return {
      totalRooms: this.gameRooms.size,
      totalConnections
    }
  }
}