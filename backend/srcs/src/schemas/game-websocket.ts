import { Type, Static } from '@sinclair/typebox'
import { GameStateDtoSchema, GameEventDtoSchema, PlayerInputDtoSchema } from './games.js'

// =================================================================
// WebSocket Message Types
// =================================================================

// Client -> Server Messages
export const WSPlayerInputMessageSchema = Type.Object({
  type: Type.Literal('player_input'),
  data: Type.Object({
    playerId: Type.Number(),
    input: PlayerInputDtoSchema
  })
})

export const WSPlayerReadyMessageSchema = Type.Object({
  type: Type.Literal('player_ready'),
  data: Type.Object({
    playerId: Type.Number()
  })
})

// Server -> Client Messages
export const WSGameStateMessageSchema = Type.Object({
  type: Type.Literal('game_state'),
  data: GameStateDtoSchema
})

export const WSGameEventMessageSchema = Type.Object({
  type: Type.Literal('game_event'),
  data: GameEventDtoSchema
})

export const WSErrorMessageSchema = Type.Object({
  type: Type.Literal('error'),
  data: Type.Object({
    message: Type.String(),
    code: Type.Optional(Type.String())
  })
})

export const WSConnectionStatusMessageSchema = Type.Object({
  type: Type.Literal('connection_status'),
  data: Type.Object({
    status: Type.Union([
      Type.Literal('connected'),
      Type.Literal('disconnected'),
      Type.Literal('reconnected')
    ]),
    gameId: Type.String(),
    playerId: Type.Optional(Type.Number()),
    message: Type.Optional(Type.String())
  })
})

/**
 * @description 서버가 특정 매치의 두 플레이어에게 경기 시작을 알림.
 * 클라이언트는 이 메시지를 받으면, data.gameId를 이용해 게임 화면으로 전환해야 함.
 */
export const WSMatchStartingMessageSchema = Type.Object({
  type: Type.Literal('match_starting'),
  data: Type.Object({
    matchId: Type.Number(),
    gameId: Type.String()
  })
})

// Union types for type safety
export const WSClientMessageSchema = Type.Union([
  WSPlayerInputMessageSchema,
  WSPlayerReadyMessageSchema
])

export const WSServerMessageSchema = Type.Union([
  WSGameStateMessageSchema,
  WSGameEventMessageSchema,
  WSErrorMessageSchema,
  WSConnectionStatusMessageSchema,
  WSMatchStartingMessageSchema
])

// TypeScript types (inferred from schemas)
export type WSPlayerInputMessage = Static<typeof WSPlayerInputMessageSchema>
export type WSPlayerReadyMessage = Static<typeof WSPlayerReadyMessageSchema>
export type WSGameStateMessage = Static<typeof WSGameStateMessageSchema>
export type WSGameEventMessage = Static<typeof WSGameEventMessageSchema>
export type WSErrorMessage = Static<typeof WSErrorMessageSchema>
export type WSConnectionStatusMessage = Static<typeof WSConnectionStatusMessageSchema>
export type WSMatchStartingMessage = Static<typeof WSMatchStartingMessageSchema>

export type WSClientMessage = Static<typeof WSClientMessageSchema>
export type WSServerMessage = Static<typeof WSServerMessageSchema>
