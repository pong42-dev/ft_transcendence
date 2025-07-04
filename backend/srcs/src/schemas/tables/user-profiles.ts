import { Static, Type } from '@sinclair/typebox'
import { StringSchema, IdSchema, BooleanSchema } from '../common.js'

export const UserProfileSchema = Type.Object({
	user_id: IdSchema,
	name: StringSchema,
	avatar: Type.Union([StringSchema, Type.Null()]),
	status : BooleanSchema
})
export interface UserProfile extends Static<typeof UserProfileSchema> {}

export const Profiles = Type.Array(UserProfileSchema);