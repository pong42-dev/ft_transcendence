// Game WebSocket Types
// 백엔드 schemas/games.ts에서 WebSocket 스키마 동기화

// =================================================================
// WebSocket Message Types
// =================================================================

export type GameWSMessageType = 
  | 'player_input'
  | 'game_state' 
  | 'game_end'
  | 'player_joined'
  | 'player_left'
  | 'error';

// =================================================================
// Client → Server Messages  
// =================================================================

export interface PlayerInput {
  player_id: string;
  action: 'UP' | 'DOWN' | 'NONE';
  timestamp: number;
}

export interface WSPlayerInputMessage {
  type: 'player_input';
  data: PlayerInput;
}

// =================================================================
// Server → Client Messages
// =================================================================

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

export interface WSGameStateMessage {
  type: 'game_state';
  data: GameState;
}

export interface GameResult {
  game_id: string;
  winner: string;
  final_score: { left: number; right: number };
  duration: number;
  end_reason: 'normal' | 'disconnect' | 'timeout';
}

export interface WSGameEndMessage {
  type: 'game_end';
  data: GameResult;
}

export interface Player {
  id: string;
  name: string;
  type: 'user' | 'guest';
  user_id?: number;
  guest_name?: string;
}

export interface WSPlayerJoinedMessage {
  type: 'player_joined';
  data: {
    player: Player;
    playerCount: number;
  };
}

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

// =================================================================
// WebSocket Connection Helper Types
// =================================================================

export interface GameWebSocketConfig {
  gameId: string;
  playerId: string;
  serverUrl: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface GameWebSocketStats {
  connected: boolean;
  reconnectCount: number;
  lastMessageTime: number;
  latency: number;
}
