import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { GameWebSocketHandler } from '../../websocket/GameWebsocketHandler.js'
import { GameManager } from '../../game/GameManager.js'

/**
 * Game WebSocket Plugin
 * 
 * 게임용 WebSocket 연결을 처리하는 플러그인
 * - /ws/game/:gameId 엔드포인트 등록
 * - GameManager와 WebSocket 핸들러 연동
 */
export default fp(async (fastify: FastifyInstance) => {
  // GameWebSocketHandler 인스턴스 생성
  const gameWebSocketHandler = new GameWebSocketHandler()
  
  // GameManager에 WebSocket 핸들러 등록
  const gameManager = GameManager.getInstance()
  gameManager.setWebSocketHandler(gameWebSocketHandler)
  
  // WebSocket 라우트 등록
  gameWebSocketHandler.registerRoutes(fastify)
  
  // Fastify 인스턴스에 핸들러 등록 (필요시 다른 곳에서 접근 가능)
  fastify.decorate('gameWebSocketHandler', gameWebSocketHandler)
  
  console.log('✅ Game WebSocket plugin registered')
}, {
  name: 'game-websocket',
  dependencies: ['websocket'] // @fastify/websocket 플러그인에 의존
})
