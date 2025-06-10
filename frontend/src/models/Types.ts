export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  gamesPlayed: number;
  gamesWon: number;
  achievements: Achievement[];
  notifications: Notification[];
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

export interface Achievement {
  id: string;
  name: string;
  description: string;
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
  isLoggedIn: boolean;
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