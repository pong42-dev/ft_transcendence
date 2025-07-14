import fastifyMultipart from '@fastify/multipart'
import fp from 'fastify-plugin'

export const autoConfig = {
	limits: {
		fieldNameSize: 1000, // Max field name size in bytes
		fieldSize: 1000, // Max field value size in bytes
		fields: 100, // Max number of non-file fields
		fileSize: 200 * 1024 * 1024, // Max file size in bytes (5 MB)
		files: 100, // Max number of file fields
		parts: 1000 // Max number of parts
	}
}

/**
 * This plugins allows to parse the multipart content-type
 *
 * @see {@link https://github.com/fastify/fastify-multipart}
 */
// export default fastifyMultipart
export default fp(async (fastify) => {
	fastify.register(fastifyMultipart, autoConfig)
})