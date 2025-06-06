import { FastifyRequest, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { GoogleCallbackQuery, GoogleUserProfile } from '../../../schemas/auth.js'

declare module 'fastify' {
	interface FastifyInstance {
		googleOAuth2Manager: {
			getGoogleOAuthUrl(): string
			getTokenFromCode(request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>): Promise<{ access_token: string; [key: string]: any }>
			revokeGoogleToken(token: string): Promise<void>
			getUserProfileFromToken(tokenData: { access_token: string }): Promise<GoogleUserProfile>
		}
	}
}

export function manageGoogleOauth2(fastify: FastifyInstance) {
	return {
		getGoogleOAuthUrl(): string {
		const CLIENT_ID = fastify.config.GOOGLE_CLIENT_ID
		const REDIRECT_URI = fastify.config.GOOGLE_REDIRECT_URI
		const SCOPE = 'email profile'

		return `https://accounts.google.com/o/oauth2/v2/auth?` +
			`client_id=${CLIENT_ID}&` +
			`redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
			`scope=${encodeURIComponent(SCOPE)}&` +
			`response_type=code&` +
			`access_type=offline&` +
			`prompt=consent`
		},

		async getTokenFromCode(request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>): Promise<{ access_token: string; [key: string]: any }> {
			const { code } = request.query as GoogleUserProfile;

			const response = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					code,
					client_id: fastify.config.GOOGLE_CLIENT_ID,
					client_secret: fastify.config.GOOGLE_CLIENT_SECRET,
					redirect_uri: fastify.config.GOOGLE_REDIRECT_URI,
					grant_type: 'authorization_code',
				}).toString(),
			})

			const tokenData = await response.json()
			if (!tokenData.access_token) {
				throw new Error('Failed to get access token')
			}

			return tokenData
		},

		async revokeGoogleToken(token: string): Promise<void> {
			fastify.log.info('this is revokeGoogleToken')

			try {
				const response = await fetch('https://oauth2.googleapis.com/revoke', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({ token }).toString(),
				})
				if (response.ok) {
					fastify.log.info('구글 토큰 무효화 성공')
				} else {
					const error: { error: string } = await response.json()
					fastify.log.error('구글 토큰 무효화 실패', error)
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					fastify.log.error('구글 revoke 요청 실패', err.message)
				} else {
					fastify.log.error('알 수 없는 오류 발생')
				}
			}
		},

		async getUserProfileFromToken(tokenData: { access_token: string }): Promise<GoogleUserProfile> {
			const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			})
			const userProfile = await profileResponse.json()
			if (!userProfile.email) {
				throw new Error('Invalid user profile response')
			}
			return userProfile
		},
	}
}

export default fp(async (fastify: FastifyInstance) => {
	const googleOAuth2Manager = manageGoogleOauth2(fastify)
	fastify.decorate('googleOAuth2Manager', googleOAuth2Manager)
}, {
	name: 'google-oauth2-manager',
	dependencies: ['@fastify/env'],
})
