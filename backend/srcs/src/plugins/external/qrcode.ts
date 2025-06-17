import fp from 'fastify-plugin'
import qrcode from 'qrcode'

export default fp(async function (fastify, _opts) {
  fastify.decorate('qrcode', qrcode)
})
