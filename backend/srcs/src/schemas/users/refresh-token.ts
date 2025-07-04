import { Static, Type } from '@sinclair/typebox'
import { IdSchema } from '../common.js'

export const TokenDataSchema = Type.Object({
	user_id:  IdSchema,
})
export interface TokenData extends Static<typeof TokenDataSchema > {}
