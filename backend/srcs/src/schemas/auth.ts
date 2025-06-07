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

export const UserTokenSchema = Type.Object({
	user_id: IdSchema,
	server_refresh_token: StringSchema,
	server_expires_at: StringSchema,
	google_refresh_token: StringSchema
})
export interface UserToken extends Static<typeof UserTokenSchema> {}

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

export const RegisterSchema = Type.Object({
	email: EmailSchema,
	name: StringSchema,
	password: StringSchema,
	avatar: Type.Union([StringSchema, Type.Null()])
});
export interface Register extends Static<typeof RegisterSchema> {}

export const GoogleUserProfileSchema = Type.Object({
	id: IdSchema,
	email: EmailSchema,
	name: StringSchema,
	picture: StringSchema,
})
export interface GoogleUserProfile extends Static<typeof GoogleUserProfileSchema> {}

export const GoogleCallbackQuerySchema = Type.Object({
	code: StringSchema,
})
export interface GoogleCallbackQuery extends Static<typeof GoogleCallbackQuerySchema> {}
