// =================================================================
// Game WebSocket Types (Frontend Pure TypeScript)
// =================================================================

// Client → Server
export interface PlayerInputDto {
  action: 'UP' | 'DOWN' | 'NONE';
}

// Server → Client
export interface BallState {
  x: number;
  y: number;
}

export interface PaddleState {
  y: number;
}

export interface GameSettingsDto {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballSize: number;
  paddleOffset: number;
}

export interface GameStateDto {
  ball: BallState;
  paddles: {
    player1: PaddleState;
    player2: PaddleState;
  };
  scores: {
    player1: number;
    player2: number;
  };
  settings: GameSettingsDto;
}

export type GameEventType =
  | 'countdown'
  | 'intermission_countdown'
  | 'round_start'
  | 'round_end'
  | 'game_end'
  | 'game_canceled';

export interface GameEventDto {
  event: GameEventType;
  data?: {
    remainingTime?: number;
    winnerId?: number;
    round?: number; // 라운드 번호 (intermission_countdown에서 사용)
    finalScores?: { // 최종 점수 (game_end에서 사용)
      player1: number;
      player2: number;
    };
    // 확장 가능
  };
}

// =================================================================
// WebSocket Message Types
// =================================================================

// Client → Server
export interface WSPlayerInputMessage {
  type: 'player_input';
  data: {
    playerId: number;
    input: PlayerInputDto;
  };
}

export interface WSPlayerReadyMessage {
  type: 'player_ready';
  data: {
    playerId: number;
  };
}

// Server → Client
export interface WSGameStateMessage {
  type: 'game_state';
  data: GameStateDto;
}

export interface WSGameEventMessage {
  type: 'game_event';
  data: GameEventDto;
}

export interface WSErrorMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

export type WSConnectionStatus = 'connected' | 'disconnected' | 'reconnected';

export interface WSConnectionStatusMessage {
  type: 'connection_status';
  data: {
    status: WSConnectionStatus;
    gameId: string;
    playerId?: number;
    message?: string;
  };
}

// Union Types
export type WSClientMessage = WSPlayerInputMessage | WSPlayerReadyMessage;
export type WSServerMessage =
  | WSGameStateMessage
  | WSGameEventMessage
  | WSErrorMessage
  | WSConnectionStatusMessage;
