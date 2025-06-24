import {Static, Type} from "@sinclair/typebox";
import { PlayerSchema, GameStateSchema, GameResultSchema, PlayerInputSchema } from "./games.js";
import type { Player, GameState, GameResult, PlayerInput } from "./games.js";

// =================================================================
// WebSocket Message Types
// =================================================================

export const WSMessageTypeSchema = Type.Union([
  Type.Literal('player_input'),
  Type.Literal('game_state'),
  Type.Literal('game_end'),
  Type.Literal('player_joined'),
  Type.Literal('player_left'),
  Type.Literal('error')
])
export type WSMessageType = Static<typeof WSMessageTypeSchema>

// =================================================================
// Client → Server Messages
// =================================================================

export const WSPlayerInputMessageSchema = Type.Object({
  type: Type.Literal('player_input'),
  data: PlayerInputSchema
})

export interface WSPlayerInputMessage {
  type: 'player_input';
  data: PlayerInput;
}

// =================================================================
// Server → Client Messages
// =================================================================

export const WSGameStateMessageSchema = Type.Object({
  type: Type.Literal('game_state'),
  data: GameStateSchema
})

export interface WSGameStateMessage {
  type: 'game_state';
  data: GameState;
}

export const WSGameEndMessageSchema = Type.Object({
  type: Type.Literal('game_end'),
  data: GameResultSchema
})

export interface WSGameEndMessage {
  type: 'game_end';
  data: GameResult;
}

export const WSPlayerJoinedMessageSchema = Type.Object({
  type: Type.Literal('player_joined'),
  data: Type.Object({
    player: PlayerSchema,
    playerCount: Type.Number()
  })
})

export interface WSPlayerJoinedMessage {
  type: 'player_joined';
  data: {
    player: Player;
    playerCount: number;
  };
}

export const WSErrorMessageSchema = Type.Object({
  type: Type.Literal('error'),
  data: Type.Object({
    message: Type.String(),
    code: Type.Optional(Type.String())
  })
})

export interface WSErrorMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

// =================================================================
// Union Types for Type Safety
// =================================================================

export type ClientToServerMessage = WSPlayerInputMessage;

export type ServerToClientMessage = 
  | WSGameStateMessage 
  | WSGameEndMessage 
  | WSPlayerJoinedMessage 
  | WSErrorMessage;

export type GameWebSocketMessage = ClientToServerMessage | ServerToClientMessage;
