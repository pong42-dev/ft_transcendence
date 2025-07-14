import fp from 'fastify-plugin'
import websocketPlugin from '@fastify/websocket'

export default fp(async (fastify) => {
  fastify.register(websocketPlugin)
}, {
  name: 'websocket'
})
