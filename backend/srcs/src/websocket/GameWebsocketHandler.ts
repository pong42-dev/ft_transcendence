import { FastifyRequest } from 'fastify'
import { WebSocket } from 'ws'
import { GameManager } from '../game/GameManager.js'
import { 
  WSPlayerInputMessage, 
  WSPlayerReadyMessage,
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
  private playerSockets: Map<string, Map<number, WebSocket>> = new Map() // gameId -> playerId -> socket
  
  constructor() {
    this.gameManager = GameManager.getInstance()
    // GameManager에 WebSocket 핸들러 등록
    this.gameManager.setWebSocketHandler(this)
  }

  /**
   * WebSocket 연결 처리 (Fastify 라우터에서 직접 호출)
   */
  public handleConnection(socket: WebSocket, request: FastifyRequest): void {
    const { gameId } = request.params as { gameId: string }
    const query = request.query as { playerId?: string }
    const playerId = parseInt(query.playerId || '0') // URL 쿼리에서 playerId 가져오기
    
    console.log(`[WebSocket] Connection attempt - gameId: ${gameId}, playerId: ${playerId}`)
    
    // 게임 세션 존재 확인
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) {
      console.log(`[WebSocket] Game not found: ${gameId}`)
      this.sendError(socket, 'Game not found', 'GAME_NOT_FOUND')
      socket.close()
      return
    }

    // playerId 유효성 확인
    if (!playerId || isNaN(playerId)) {
      console.log(`[WebSocket] Invalid playerId: ${query.playerId}`)
      this.sendError(socket, 'Invalid player ID', 'INVALID_PLAYER_ID')
      socket.close()
      return
    }

    // 플레이어 유효성 확인
    const players = gameSession.getPlayers()
    const player = players.find(p => p.id === playerId)
    if (!player) {
      console.log(`[WebSocket] Player ${playerId} not found in game ${gameId}`)
      this.sendError(socket, 'Player not found in this game', 'PLAYER_NOT_FOUND')
      socket.close()
      return
    }

    // 게임 룸에 클라이언트 추가
    this.addClientToRoom(gameId, playerId, socket)
    
    // 연결 성공 알림
    console.log(`[WebSocket] Player ${playerId} connected to game ${gameId}`)

    // GameManager에 플레이어 연결 알림
    this.gameManager.handlePlayerConnection(gameId, playerId)

    // 메시지 처리
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(gameId, playerId, socket, message)
      } catch (error) {
        this.sendError(socket, 'Invalid message format', 'INVALID_MESSAGE')
      }
    })

    // 연결 종료 처리
    socket.on('close', () => {
      this.removeClientFromRoom(gameId, playerId, socket)
      this.gameManager.handlePlayerDisconnection(gameId, playerId)
      console.log(`Player ${playerId} disconnected from game ${gameId}`)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId} in game ${gameId}:`, error)
      this.removeClientFromRoom(gameId, playerId, socket)
      this.gameManager.handlePlayerDisconnection(gameId, playerId)
    })
  }

  /**
   * 메시지 처리
   */
  private handleMessage(gameId: string, playerId: number, socket: WebSocket, message: any): void {
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) {
      this.sendError(socket, 'Game session not found', 'SESSION_NOT_FOUND')
      return
    }

    switch (message.type) {
      case 'player_input':
        this.handlePlayerInput(gameId, playerId, message as WSPlayerInputMessage)
        break
      
      case 'player_ready':
        this.handlePlayerReady(gameId, playerId, message as WSPlayerReadyMessage)
        break
      
      default:
        this.sendError(socket, 'Unknown message type', 'UNKNOWN_MESSAGE_TYPE')
    }
  }

  /**
   * 플레이어 입력 처리
   */
  private handlePlayerInput(gameId: string, connectedPlayerId: number, message: WSPlayerInputMessage): void {
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) return

    const targetPlayerId = message.data.playerId; // 메시지에서 실제 조작할 플레이어 ID
    const playerInput: PlayerInputDto = message.data.input

    // 로컬 게임의 경우: 한 연결에서 모든 플레이어 조작 가능
    // 다른 게임의 경우: 자신의 플레이어만 조작 가능
    const gameMode = gameSession.getMode();
    if (gameMode === 'local_1v1') {
      // 로컬 게임: 어떤 플레이어든 조작 가능
      this.gameManager.handlePlayerInput(gameId, targetPlayerId, playerInput);
    } else {
      // AI/온라인 게임: 연결된 플레이어만 조작 가능
      if (targetPlayerId === connectedPlayerId) {
        this.gameManager.handlePlayerInput(gameId, targetPlayerId, playerInput);
      } else {
        // 연결된 플레이어가 아닌 다른 플레이어 조작 시도
        console.log(`[WebSocket] Player ${connectedPlayerId} tried to control player ${targetPlayerId} in ${gameMode} mode`);
      }
    }
  }

  /**
   * 플레이어 준비 상태 처리
   */
  private handlePlayerReady(gameId: string, playerId: number, message: WSPlayerReadyMessage): void {
    const gameSession = this.gameManager.getSession(gameId)
    if (!gameSession) return

    // GameManager에 플레이어 준비 상태 전달
    this.gameManager.handlePlayerConnection(gameId, playerId)
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
  private addClientToRoom(gameId: string, playerId: number, socket: WebSocket): void {
    // 게임 룸에 소켓 추가
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set())
    }
    this.gameRooms.get(gameId)!.add(socket)

    // 플레이어별 소켓 매핑 추가
    if (!this.playerSockets.has(gameId)) {
      this.playerSockets.set(gameId, new Map())
    }
    this.playerSockets.get(gameId)!.set(playerId, socket)
  }

  private removeClientFromRoom(gameId: string, playerId: number, socket: WebSocket): void {
    // 게임 룸에서 소켓 제거
    const room = this.gameRooms.get(gameId)
    if (room) {
      room.delete(socket)
      if (room.size === 0) {
        this.gameRooms.delete(gameId)
      }
    }

    // 플레이어별 소켓 매핑 제거
    const playerRoom = this.playerSockets.get(gameId)
    if (playerRoom) {
      playerRoom.delete(playerId)
      if (playerRoom.size === 0) {
        this.playerSockets.delete(gameId)
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
    this.playerSockets.delete(gameId)
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

  // private sendToPlayer(gameId: string, playerId: number, message: any): void {
  //   const playerSocket = this.playerSockets.get(gameId)?.get(playerId)
  //   if (playerSocket && playerSocket.readyState === WebSocket.OPEN) {
  //     playerSocket.send(JSON.stringify(message))
  //   }
  // }

  // private sendConnectionStatus(socket: WebSocket, status: 'connected' | 'disconnected' | 'reconnected', gameId: string, playerId?: number): void {
  //   if (socket && socket.readyState === WebSocket.OPEN) {
  //     const message: WSConnectionStatusMessage = {
  //       type: 'connection_status',
  //       data: { status, gameId, playerId }
  //     }
  //     socket.send(JSON.stringify(message))
  //   } else {
  //     console.log(`[WebSocket] Cannot send connection status - socket not ready: ${status}`)
  //   }
  // }

  private sendError(socket: WebSocket, message: string, code?: string): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const errorMessage: WSErrorMessage = {
        type: 'error',
        data: { message, code }
      }
      socket.send(JSON.stringify(errorMessage))
    } else {
      console.log(`[WebSocket] Cannot send error message - socket not ready: ${message}`)
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
