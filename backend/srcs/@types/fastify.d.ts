import 'fastify'
import * as speakeasy from 'speakeasy'
import * as qrcode from 'qrcode'

declare module 'fastify' {
  interface FastifyInstance {
    speakeasy: typeof speakeasy
    qrcode: typeof qrcode
    uuid: () => string
  }
}
