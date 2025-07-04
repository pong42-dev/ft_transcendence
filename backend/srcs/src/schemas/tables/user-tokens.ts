import { Static, Type } from '@sinclair/typebox'
import { StringSchema, IdSchema } from '../common.js'

export const UserTokenSchema = Type.Object({
	user_id: IdSchema,
	server_refresh_token: StringSchema,
	server_expires_at: StringSchema,
	google_refresh_token: StringSchema
})
export interface UserToken extends Static<typeof UserTokenSchema> {}
