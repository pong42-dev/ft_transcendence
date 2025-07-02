import { Static, Type } from '@sinclair/typebox';

// =================================================================
//                            Enums & Types
// =================================================================

export const PlayerTypeSchema = Type.Union([
  Type.Literal('user'),
  Type.Literal('guest'),
  Type.Literal('ai'),
]);
export type PlayerType = Static<typeof PlayerTypeSchema>;

export const GameModeSchema = Type.Union([
  Type.Literal('local_1v1'),
  Type.Literal('ai_1v1'),
  Type.Literal('tournament'),
]);
export type GameMode = Static<typeof GameModeSchema>;

// GameStatus includes 'countdown' for backend-driven start sequence
export const GameStatusSchema = Type.Union([
  Type.Literal('waiting'),
  Type.Literal('countdown'), // Game is set, starting countdown
  Type.Literal('playing'),
  Type.Literal('finished'),
  Type.Literal('canceled'),
]);
export type GameStatus = Static<typeof GameStatusSchema>;

// =================================================================
//                      Database Schema Types
// =================================================================

export const DBPlayerSchema = Type.Object({
  id: Type.Integer(),
  type: PlayerTypeSchema,
  user_id: Type.Optional(Type.Integer()),
  display_name: Type.Optional(Type.String()),
  created_at: Type.String(),
});
export type DBPlayer = Static<typeof DBPlayerSchema>;

export const DBGameSchema = Type.Object({
  id: Type.Integer(),
  type: GameModeSchema,
  tournament_id: Type.Optional(Type.Integer()),
  round_number: Type.Integer(),
  winner_id: Type.Optional(Type.Integer()),
  status: GameStatusSchema,
  started_at: Type.Optional(Type.String()),
  ended_at: Type.Optional(Type.String()),
});
export type DBGame = Static<typeof DBGameSchema>;

export const DBGameParticipantSchema = Type.Object({
  id: Type.Integer(),
  game_id: Type.Integer(),
  player_id: Type.Integer(),
  score: Type.Integer(),
});
export type DBGameParticipant = Static<typeof DBGameParticipantSchema>;

// =================================================================
//                         API DTOs
// =================================================================

// --- Player DTOs ---
export const CreatePlayerRequestDtoSchema = Type.Object({
  type: PlayerTypeSchema,
  userId: Type.Optional(Type.Integer()), // user 타입인 경우 필수
  displayName: Type.Optional(Type.String()), // guest 타입인 경우 필수
});
export type CreatePlayerRequestDto = Static<typeof CreatePlayerRequestDtoSchema>;

export const PlayerResponseDtoSchema = Type.Object({
  id: Type.Integer(),
  type: PlayerTypeSchema,
  name: Type.String(), // users.nickname or players.display_name
});
export type PlayerResponseDto = Static<typeof PlayerResponseDtoSchema>;

// --- Game DTOs ---
export const CreateGameRequestDtoSchema = Type.Object({
  type: GameModeSchema,
  players: Type.Array(CreatePlayerRequestDtoSchema), // 플레이어 정보 배열
});
export type CreateGameRequestDto = Static<typeof CreateGameRequestDtoSchema>;

export const GameResponseDtoSchema = Type.Object({
  gameId: Type.String(), // This will be a UUID for the game session
  status: GameStatusSchema,
  type: GameModeSchema,
  players: Type.Array(PlayerResponseDtoSchema),
});
export type GameResponseDto = Static<typeof GameResponseDtoSchema>;

// =================================================================
//                      WebSocket DTOs
// =================================================================

// --- Client to Server ---
export const PlayerInputDtoSchema = Type.Object({
  action: Type.Union([Type.Literal('UP'), Type.Literal('DOWN'), Type.Literal('NONE')]),
});
export type PlayerInputDto = Static<typeof PlayerInputDtoSchema>;

// --- Server to Client ---

export const BallStateSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
});

export const PaddleStateSchema = Type.Object({
  y: Type.Number(),
});

export const GameSettingsDtoSchema = Type.Object({
  canvasWidth: Type.Integer(),
  canvasHeight: Type.Integer(),
  paddleWidth: Type.Integer(),
  paddleHeight: Type.Integer(),
  ballSize: Type.Integer(),
  paddleOffset: Type.Integer(),
});
export type GameSettingsDto = Static<typeof GameSettingsDtoSchema>;

// For periodic state synchronization
export const GameStateDtoSchema = Type.Object({
  ball: BallStateSchema,
  paddles: Type.Object({
    player1: PaddleStateSchema,
    player2: PaddleStateSchema,
  }),
  scores: Type.Object({
    player1: Type.Integer(),
    player2: Type.Integer(),
  }),
  settings: GameSettingsDtoSchema,
});
export type GameStateDto = Static<typeof GameStateDtoSchema>;

// For discrete events (countdown, game end, etc.)
export const GameEventDtoSchema = Type.Object({
  event: Type.Union([
    Type.Literal('countdown'),
    Type.Literal('round_start'),
    Type.Literal('round_end'),
    Type.Literal('game_end'),
    Type.Literal('game_canceled'),
  ]),
  data: Type.Optional(Type.Object({
    remainingTime: Type.Optional(Type.Number()), // For 'countdown'
    winnerId: Type.Optional(Type.Integer()),      // For 'game_end'
    // Can be extended with more data for other events
  })),
});
export type GameEventDto = Static<typeof GameEventDtoSchema>;
