import { Static, Type } from '@sinclair/typebox'
import { IdSchema, DateTimeSchema, StringSchema } from '../common.js'

export const TmpTokenSchema = Type.Object({
	token: StringSchema,
	user_id: IdSchema,
	type: StringSchema,
	created_at: DateTimeSchema,
	expires_at: DateTimeSchema
})
export interface TmpToken extends Static<typeof TmpTokenSchema> {}
