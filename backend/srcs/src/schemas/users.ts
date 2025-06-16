import { Static, Type } from '@sinclair/typebox'
import { IdSchema, StringSchema, BooleanSchema } from './common.js'

export const UserProfileResponseSchema = Type.Object({
  name: StringSchema,
  avatar: Type.Union([StringSchema, Type.Null()]),
  // win: Type.Number(),
  // loss: Type.Number()
})

export type UserProfileResponse = Static<typeof UserProfileResponseSchema> 

// export const FriendListResponseSchema = Type.Object({
//   id: IdSchema,
//   name: StringSchema,
//   avatar
//   status: BooleanSchema,
// })

// export const FriendListResponse = Type.Array(FriendListResponseSchema);
