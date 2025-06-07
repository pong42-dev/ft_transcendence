import fp from 'fastify-plugin'
import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
	interface FastifyInstance {
		passwordManager: ReturnType<typeof createPasswordManager>
	}
}

export function createPasswordManager() {
	const SCRYPT_KEYLEN = 32
	const SCRYPT_COST = 65536
	const SCRYPT_BLOCK_SIZE = 8
	const SCRYPT_PARALLELIZATION = 2
	const SCRYPT_MAXMEM = 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE * 2

	async function hashPassword(value: string): Promise<string> {
		if (!value) throw new Error('Password is required')
		const salt = randomBytes(Math.min(16, SCRYPT_KEYLEN / 2))
		return new Promise((resolve, reject) => {
			scrypt(value, salt, SCRYPT_KEYLEN, {
				cost: SCRYPT_COST,
				blockSize: SCRYPT_BLOCK_SIZE,
				parallelization: SCRYPT_PARALLELIZATION,
				maxmem: SCRYPT_MAXMEM,
			}, (err, key) => {
				if (err) 
					reject(err)
				else 
					resolve(`${salt.toString('hex')}.${key.toString('hex')}`)
			})
		})
	}

	async function comparePassword(value: string, hash: string): Promise<boolean> {
		const [salt, hashed] = hash.split('.')
		const saltBuffer = Buffer.from(salt, 'hex')
		const hashedBuffer = Buffer.from(hashed, 'hex')
		return new Promise((resolve) => {
			scrypt(value, saltBuffer, SCRYPT_KEYLEN, {
				cost: SCRYPT_COST,
				blockSize: SCRYPT_BLOCK_SIZE,
				parallelization: SCRYPT_PARALLELIZATION,
				maxmem: SCRYPT_MAXMEM,
			}, (err, key) => {
				if (err) 
					return resolve(false)
				resolve(timingSafeEqual(key, hashedBuffer))
			})
		})
	}

	return {
		hashPassword,
		comparePassword
	}
}

export default fp(
	async (fastify: FastifyInstance) => {
		const utils = createPasswordManager()
		fastify.decorate('passwordManager', utils)
	},
	{
		name: 'password-manager',
		dependencies: []
	}
)