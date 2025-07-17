import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply } from 'fastify'
import { TokenData } from '../../../schemas/users/refresh-token.js';

declare module 'fastify' {
	interface FastifyInstance {
		loginManager: {
			login(user_id: number, reply: FastifyReply, googleRefreshToken: string): Promise<void>
		}
	}
}

async function login(
	fasitfy: FastifyInstance,
	user_id: number,
	reply: FastifyReply,
	googleRefreshToken: string | ''
): Promise<void> {
	const { config, log, 
		tokenManager, 
		userTokensRepository, 
		generateUUID } = fasitfy;
		
	const isNotLoggedIn = await tokenManager.isNotLoggedIn(user_id);
	if (!isNotLoggedIn) {
		await userTokensRepository.deleteRowByColumnValue("user_id", user_id);
	} 
	const tokenVersion = generateUUID();
	const tokenData = { user_id: user_id, token_version: tokenVersion};
	// 	if (googleRefreshToken) {
	// 		const errorParams = new URLSearchParams({
	// 			error: 'account_in_use',
	// 			message: 'This account is already in use. Please log out and try again.'
	// 		});
	// 		reply.redirect(`${config.BASE_URL}?${errorParams.toString()}`);
	// 		return;
	// 	}
	// 	reply.status(409).send({
	// 		msg: 'This account is already in use. Please log out and try again.'
	// 	})
	const refreshTokenCookie = await fasitfy.tokenManager.generateRefreshToken(tokenData);
	const expiresAtISO = new Date(refreshTokenCookie.expiresAt).toISOString();
	log.info(`Generated refresh token for user ${user_id}: ${refreshTokenCookie.value}`);
	log.info(`Refresh token expires at: ${expiresAtISO}`);
	reply.setCookie(
		refreshTokenCookie.name,
		refreshTokenCookie.value,
		refreshTokenCookie.options
	)
	const hashedRefreshToken = await fasitfy.passwordManager.hashPassword(refreshTokenCookie.value)
	await fasitfy.userTokensRepository.insertRow(
		user_id,
		tokenVersion,
		hashedRefreshToken,
		refreshTokenCookie.expiresAt,
		googleRefreshToken
	)
	console.log("refreshToken:", refreshTokenCookie.value);
	console.log("hashed refreshToken:", hashedRefreshToken);
	await fasitfy.userProfilesRepository.updateRowByColumn('user_id', user_id, 'status', true)
	const loginMessage = isNotLoggedIn 
		? 'Successfully logged in.' 
		: 'Successfully logged in. Your previous session has been terminated.';
	fasitfy.log.debug(`isNotLoggedIn: ${isNotLoggedIn}`);
	fasitfy.log.info(`${loginMessage}`);

	if (googleRefreshToken) {
		
		// 리다이렉트 URL에 메시지를 쿼리 파라미터로 추가
		const redirectUrl = new URL(config.BASE_URL);
		redirectUrl.searchParams.set('message', encodeURIComponent(loginMessage)); // 메시지 인코딩
		reply.redirect(redirectUrl.toString());
		return ;
	}
	const accessToken = await fasitfy.tokenManager.generateAccessToken(tokenData)
	fasitfy.log.info(`Generated access token for user ${user_id}: ${accessToken}`);
	reply.send({
		success: true,
		msg: loginMessage,
		data: {
			token: accessToken
		}
	})
}

export default fp(async (fastify) => {
	fastify.decorate('loginManager', {
		login: login.bind(fastify)
	})
}, {
	name: 'login-manager',
	dependencies: ['token-manager', 'password-manager', 'user-tokens-repository', 'user-profiles-repository']
})
