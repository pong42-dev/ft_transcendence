import { Static, Type } from '@sinclair/typebox'
import { EmailSchema, StringSchema, IdSchema, DateTimeSchema, BooleanSchema } from './common.js'

// login
export const CredentialsSchema = Type.Object({
	email: EmailSchema,
	password: StringSchema
})
export interface Credentials extends Static<typeof CredentialsSchema> {}

// tables
export const UserSchema = Type.Object({
	id: IdSchema,
	email: EmailSchema,
	password: StringSchema,
	provider: StringSchema,
	provider_id : StringSchema
})
export interface User extends Static<typeof UserSchema> {}

export const UserProfileSchema = Type.Object({
	user_id: IdSchema,
	name: StringSchema,
	avatar: Type.Union([StringSchema, Type.Null()]),
	status : BooleanSchema
})
export interface UserProfile extends Static<typeof UserProfileSchema> {}

export const Profiles = Type.Array(UserProfileSchema);

export const FriendSchema = Type.Object({
	id: IdSchema,
	user_id: IdSchema,
	friend_id: IdSchema,
	status: BooleanSchema,
	requested_at: DateTimeSchema
})
export interface Friend extends Static<typeof FriendSchema> {}

export const UserTokenSchema = Type.Object({
	user_id: IdSchema,
	server_refresh_token: StringSchema,
	server_expires_at: StringSchema,
	google_refresh_token: StringSchema
})
export interface UserToken extends Static<typeof UserTokenSchema> {}

export const User2FASchema = Type.Object({
	user_id: IdSchema,
	two_fa_secret: StringSchema,
	is_enabled: BooleanSchema,
	created_at: DateTimeSchema
})
export interface User2FA extends Static<typeof User2FASchema> {}

export const InitUser2FASchema = Type.Object({
	qrCodeUrl: StringSchema,
	secret: StringSchema,
	token: StringSchema
})
export interface InitUser2FA extends Static<typeof InitUser2FASchema> {}

export const TmpTokenSchema = Type.Object({
	token: StringSchema,
	user_id: IdSchema,
	type: StringSchema,
	created_at: DateTimeSchema,
	expires_at: DateTimeSchema
})
export interface TmpToken extends Static<typeof TmpTokenSchema> {}


// token
export const TokenDataSchema = Type.Object({
	user_id:  IdSchema,
})
export interface TokenData extends Static<typeof TokenDataSchema > {}

// params, return 
export const UserEmailSchema = Type.Object({
	email: EmailSchema
})
export interface UserEmail extends Static<typeof UserEmailSchema > {}

export const UserNameSchema = Type.Object({
	name: StringSchema,
})
export interface UserName extends Static<typeof UserNameSchema > {}

export const UserDataSchema = Type.Object({
	user_id:  IdSchema,
	name: StringSchema,
})
export interface UserData extends Static<typeof UserDataSchema > {}

// export const RegisterSchema = Type.Object({
// 	email: EmailSchema,
// 	name: StringSchema,
// 	password: StringSchema,
// });
// export interface Register extends Static<typeof RegisterSchema> {}

export const GoogleUserProfileSchema = Type.Object({
	id: IdSchema,
	email: EmailSchema,
	given_name: StringSchema,
	picture: StringSchema,
})
export interface GoogleUserProfile extends Static<typeof GoogleUserProfileSchema> {}

export const GoogleCallbackQuerySchema = Type.Object({
	code: StringSchema,
})

export interface GoogleCallbackQuery extends Static<typeof GoogleCallbackQuerySchema> {}

// Token 응답 스키마 정의
export const GoogleTokenResponseSchema = Type.Object({
	access_token: Type.String(),
	expires_in: Type.Optional(Type.Number()),
	refresh_token: Type.Optional(Type.String()),
	scope: Type.Optional(Type.String()),
	token_type: Type.Optional(Type.String()),
	id_token: Type.Optional(Type.String()),
}, { additionalProperties: true }); // 기타 필드 허용

// TypeScript 타입 추출
export type GoogleTokenResponse = Static<typeof GoogleTokenResponseSchema>;

export const UserMeSchema = Type.Object({
	email: StringSchema,
	name: StringSchema,
	avatar: StringSchema,
	twoFA: BooleanSchema, 
});

export interface UserMe extends Static<typeof UserMeSchema> {}