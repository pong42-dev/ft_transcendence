import {Static, Type} from "@sinclair/typebox";

// TODO: DB 스키마 확정 후 Player 필드 구조 수정 필요
// 현재는 임시 구조로 구현
export const PlayerSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  type: Type.Union([Type.Literal('user'), Type.Literal('guest')]),
  user_id: Type.Optional(Type.Number()),
  guest_name: Type.Optional(Type.String())
})
export type Player = Static<typeof PlayerSchema>;

export const GameModeSchema = Type.Union([
  Type.Literal('1v1'), 
  Type.Literal('tournament')
])
export type GameMode = Static<typeof GameModeSchema>

export const GameStateSchema = Type.Object({
  game_id: Type.String(),
  ball: Type.Object({
    x: Type.Number(),
    y: Type.Number()
  }),
  paddles: Type.Object({
    left: Type.Object({ y: Type.Number() }),
    right: Type.Object({ y: Type.Number() })
  }),
  score: Type.Object({
    left: Type.Number(),
    right: Type.Number()
  }),
  round: Type.Number(),
  status: Type.Union([
    Type.Literal('playing'),
    Type.Literal('round_end'), 
    Type.Literal('game_end')
  ]),
  timestamp: Type.Number()
})

export interface GameState {
  game_id: string;
  ball: { x: number; y: number };
  paddles: {
    left: { y: number };
    right: { y: number };
  };
  score: { left: number; right: number };
  round: number;
  status: 'playing' | 'round_end' | 'game_end';
  timestamp: number;
}

export const PlayerInputSchema = Type.Object({
  player_id: Type.String(),
  action: Type.Union([
    Type.Literal('UP'),
    Type.Literal('DOWN'),
    Type.Literal('NONE')
  ]),
  timestamp: Type.Number()
})

// Static을 사용하지 않고 직접 인터페이스 정의
export interface PlayerInput {
  player_id: string;
  action: 'UP' | 'DOWN' | 'NONE';
  timestamp: number;
}

export const GameResultSchema = Type.Object({
  game_id: Type.String(),
  winner: Type.String(),
  final_score: Type.Object({
    left: Type.Number(),
    right: Type.Number()
  }),
  duration: Type.Number(),
  end_reason: Type.Union([
    Type.Literal('normal'),
    Type.Literal('disconnect'),
    Type.Literal('timeout')
  ])
})

export interface GameResult {
  game_id: string;
  winner: string;
  final_score: { left: number; right: number };
  duration: number;
  end_reason: 'normal' | 'disconnect' | 'timeout';
}

export const GameStatusSchema = Type.Union([
  Type.Literal('waiting'),
  Type.Literal('starting'),
  Type.Literal('playing'),
  Type.Literal('paused'),
  Type.Literal('finished')
])
export type GameStatus = Static<typeof GameStatusSchema>

// 게임 생성 요청 스키마
export const CreateGameSchema = Type.Object({
  player1: PlayerSchema,
  player2: PlayerSchema,
  gameMode: Type.Optional(GameModeSchema)
})

export interface CreateGame {
  player1: Player;
  player2: Player;
  gameMode?: GameMode;
}

// 게임 취소 요청 스키마
export const CancelGameSchema = Type.Object({
  reason: Type.Union([
    Type.Literal('user_exit'),
    Type.Literal('page_unload'),
    Type.Literal('network_error')
  ]),
  playerId: Type.Optional(Type.String())
})

export interface CancelGame {
  reason: 'user_exit' | 'page_unload' | 'network_error';
  playerId?: string;
}
