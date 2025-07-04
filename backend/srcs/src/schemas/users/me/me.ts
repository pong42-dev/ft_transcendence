import { Type, Static } from '@sinclair/typebox'
import { IdSchema, StringSchema, DateTimeSchema, BooleanSchema, EmailSchema } from '../../common.js'

// User Info
export const UserInfoSchema = Type.Object({
  email: StringSchema,
  name: EmailSchema,
  avatar: StringSchema,
  twoFA: BooleanSchema,
  provider: StringSchema
})
export type UserInfo = Static<typeof UserInfoSchema>;

// Game Stats
export const UserGameStatsSchema = Type.Object({
  totalGames: Type.Integer({ minimum: 0 }),
  totalWins: Type.Integer({ minimum: 0 }),
  winRate: Type.Number({ minimum: 0, maximum: 100 }),
});

export type UserGameStats = Static<typeof UserGameStatsSchema>;

// Match History: Local One-on-One
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

// Match History: Tournament
// Rounds are structured as one-on-one game units (same as OneOnOneHistoryItemSchema)
export const RoundSchema = OneOnOneHistoryItemSchema

// Schema for each tournament record item
export const TournHistoryItemSchema = Type.Object({
  tournament_id: IdSchema,
  tournament_date: StringSchema,
  participants: Type.Array(StringSchema),
  rounds: Type.Array(RoundSchema),
  final_rank: Type.Integer({ minimum: 1 }),
})

// Full tournament history list
export const TournHistorySchema = Type.Array(TournHistoryItemSchema)
export interface TournHistory extends Static<typeof TournHistorySchema> {}

// Final response schema for user profile
export const UserProfileResponseSchema = Type.Object({
  userInfo: UserInfoSchema,
  gameStats: UserGameStatsSchema,
  oneOnOneHistory: OneOnOneHistorySchema,
  tournHistory: TournHistorySchema,
})

export type UserProfileResponse = Static<typeof UserProfileResponseSchema>;
