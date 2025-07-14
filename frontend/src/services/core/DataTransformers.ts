/**
 * 단순화된 데이터 변환 함수들
 * 백엔드 데이터를 프론트엔드 형식으로 변환
 */

import * as Types from '../../types/types.js';

// 🧑‍💻 사용자 데이터 변환
export const transformUser = (backendUser: Types.BackendUser): Types.User => ({
  id: backendUser.id.toString(),
  username: backendUser.username,
  nickname: backendUser.nickname || '',
  avatarUrl: backendUser.avatarUrl || '',
  twoFactorEnabled: backendUser.twoFactorEnabled,
  gamesPlayed: backendUser.gamesPlayed,
  gamesWon: backendUser.gamesWon,
  friends: backendUser.friends.map(transformFriend),
  matchHistory: backendUser.matchHistory.map(match => transformGame(match, backendUser.id))
});

// 👫 친구 데이터 변환
export const transformFriend = (backendFriend: Types.BackendFriend): Types.Friend => ({
  username: backendFriend.user.username,
  nickname: backendFriend.user.nickname || backendFriend.user.username,
  status: 'offline', // 기본값, WebSocket으로 실시간 업데이트
  blocked: backendFriend.status === 'blocked'
});

// 🎮 게임 데이터 변환
export const transformGame = (backendGame: Types.BackendGameMatch, userId?: number): Types.MatchHistory => {
  const isPlayer1 = backendGame.player1.id === userId;
  
  return {
    date: new Date(backendGame.startedAt).toLocaleDateString(),
    opponent: backendGame.player2 ? backendGame.player2.username : 'AI',
    rank: backendGame.winner === userId ? 1 : 2,
    type: backendGame.gameMode === 'tournament' ? 'tournament' : '1v1',
    myScore: isPlayer1 ? backendGame.player1Score : backendGame.player2Score,
    opponentScore: isPlayer1 ? backendGame.player2Score : backendGame.player1Score
  };
};

// 배열 변환 헬퍼
export const transformUsers = (users: Types.BackendUser[]): Types.User[] => 
  users.map(transformUser);

export const transformFriends = (friends: Types.BackendFriend[]): Types.Friend[] => 
  friends.map(transformFriend);

export const transformGames = (games: Types.BackendGameMatch[], userId?: number): Types.MatchHistory[] => 
  games.map(game => transformGame(game, userId));

// 타입 가드 (유효성 검사)
export const isValidBackendUser = (obj: any): obj is Types.BackendUser => 
  obj && 
  typeof obj === 'object' &&
  typeof obj.id === 'number' &&
  typeof obj.username === 'string' &&
  typeof obj.twoFactorEnabled === 'boolean' &&
  typeof obj.gamesPlayed === 'number' &&
  typeof obj.gamesWon === 'number' &&
  Array.isArray(obj.friends) &&
  Array.isArray(obj.matchHistory);

export const isValidBackendFriend = (obj: any): obj is Types.BackendFriend => 
  obj && 
  typeof obj === 'object' &&
  obj.user &&
  typeof obj.user.username === 'string' &&
  typeof obj.status === 'string';

export const isValidBackendGame = (obj: any): obj is Types.BackendGameMatch => 
  obj && 
  typeof obj === 'object' &&
  obj.player1 &&
  typeof obj.player1.id === 'number' &&
  typeof obj.startedAt === 'string';