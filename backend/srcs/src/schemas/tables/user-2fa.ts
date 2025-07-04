import { Static, Type } from '@sinclair/typebox'
import { StringSchema, IdSchema, DateTimeSchema, BooleanSchema } from '../common.js'

export const User2FASchema = Type.Object({
	user_id: IdSchema,
	two_fa_secret: StringSchema,
	is_enabled: BooleanSchema,
	created_at: DateTimeSchema
})
export interface User2FA extends Static<typeof User2FASchema> {}
