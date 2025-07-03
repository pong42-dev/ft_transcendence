// =================================================================
// Tournament WebSocket Types (Frontend Pure TypeScript)
// =================================================================

export interface TournamentBracket {
  rounds: Array<Array<{
    matchId: string;
    player1: { id: number; nickname: string };
    player2: { id: number; nickname: string };
    winnerId?: number;
  }>>;
}

export interface WSTournamentBracketMessage {
  type: 'tournament_bracket';
  data: { bracket: TournamentBracket };
}

export interface WSBracketUpdateMessage {
  type: 'bracket_update';
  data: { matches: any[] };
}

export interface WSMatchStartingMessage {
  type: 'match_starting';
  data: { matchId: number; gameId: string };
}

export interface WSTournamentEndMessage {
  type: 'tournament_end';
  data: { winner: number; finalMatches: any[] };
}

export type TournamentServerMessage =
  | WSTournamentBracketMessage
  | WSBracketUpdateMessage
  | WSMatchStartingMessage
  | WSTournamentEndMessage; 