import { Static, Type } from '@sinclair/typebox'
import { EmailSchema } from '../common.js'

export const UserEmailSchema = Type.Object({
	email: EmailSchema
})
export interface UserEmail extends Static<typeof UserEmailSchema > {}
