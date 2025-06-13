// API 응답 타입 정의
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 인증 관련 타입
export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface GoogleAuthRequest {
  googleToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// 사용자 타입 (기존 Types.ts와 호환)
export interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'in_game';
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 사용자 통계 타입
export interface UserStats {
  wins: number;
  losses: number;
  winRate: number;
  totalGames: number;
  level: number;
  rank?: string;
}

// 게임 히스토리 타입
export interface GameHistory {
  id: string;
  opponent: string;
  score: string;
  won: boolean;
  mode: string;
  date: string;
  duration: number;
}

// 게임 관련 타입
export interface GameResult {
  winner: 'left' | 'right';
  leftScore: number;
  rightScore: number;
  accuracy: number;
  rallyLength: number;
  gameMode: string;
  opponents: string[];
  duration: number;
}

// 에러 타입
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
