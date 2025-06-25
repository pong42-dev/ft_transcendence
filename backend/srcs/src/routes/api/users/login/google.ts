import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { FastifyRequest } from 'fastify';
import { GoogleCallbackQuerySchema } from '../../../../schemas/auth.js'

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
					msg: Type.String(),
				}),
			},
			tags: ["Users"]
		},
	}, async (request, reply) => {
		try {
			const url = fastify.googleOAuth2Manager.getGoogleOAuthUrl();
			return reply.redirect(url);
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({
				msg: 'An internal server error occurred during Google login redirection.',
			});
		}
	});

	fastify.get('/google/callback', {
		schema: {
			querystring: GoogleCallbackQuerySchema,
			response: {
				200: Type.Object({
					success: Type.Literal(false),
					msg: Type.String()
				}),
				302: Type.Null(),
				409: Type.Object({
					msg: Type.String()
				}),
				500: Type.Object({
					msg: Type.String(),
				}),
			},
			tags: ["Users"]
		}
	}, async (request: FastifyRequest<{ Querystring: { code: string } }>, reply) => {
		const { googleOAuth2Manager, loginManager, usersRepository, userProfilesRepository, downloadImageFromUrl, config } = fastify;
		try {
			const tokenData = await googleOAuth2Manager.getTokenFromCode(request);
			console.log("tokenData:", tokenData);
			const userProfile = await googleOAuth2Manager.getUserProfileFromToken(tokenData.access_token);
			console.log("userProfile:", userProfile);
			const { id: provider_id, email, given_name: name, picture: avatar } = userProfile;
			const userByEmail = await usersRepository.getRowByColumnValue('email', email);
			console.log("userByEmail: ", userByEmail);
			const userByName = await userProfilesRepository.getRowByColumnValue('name', name);
			console.log("userByName: ", userByName);
			console.log("here1");
			if (!userByEmail) {
				console.log("here2");
				const uniqueName = userByName? await userProfilesRepository.generateUniqueUsername(name) : name;
				console.log("name", name);
				console.log("userName", userByName);
				console.log("uniqueName", uniqueName);
				const userId = await usersRepository.insertRow(email, '', 'google', provider_id.toString());
				const picturePath = await downloadImageFromUrl(
					avatar,
					config.UPLOAD_DIRNAME + '/' + config.UPLOAD_USERS_DIRNAME + '/' + config.UPLOAD_AVATAR_DIRNAME
				);
				console.log("picturePath:", picturePath);
				await userProfilesRepository.insertRow(userId, uniqueName, picturePath, 'false');
				console.log('google register complete');
				console.log(userProfilesRepository.getRowByColumnValue('user_id', userId));
				return await loginManager.login(userId, reply, tokenData.refresh_token);
			} else {
				if (userByEmail && userByEmail.provider != 'google')
					return reply.send({ 
						success: false,
						msg: 'This email is already registered.' 
					});
				return await loginManager.login(userByEmail.id, reply, tokenData.refresh_token);
			}
		} catch (err) {
			fastify.log.error(err);
			return reply.status(500).send({ msg: 'An internal server error occurred during OAuth2 callback.', });
		}
	});
};

export default plugin;
