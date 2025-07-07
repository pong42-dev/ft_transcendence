import { Type, Static } from '@sinclair/typebox'
import { StringSchema } from '../../common'
import { UserGameStatsSchema, OneOnOneHistorySchema, TournHistorySchema} from './me.js'

export const FriendInfoSchema = Type.Object({
  name: StringSchema,
  avatar: StringSchema,
})
export type FriendInfo = Static<typeof FriendInfoSchema>;

export const FriendProfileResponseSchema = Type.Object({
  friendInfo: FriendInfoSchema,
  gameStats: UserGameStatsSchema,
  oneOnOneHistory: OneOnOneHistorySchema,
  tournHistory: TournHistorySchema,
})
export type FriendProfileResponse = Static<typeof FriendProfileResponseSchema>;
