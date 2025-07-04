// Frontend TypeScript types

// =================================================================
// 1. Core Application State & User Models
// =================================================================

export interface AppState {
  isLoggedIn: boolean | null;
  currentUser: User | null;
  isInGame: boolean;
}

export interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  provider?: string; // 'local' | 'google'
  gamesPlayed: number;
  gamesWon: number;
  friends: Friend[];
  password?: string;
  matchHistory: MatchHistory[];
}

export interface Friend {
  id?: number;
  username: string;
  nickname: string;
  status: 'online' | 'offline' | 'inGame';
  blocked: boolean;
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'game_invite';
  title: string;
  message: string;
  sender?: string;
  timestamp: number;
  read: boolean;
}

// =================================================================
// 2. Game & Player Models
// =================================================================

/**
 * Represents a player in the context of the game UI.
 * Can be a registered user, a guest, or an AI.
 */
export interface Player {
  nickname: string;
  avatarUrl?: string;
}

/**
 * Represents a player in a game session from the backend's perspective.
 */
export interface GamePlayer {
  id: string;
  username: string;
  nickname?: string;
  isReady: boolean;
}

export interface Game {
  id: string;
  gameMode: '1v1' | 'tournament';
  players: GamePlayer[];
  status: 'waiting' | 'inProgress' | 'finished';
  startedAt: string;
  endedAt?: string;
  maxPlayers: number;
  currentScore?: GameScore;
  winner?: string;
}

export interface GameInviteConfig {
  gameMode: '1v1' | 'tournament';
  difficulty?: 'easy' | 'medium' | 'hard';
  maxScore?: number;
  isPrivate?: boolean;
}

export interface GameMove {
  playerId: string;
  action: 'move_up' | 'move_down' | 'stop';
  timestamp: number;
}

export interface GameScore {
  player1: number;
  player2: number;
}

export interface GameInvite {
  id: string;
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
  inviteeUsername: string;
  gameConfig: GameInviteConfig;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface MatchHistory {
  date: string;
  opponent: string | string[];
  rank: number;
  type: '1v1' | 'tournament';
  myScore?: number;
  opponentScore?: number;
}

export interface GameData {
  gameMode: '1v1' | 'tournament';
  difficulty?: 'easy' | 'medium' | 'hard';
  maxScore?: number;
}

export interface GameResult {
  winner: 'left' | 'right';
  leftPlayer: {
    nickname: string;
    score: number;
    avatarUrl?: string;
  };
  rightPlayer: {
    nickname: string;
    score: number;
    avatarUrl?: string;
  };
  totalRounds: number;
  gameMode: 'regular' | 'tournament' | 'demo';
}

export interface GameStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  averageScore: number;
  favoriteGameMode: string;
}

export interface ActiveGame {
  id: string;
  gameMode: string;
  players: string[];
  status: 'waiting' | 'inProgress' | 'finished';
  startedAt: string;
  maxPlayers: number;
}

/**
 * Represents a player in the context of the game modal UI.
 */
export interface PlayerInfo {
  name: string;
  isCurrentUser?: boolean;
  isNextOpponent?: boolean;
}

export interface GameSetupResult {
  mode: string;
  opponents: string[];
  aiSettings?: {
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

// =================================================================
// 3. API Communication Models
// =================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly error?: string;
  readonly timestamp: string;
  readonly requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly data: T[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface ApiError {
  readonly statusCode: HttpStatusCode;
  readonly error: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly path?: string;
}

export interface ApiErrorResponse {
  readonly statusCode: HttpStatusCode;
  readonly error: string;
  readonly message: string;
  readonly details?: {
    readonly field?: string;
    readonly code?: string;
    readonly value?: any;
  }[];
  readonly timestamp: string;
  readonly path?: string;
}

// --- Specific API Endpoints ---

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  readonly deviceId?: string;
}

export interface LoginResponse {
  readonly user: BackendUser;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly tokenType: 'Bearer';
  readonly requires2FA?: boolean;
  readonly tmpToken?: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly nickname: string;
  readonly acceptTerms: true;
}

export interface UpdateProfileData {
  nickname?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
}

// =================================================================
// 2FA Types
// =================================================================

export interface TwoFAInitResponse {
  qrCodeUrl: string;
  secret: string;
  token: string;
}

export interface TwoFAEnableRequest {
  token: string;      // 6-digit TOTP
  tmpToken: string;   // From init response
}

export interface TwoFAVerifyRequest {
  tmpToken: string;   // From login response
  token: string;      // 6-digit TOTP
}

export interface TwoFADisableRequest {
  token: string;      // Current 6-digit TOTP
}

// =================================================================
// 4. Backend-Specific Data Models
// =================================================================

/**
 * Raw user data structure from the backend API.
 * This is converted to the frontend `User` type.
 */
export interface BackendUser {
  readonly id: number;
  readonly username: string;
  readonly nickname?: string;
  readonly email: string;
  readonly avatarUrl?: string;
  readonly twoFactorEnabled: boolean;
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly friends: readonly BackendFriend[];
  readonly matchHistory: readonly BackendGameMatch[];
}

export interface BackendFriend {
  readonly id: number;
  readonly user: BackendUser;
  readonly status: 'pending' | 'accepted' | 'blocked';
  readonly createdAt: string;
}

export interface BackendGameMatch {
  readonly id: number;
  readonly player1: BackendUser;
  readonly player2: BackendUser | null;
  readonly player1Score: number;
  readonly player2Score: number;
  readonly gameMode: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly winner?: number;
}

// =================================================================
// 5. WebSocket Models
// =================================================================

export type WebSocketMessageType =
  | 'game_update'
  | 'friend_status'
  | 'system_message';

export interface WebSocketMessage<T = unknown> {
  readonly type: WebSocketMessageType;
  readonly payload: T;
  readonly timestamp: string;
  readonly id: string;
}

// =================================================================
// 6. API Client Internals
// =================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  defaultCacheTTL?: number;
  enableLogging?: boolean;
}

export interface RequestInterceptor {
  onRequest?: (config: RequestInit, endpoint: string) => RequestInit | Promise<RequestInit>;
  onRequestError?: (error: Error) => Error | Promise<Error>;
}

export interface ResponseInterceptor {
  onResponse?: (response: Response, data: any) => any | Promise<any>;
  onResponseError?: (error: Error) => Error | Promise<Error>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // TTL in milliseconds
  key?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}


// =================================================================
// 7. Utility Types
// =================================================================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends Record<string, unknown>
    ? DeepReadonly<T[P]>
    : T[P];
};

// ===============================
// Backend API DTOs (for Game)
// ===============================

export type PlayerType = 'user' | 'guest' | 'ai';
export type GameMode = 'local_1v1' | 'ai_1v1' | 'tournament';
export type GameStatus = 'waiting' | 'countdown' | 'playing' | 'finished' | 'canceled';

// export interface CreatePlayerRequestDto {
//   type: PlayerType;
//   userId?: number; // user 타입인 경우 필수
//   displayName?: string; // guest 타입인 경우 필수
// }

export interface PlayerResponseDto {
  id: number;
  type: PlayerType;
  name: string; // users.nickname or players.display_name
  avatarUrl?: string; // user avatar URL
}

export interface CreateGameRequestDto {
  type: GameMode; // 'ai_1v1', 'local_1v1', 'tournament'
  opponents?: string[];  // 게스트들의 닉네임만 담는 배열
  aiSettings?: {
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface GameResponseDto {
  gameId: string;
  status: GameStatus;
  type: GameMode;
  players: PlayerResponseDto[];
}

// WebSocket DTOs
export interface PlayerInputDto {
  action: 'UP' | 'DOWN';
}

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
    finalScores?: {
      player1: number;
      player2: number;
    };
  };
}

export interface TournamentRound {
  round_number: number;
  players: string[];
  winner?: string;
  result?: string;
}

export interface UserTournamentHistory {
  tournament_id: number;
  tournament_date: string;
  participants: string[];
  rounds: TournamentRound[];
  final_rank: number;

}