import { Type, Static } from '@sinclair/typebox'
import { IdSchema, StringSchema, DateTimeSchema, BooleanSchema, EmailSchema } from './common'

// UserInfo
export const UserInfoSchema = Type.Object({
  email: StringSchema,
  name: EmailSchema,
  avatar: StringSchema,
  twoFA: BooleanSchema,
  provider: StringSchema
})
export type UserInfo = Static<typeof UserInfoSchema>;

export const FriendInfoSchema = Type.Object({
  name: EmailSchema,
  avatar: StringSchema,
})
export type FriendInfo = Static<typeof FriendInfoSchema>;

// GameInfo
export const UserGameStatsSchema = Type.Object({
  totalGames: Type.Integer({ minimum: 0 }),
  totalWins: Type.Integer({ minimum: 0 }),
  winRate: Type.Number({ minimum: 0, maximum: 100 }),
});

export type UserGameStats = Static<typeof UserGameStatsSchema>;

// Match History : Local One on One
export const OpponentSchema = Type.Object({
  id: IdSchema,
  type: Type.Union([
    Type.Literal('user'),
    Type.Literal('guest'),
    Type.Literal('ai'),
  ]),
  name: StringSchema,
})

export const OneOnOneHistoryItemSchema = Type.Object({
  endedAt: DateTimeSchema,
  opponent: OpponentSchema,
  myScore: Type.Integer({ minimum: 0 }),
  opponentScore: Type.Integer({ minimum: 0 }),
  winnerId: IdSchema,
})

export const OneOnOneHistorySchema = Type.Array(OneOnOneHistoryItemSchema)
export interface OneOnOneHistory extends Static<typeof OneOnOneHistorySchema> {}

// Match History : Tournament
// rounds는 1:1 게임 단위로 변경 (OneOnOneHistoryItemSchema와 동일 구조)
export const RoundSchema = OneOnOneHistoryItemSchema

// 전체 토너먼트 기록 항목 스키마
export const TournHistoryItemSchema = Type.Object({
  tournament_id: IdSchema,
  tournament_date: StringSchema,
  participants: Type.Array(StringSchema),
  rounds: Type.Array(RoundSchema),
  final_rank: Type.Integer({ minimum: 1 }),
})

// 전체 히스토리 리스트
export const TournHistorySchema = Type.Array(TournHistoryItemSchema)
export interface TournHistory extends Static<typeof TournHistorySchema> {}

export const UserProfileResponseSchema = Type.Object({
  userInfo: UserInfoSchema,
  gameStats: UserGameStatsSchema,
  oneOnOneHistory: OneOnOneHistorySchema,
  tournHistory: TournHistorySchema,
})

export const FriendProfileResponseSchema = Type.Object({
  friendInfo: FriendInfoSchema,
  gameStats: UserGameStatsSchema,
  oneOnOneHistory: OneOnOneHistorySchema,
  tournHistory: TournHistorySchema,
})
