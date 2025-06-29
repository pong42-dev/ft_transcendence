import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { GameWebSocketHandler } from '../../websocket/GameWebsocketHandler.js'

export default fp(async function (fastify: FastifyInstance) {
  // WebSocket 플러그인은 이미 등록되어 있음 (websocket.ts에서)
  
  // GameWebSocketHandler 초기화 및 라우트 등록
  const gameWsHandler = new GameWebSocketHandler()
  gameWsHandler.registerRoutes(fastify)
  
  // 서버 인스턴스에 핸들러 등록 (필요시 다른 곳에서 접근 가능)
  fastify.decorate('gameWebSocketHandler', gameWsHandler)
  
  fastify.log.info('Game WebSocket plugin registered')
}, {
  name: 'game-websocket',
  dependencies: ['websocket']
})
