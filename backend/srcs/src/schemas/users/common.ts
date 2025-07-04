import { Static, Type } from '@sinclair/typebox'
import { StringSchema, IdSchema } from '../common.js'

export const UserDataSchema = Type.Object({
	user_id:  IdSchema,
	name: StringSchema,
})
export interface UserData extends Static<typeof UserDataSchema > {}
