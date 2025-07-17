import { FastifyRequest, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { GoogleCallbackQuery, GoogleUserProfile, GoogleTokenResponse } from '../../schemas/users/login/google.js'

declare module 'fastify' {
	interface FastifyInstance {
		googleOAuth2Manager: {
			getGoogleOAuthUrl(): string
			getTokenFromCode(request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>): Promise<{ access_token: string; [key: string]: any }>
			revokeGoogleToken(token: string): Promise<void>
			getUserProfileFromToken(access_token: string): Promise<GoogleUserProfile>
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
			const { code } = request.query;

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

			const tokenData = await response.json() as GoogleTokenResponse
			if (!tokenData.access_token) {
				throw new Error('Failed to retrieve access token.')
			}

			return tokenData
		},

		async revokeGoogleToken(token: string): Promise<void> {
			const { log } = fastify;
			log.info('Invoking revokeGoogleToken')
			try {
				const response = await fetch('https://oauth2.googleapis.com/revoke', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({ token }).toString(),
				})
				if (response.ok) {
					log.info('Successfully revoked Google token')
				} else {
					const error = await response.json() as { error: string };
					log.error('Failed to revoke Google token', error)
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					log.error('Google revoke request failed', err.message)
				} else {
					log.error('An unknown error occurred during revoke')
				}
			}
		},

		async getUserProfileFromToken(access_token: string): Promise<GoogleUserProfile> {
			const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			const userProfile = await profileResponse.json() as GoogleUserProfile
			if (!userProfile.email) {
				throw new Error('Invalid user profile response: missing email')
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
