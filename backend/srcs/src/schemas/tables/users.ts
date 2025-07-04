import { Static, Type } from '@sinclair/typebox'
import { EmailSchema, StringSchema, IdSchema } from '../common.js'

export const UserSchema = Type.Object({
	id: IdSchema,
	email: EmailSchema,
	password: StringSchema,
	provider: StringSchema,
	provider_id : StringSchema
})
export interface User extends Static<typeof UserSchema> {}
