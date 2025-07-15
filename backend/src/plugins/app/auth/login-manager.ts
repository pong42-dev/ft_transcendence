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
	const userData = { user_id: user_id };
	const isNotLoggedIn = await this.tokenManager.isNotLoggedIn(user_id);
	if (!isNotLoggedIn) {
		if (googleRefreshToken) {
			const errorParams = new URLSearchParams({
				error: 'account_in_use',
				message: 'This account is already in use. Please log out and try again.'
			});
			reply.redirect(`${config.BASE_URL}?${errorParams.toString()}`);
			return;
		}
		reply.status(409).send({
			msg: 'This account is already in use. Please log out and try again.'
		})
	} else {
		const refreshTokenCookie = await this.tokenManager.generateRefreshToken(userData);
		const expiresAtISO = new Date(refreshTokenCookie.expiresAt).toISOString();
		this.log.info(`Generated refresh token for user ${user_id}: ${refreshTokenCookie.value}`);
		this.log.info(`Refresh token expires at: ${expiresAtISO}`);
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
		console.log("refreshToken:", refreshTokenCookie.value);
		console.log("hashed refreshToken:", hashedRefreshToken);
		await this.userProfilesRepository.updateRowByColumn('user_id', user_id, 'status', true)
		if (googleRefreshToken) {
			reply.redirect(config.BASE_URL);
			return ;
		}
		const accessToken = await this.tokenManager.generateAccessToken(userData)
		this.log.info(`Generated access token for user ${user_id}: ${accessToken}`);
		reply.send({
			success: true,
			msg: 'Successfully logged in.',
			data: {
				token: accessToken
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
