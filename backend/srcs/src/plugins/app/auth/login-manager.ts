import fp from 'fastify-plugin'
import { FastifyReply } from 'fastify'

declare module 'fastify' {
	interface FastifyInstance {
		loginManager: {
			login(user_id: number, reply: FastifyReply, googleRefreshToken: string): Promise<void>
		}
	}
}

async function login(
	this: any,
	user_id: number,
	reply: FastifyReply,
	googleRefreshToken: string | ''
): Promise<void> {
	const { config } = this;
	const userData = { user_id: user_id }
	const isNotLoggedIn = await this.tokenManager.isNotLoggedIn(user_id)
	if (!isNotLoggedIn) {
		reply.status(409).send({
			msg: 'This account is already in use. Please log out and try again.'
		})
	} else {
		const refreshTokenCookie = await this.tokenManager.generateRefreshToken(userData)
		reply.setCookie(
			refreshTokenCookie.name,
			refreshTokenCookie.value,
			refreshTokenCookie.options
		)
		const hashedRefreshToken = await this.passwordManager.hashPassword(refreshTokenCookie.value)
		await this.userTokensRepository.insertRow(
			user_id,
			hashedRefreshToken,
			refreshTokenCookie.expiresAt,
			googleRefreshToken
		)
		await this.userProfilesRepository.updateRowByColumn('user_id', user_id, 'status', true)
		if (googleRefreshToken) {
			reply.redirect(config.CLIENT_ORIGIN);
			return ;
		}
		const accessToken = await this.tokenManager.generateAccessToken(userData)
		console.log("accessToken:", accessToken);
		reply.status(200).send({
			success: true,
			msg: 'Successfully logged in.',
			data: {
				accessToken: accessToken
			}
		})
	}
}

export default fp(async (fastify) => {
	fastify.decorate('loginManager', {
		login: login.bind(fastify)
	})
}, {
	name: 'login-manager',
	dependencies: ['token-manager', 'password-manager', 'user-tokens-repository', 'user-profiles-repository']
})
