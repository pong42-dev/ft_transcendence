import { Type, Static } from '@sinclair/typebox';

// --- Client -> Server ---
export const WSTournamentStartMessageSchema = Type.Object({
  type: Type.Literal('tournament_start'),
  data: Type.Object({
    playerId: Type.Number(),
  }),
});
export type WSTournamentStartMessage = Static<typeof WSTournamentStartMessageSchema>;

// --- Server -> Client ---
export const TournamentBracketSchema = Type.Object({
  rounds: Type.Array(
    Type.Array(
      Type.Object({
        matchId: Type.String(),
        player1: Type.Object({
          id: Type.Number(),
          name: Type.String(),
        }),
        player2: Type.Object({
          id: Type.Number(),
          name: Type.String(),
        }),
        winnerId: Type.Optional(Type.Number()),
      })
    )
  ),
});
export type TournamentBracket = Static<typeof TournamentBracketSchema>;

export const WSTournamentBracketMessageSchema = Type.Object({
  type: Type.Literal('tournament_bracket'),
  data: Type.Object({
    bracket: TournamentBracketSchema,
  }),
});
export type WSTournamentBracketMessage = Static<typeof WSTournamentBracketMessageSchema>; 