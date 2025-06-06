import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
	interface FastifyInstance {
		loginManager: {
			login(user: { id: number }, request: FastifyRequest, reply: FastifyReply, googleRefreshToken: string): Promise<void>
		}
	}
}

async function login(
	this: any,
	user: { id: number },
	request: FastifyRequest,
	reply: FastifyReply,
	googleRefreshToken: string | ''
): Promise<void> {
	// console.log("login userid:", user.id);
	const { config } = this;
	const userData = { user_id: user.id }
	const isNotLoggedIn = await this.tokenManager.isNotLoggedIn(user.id)
	// this.log.debug(`isNotLoggedIn: ${isNotLoggedIn}`)
	if (!isNotLoggedIn) {
		reply.status(401).send({
			success: false,
			msg: '해당 계정은 이미 사용 중입니다. 로그아웃 후 다시 시도해 주세요.'
		})
	} else {
		const accessTokenCookie = await this.tokenManager.generateAccessToken(userData)
		const refreshTokenCookie = await this.tokenManager.generateRefreshToken(userData)
		reply.setCookie(
			refreshTokenCookie.name,
			refreshTokenCookie.value,
			refreshTokenCookie.options
		)
		reply.setCookie(
			accessTokenCookie.name,
			accessTokenCookie.value,
			accessTokenCookie.options
		)
		const hashedRefreshToken = await this.passwordManager.hashPassword(refreshTokenCookie.value)
		await this.userTokensRepository.insertRow(
			user.id,
			hashedRefreshToken,
			refreshTokenCookie.expiresAt,
			googleRefreshToken
		)
		await this.userProfilesRepository.updateRowByColumn('user_id', user.id, 'status', true)
		if (googleRefreshToken) {
			reply.redirect(config.CLIENT_ORIGIN);
			return ;
		}
		reply.redirect(this.config.CLIENT_ORIGIN);
		// reply.send({
		// 	success: true,
		// 	msg: '로그인에 성공했습니다.',
		// 	accessToken: accessTokenCookie.value 
		// })
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
