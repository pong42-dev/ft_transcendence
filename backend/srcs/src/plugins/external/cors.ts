import fp from 'fastify-plugin'

/**
 * CORS 플러그인
 * 프론트엔드와 백엔드 간 통신을 위한 CORS 설정
 */
export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    
    // 허용할 origin 목록
    const allowedOrigins = [
      'http://localhost:5173', // Vite 개발 서버
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://localhost',
      'http://localhost:80'
    ]
    
    // 개발 환경에서는 모든 localhost 허용
    const isLocalhost = origin && (
      origin.startsWith('http://localhost') || 
      origin.startsWith('http://127.0.0.1')
    );
    
    // Origin이 허용 목록에 있거나 localhost면 허용
    if ((origin && allowedOrigins.indexOf(origin) !== -1) || isLocalhost) {
      reply.header('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
      // Origin이 없는 경우 (같은 도메인에서의 요청)
      reply.header('Access-Control-Allow-Origin', '*')
    }
    
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cookie, cookies')
    
    // OPTIONS 요청 처리 (preflight)
    if (request.method === 'OPTIONS') {
      reply.status(200).send()
      return
    }
  })
})
