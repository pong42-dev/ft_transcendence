import { Static, Type } from '@sinclair/typebox'
import { EmailSchema, StringSchema, IdSchema } from '../../common.js'

export const GoogleCallbackQuerySchema = Type.Object(
  {
    code: Type.Optional(StringSchema),
    error: Type.Optional(StringSchema),
  },
  {
    additionalProperties: false,
  }
);

GoogleCallbackQuerySchema.anyOf = [
  Type.Object({ code: StringSchema }),
  Type.Object({ error: StringSchema }),
];

export interface GoogleCallbackQuery extends Static<typeof GoogleCallbackQuerySchema> {}
export const GoogleUserProfileSchema = Type.Object({
	id: IdSchema,
	email: EmailSchema,
	given_name: StringSchema,
	picture: StringSchema,
})
export interface GoogleUserProfile extends Static<typeof GoogleUserProfileSchema> {}

export const GoogleTokenResponseSchema = Type.Object({
	access_token: Type.String(),
	expires_in: Type.Optional(Type.Number()),
	refresh_token: Type.Optional(Type.String()),
	scope: Type.Optional(Type.String()),
	token_type: Type.Optional(Type.String()),
	id_token: Type.Optional(Type.String()),
}, { additionalProperties: true }); // Allow extra fields

export type GoogleTokenResponse = Static<typeof GoogleTokenResponseSchema>;
