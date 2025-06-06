import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { FastifyRequest } from 'fastify';
import { GoogleCallbackQuery, GoogleCallbackQuerySchema } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	fastify.get('/google', {
		config: {
			rateLimit: {
			max: 5,
			timeWindow: '1 minute'
			}
		},
		schema: {
			response: {
				302: Type.Null(), 
				500: Type.Object({
					success: Type.Boolean(),
					msg: Type.String(),
				}),
			},
			tags: ['Users']
		},
	}, async (request, reply) => {
		try {
			const url = fastify.googleOAuth2Manager.getGoogleOAuthUrl();
			return reply.redirect(url);
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({
				success: false,
				msg: '구글 로그인 리다이렉션 중 오류가 발생했습니다.',
			});
		}
	});
	fastify.get('/google/callback', {
		schema: {
			querystring: GoogleCallbackQuerySchema,
			response: {
				500: Type.Object({
					success: Type.Boolean(),
					msg: Type.String(),
				}),
			},
			tags: ['Users']
		}
	}, async (request: FastifyRequest<{ Querystring: { code: string } }>, reply) => {
		const { googleOAuth2Manager, loginManager, usersRepository, userProfilesRepository, downloadImageFromUrl } = fastify;
		try {
			const tokenData = await googleOAuth2Manager.getTokenFromCode(request);
			console.log("tokenData:", tokenData);
			const userProfile = await googleOAuth2Manager.getUserProfileFromToken(tokenData);
			console.log('User Profile:', userProfile);
			const { id, email, name, picture } = userProfile;
			const users = await usersRepository.getRowByColumnValue('email', email);
			const user = users[0];
			console.log("user: ", user);
			if (!user) {
				const user_id = await usersRepository.insertRow(email, '', 'google', id.toString());
				const picture_path = await downloadImageFromUrl(picture, fastify.config.UPLOAD_DIRNAME + "/" + fastify.config.UPLOAD_AVATAR_DIRNAME);
				await userProfilesRepository.insertRow(user_id, name, picture_path, 'false');
				return await loginManager.login({ id: user_id }, request, reply, tokenData.refresh_token);
			} else {
				if (user.provider != 'google')
					return reply.status(401).send({ success: false, msg: '이미 존재하는 이메일 입니다.' });
				return await loginManager.login(user, request, reply, tokenData.refresh_token);
			}
		} catch (err) {
			fastify.log.error('OAuth2 콜백 처리 중 오류 발생:', err);
			return reply.status(500).send({
				success: false,
				msg: 'OAuth2 콜백 오류',
			});
		}
	});
};

export default plugin;
