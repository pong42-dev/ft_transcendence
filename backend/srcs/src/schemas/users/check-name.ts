import { Static, Type } from '@sinclair/typebox'
import { StringSchema } from '../common.js'

export const UserNameSchema = Type.Object({
	name: StringSchema,
})
export interface UserName extends Static<typeof UserNameSchema > {}
