import { Static, Type } from '@sinclair/typebox'
import { IdSchema, StringSchema } from '../common.js'

export const TokenDataSchema = Type.Object({
	user_id:  IdSchema,
	token_version: StringSchema
})
export interface TokenData extends Static<typeof TokenDataSchema > {}
