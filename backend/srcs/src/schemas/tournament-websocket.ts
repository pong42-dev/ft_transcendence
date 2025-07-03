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

// --- 브래킷 업데이트 메시지 ---
export const BracketUpdateMessageSchema = Type.Object({
  type: Type.Literal('bracket_update'),
  data: Type.Object({
    matches: Type.Array(Type.Any()), // 실제로는 TournamentMatchInfo[] 타입이지만, Any로 둠
  }),
});
export type BracketUpdateDto = Static<typeof BracketUpdateMessageSchema>;

// --- 매치 시작 메시지 ---
export const MatchStartingMessageSchema = Type.Object({
  type: Type.Literal('match_starting'),
  data: Type.Object({
    matchId: Type.Number(),
    gameId: Type.String(),
  }),
});
export type MatchStartingDto = Static<typeof MatchStartingMessageSchema>;

// --- 매치 종료 메시지 ---
export const MatchEndMessageSchema = Type.Object({
  type: Type.Literal('match_end'),
  data: Type.Object({
    matchId: Type.Number(),
    winnerId: Type.Number(),
    nextMatchId: Type.Optional(Type.Number()),
    // 필요하다면 score 등 추가 가능
  }),
});
export type MatchEndDto = Static<typeof MatchEndMessageSchema>; 