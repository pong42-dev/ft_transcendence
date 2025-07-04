import { Static, Type } from '@sinclair/typebox'
import { IdSchema, DateTimeSchema, BooleanSchema } from '../common.js'

export const FriendSchema = Type.Object({
	id: IdSchema,
	user_id: IdSchema,
	friend_id: IdSchema,
	status: BooleanSchema,
	requested_at: DateTimeSchema
})
export interface Friend extends Static<typeof FriendSchema> {}
