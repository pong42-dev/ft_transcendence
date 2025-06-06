import { Static, Type } from '@sinclair/typebox'
import { StringSchema } from './common.js'

export const UserProfileResponseSchema = Type.Object({
  name: StringSchema,
  avatar: Type.Union([StringSchema, Type.Null()]),
  win: Type.Number(),
  loss: Type.Number()
})

export type UserProfileResponse = Static<typeof UserProfileResponseSchema> 