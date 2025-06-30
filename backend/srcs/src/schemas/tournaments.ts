import { Static, Type } from '@sinclair/typebox';

// =================================================================
//                            Enums & Types
// =================================================================

export const TournamentStatusSchema = Type.Union([
  Type.Literal('waiting'),
  Type.Literal('in-progress'),
  Type.Literal('ended'),
  Type.Literal('canceled'),
]);
export type TournamentStatus = Static<typeof TournamentStatusSchema>;

export const PlayerTypeSchema = Type.Union([
  Type.Literal('user'),
  Type.Literal('guest'),
]);
export type PlayerType = Static<typeof PlayerTypeSchema>;

// =================================================================
//                      Database Schema Types
// =================================================================

export const DBTournamentSchema = Type.Object({
  id: Type.Integer(),
  status: TournamentStatusSchema,
  winner_player_id: Type.Optional(Type.Integer()),
  created_at: Type.String(),
  ended_at: Type.Optional(Type.String()),
});
export type DBTournament = Static<typeof DBTournamentSchema>;

export const DBTournamentParticipantSchema = Type.Object({
  id: Type.Integer(),
  type: PlayerTypeSchema,
  user_id: Type.Optional(Type.Integer()),
  display_name: Type.Optional(Type.String()),
  created_at: Type.String(),
});
export type DBTournamentParticipant = Static<typeof DBTournamentParticipantSchema>;

export const DBTournamentMatchSchema = Type.Object({
  id: Type.Integer(),
  round_number: Type.Integer(),
  status: Type.String(),
  winner_id: Type.Optional(Type.Integer()),
  started_at: Type.Optional(Type.String()),
  ended_at: Type.Optional(Type.String()),
});
export type DBTournamentMatch = Static<typeof DBTournamentMatchSchema>;

// =================================================================
//                         API DTOs
// =================================================================

// --- Tournament Creation ---
export const CreateTournamentRequestDtoSchema = Type.Object({
  // 로컬 토너먼트: 유저 1명 + 게스트 3명
  participants: Type.Array(Type.Object({
    type: PlayerTypeSchema,
    userId: Type.Optional(Type.Integer()), // user 타입인 경우 필수
    displayName: Type.Optional(Type.String()), // guest 타입인 경우 필수
  }), { minItems: 4, maxItems: 4 })
});
export type CreateTournamentRequestDto = Static<typeof CreateTournamentRequestDtoSchema>;

export const TournamentResponseDtoSchema = Type.Object({
  id: Type.Integer(),
  status: TournamentStatusSchema,
  winner_player_id: Type.Optional(Type.Integer()),
  created_at: Type.String(),
  ended_at: Type.Optional(Type.String()),
});
export type TournamentResponseDto = Static<typeof TournamentResponseDtoSchema>;

// --- Tournament Participant ---
export const AddParticipantRequestDtoSchema = Type.Object({
  type: PlayerTypeSchema,
  userId: Type.Optional(Type.Integer()), // user 타입인 경우 필수
  displayName: Type.Optional(Type.String()), // guest 타입인 경우 필수
});
export type AddParticipantRequestDto = Static<typeof AddParticipantRequestDtoSchema>;

export const ParticipantResponseDtoSchema = Type.Object({
  id: Type.Integer(),
  type: PlayerTypeSchema,
  name: Type.String(), // users.nickname or players.display_name
  user_id: Type.Optional(Type.Integer()),
});
export type ParticipantResponseDto = Static<typeof ParticipantResponseDtoSchema>;

// --- Tournament Details ---
export const TournamentDetailsResponseDtoSchema = Type.Object({
  id: Type.Integer(),
  status: TournamentStatusSchema,
  winner_player_id: Type.Optional(Type.Integer()),
  created_at: Type.String(),
  ended_at: Type.Optional(Type.String()),
  participants: Type.Array(ParticipantResponseDtoSchema),
  matches: Type.Array(Type.Object({
    id: Type.Integer(),
    round_number: Type.Integer(),
    status: Type.String(),
    participants: Type.Array(ParticipantResponseDtoSchema),
    winner_id: Type.Optional(Type.Integer()),
    started_at: Type.Optional(Type.String()),
  })),
});
export type TournamentDetailsResponseDto = Static<typeof TournamentDetailsResponseDtoSchema>;

// --- Tournament Progress ---
export const TournamentProgressResponseDtoSchema = Type.Object({
  tournament_id: Type.Integer(),
  status: Type.String(),
  current_match: Type.Optional(Type.Object({
    id: Type.Integer(),
    round_number: Type.Integer(),
    status: Type.String(),
    participants: Type.Array(ParticipantResponseDtoSchema),
    winner_id: Type.Optional(Type.Integer()),
    started_at: Type.Optional(Type.String()),
  })),
  next_matches: Type.Array(Type.Object({
    id: Type.Integer(),
    round_number: Type.Integer(),
    status: Type.String(),
    participants: Type.Array(ParticipantResponseDtoSchema),
    winner_id: Type.Optional(Type.Integer()),
    started_at: Type.Optional(Type.String()),
  })),
  completed_matches: Type.Array(Type.Object({
    id: Type.Integer(),
    round_number: Type.Integer(),
    status: Type.String(),
    participants: Type.Array(ParticipantResponseDtoSchema),
    winner_id: Type.Optional(Type.Integer()),
    started_at: Type.Optional(Type.String()),
  })),
  participants: Type.Array(Type.Object({
    id: Type.Integer(),
    name: Type.String(),
    user_id: Type.Optional(Type.Integer()),
    eliminated: Type.Boolean(),
  })),
});
export type TournamentProgressResponseDto = Static<typeof TournamentProgressResponseDtoSchema>;

// --- Tournament List ---
export const TournamentListResponseDtoSchema = Type.Array(TournamentResponseDtoSchema);
export type TournamentListResponseDto = Static<typeof TournamentListResponseDtoSchema>;

// --- User Tournament History ---
export const UserTournamentHistoryResponseDtoSchema = Type.Object({
  tournament_id: Type.Integer(),
  tournament_date: Type.String(),
  participants: Type.Array(Type.String()),
  rounds: Type.Array(Type.Object({
    round_number: Type.Integer(),
    players: Type.Array(Type.String()),
    winner: Type.Optional(Type.String()),
    result: Type.Optional(Type.String()),
  })),
  final_rank: Type.Integer(),
});
export type UserTournamentHistoryResponseDto = Static<typeof UserTournamentHistoryResponseDtoSchema>;

export const UserTournamentHistoryListResponseDtoSchema = Type.Array(UserTournamentHistoryResponseDtoSchema);
export type UserTournamentHistoryListResponseDto = Static<typeof UserTournamentHistoryListResponseDtoSchema>;

// --- Tournament Bracket Generation ---
export const GenerateBracketResponseDtoSchema = Type.Object({
  tournament_id: Type.Integer(),
  message: Type.String(),
  games: Type.Array(Type.Object({
    id: Type.Integer(),
    round_number: Type.Integer(),
    participants: Type.Array(ParticipantResponseDtoSchema),
  })),
});
export type GenerateBracketResponseDto = Static<typeof GenerateBracketResponseDtoSchema>; 