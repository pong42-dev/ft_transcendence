// Frontend TypeScript types

// User types
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  gamesPlayed: number;
  gamesWon: number;
  friends: Friend[];
  password?: string;
  matchHistory: MatchHistory[];
}

export interface Friend {
  username: string;
  nickname: string;
  status: 'online' | 'offline' | 'in-game';
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

export interface AppState {
  isLoggedIn: boolean | null;
  currentUser: User | null;
  isInGame: boolean;
}

export interface MatchHistory {
  date: string;
  opponent: string | string[];
  rank: number;
  type: '1v1' | 'tournament';
  my_score?: number;
  opponent_score?: number;
}

// API types for frontend communication
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;

// Game API types
export interface GameData {
  gameMode: '1v1' | 'tournament';
  difficulty?: 'easy' | 'medium' | 'hard';
  maxScore?: number;
}

export interface GameResult {
  winner: string;
  player1Score: number;
  player2Score: number;
  duration: number;
  endedAt: string;
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
  status: 'waiting' | 'in_progress' | 'finished';
  startedAt: string;
  maxPlayers: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly error?: string;
  readonly timestamp: string;
  readonly requestId: string;
}

// Paginated response for list APIs
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly data: T[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

// Enhanced error response with more details
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

// Structured error types
export interface ApiError {
  readonly statusCode: HttpStatusCode;
  readonly error: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly path?: string;
}

// Authentication types for API requests
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  readonly deviceId?: string;
}

export interface LoginResponse {
  readonly user: BackendUser; // This will be converted to frontend User
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly tokenType: 'Bearer';
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly nickname: string;
  readonly acceptTerms: true;
}

// Backend user type for API responses (before conversion)
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

// WebSocket types
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

// Utility types
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

// Request interceptor types
export interface RequestInterceptor {
  onRequest?: (config: RequestInit, endpoint: string) => RequestInit | Promise<RequestInit>;
  onRequestError?: (error: Error) => Error | Promise<Error>;
}

// Response interceptor types  
export interface ResponseInterceptor {
  onResponse?: (response: Response, data: any) => any | Promise<any>;
  onResponseError?: (error: Error) => Error | Promise<Error>;
}

// Cache configuration
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

// API client configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  defaultCacheTTL?: number;
  enableLogging?: boolean;
}