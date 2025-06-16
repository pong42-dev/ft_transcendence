/**
 * 단순화된 타입 안전성 유틸리티
 * 인터셉터에서 변환된 데이터의 검증
 */

import * as Types from '../types/types';

// 간단한 타입 가드들
export const isUser = (obj: any): obj is Types.User => 
  obj && typeof obj.id === 'string' && typeof obj.username === 'string';

export const isFriend = (obj: any): obj is Types.Friend => 
  obj && typeof obj.username === 'string' && typeof obj.nickname === 'string';

export const isMatchHistory = (obj: any): obj is Types.MatchHistory => 
  obj && typeof obj.date === 'string' && typeof obj.opponent === 'string';

// 로그인 응답에서 사용자 추출
export const extractUserFromLoginResponse = (response: Types.LoginResponse): Types.User => {
  if (isUser(response.user)) {
    return response.user;
  }
  throw new Error('Invalid user data in login response');
};

// 간단한 변환 함수들
export const convertToUser = (data: any): Types.User => {
  if (isUser(data)) return data;
  throw new Error('Invalid user data');
};

export const convertToFriendArray = (data: any): Types.Friend[] => {
  if (Array.isArray(data) && data.every(isFriend)) return data;
  throw new Error('Invalid friend array data');
};

export const convertToMatchHistoryArray = (data: any): Types.MatchHistory[] => {
  if (Array.isArray(data) && data.every(isMatchHistory)) return data;
  throw new Error('Invalid match history data');
};

export const convertToUserArray = (data: any): Types.User[] => {
  if (Array.isArray(data) && data.every(isUser)) return data;
  throw new Error('Invalid user array data');
};

// 게임 관련 타입 가드들
export const isGame = (obj: any): obj is Types.Game => 
  obj && typeof obj.id === 'string' && obj.players && Array.isArray(obj.players);

export const isGameInvite = (obj: any): obj is Types.GameInvite => 
  obj && typeof obj.id === 'string' && typeof obj.inviterId === 'string';

export const isGameStats = (obj: any): obj is Types.GameStats => 
  obj && typeof obj.totalGames === 'number' && typeof obj.gamesWon === 'number';

// 게임 관련 변환 함수들
export const convertToGame = (data: any): Types.Game => {
  if (isGame(data)) return data;
  throw new Error('Invalid game data');
};

export const convertToGameArray = (data: any): Types.Game[] => {
  if (Array.isArray(data) && data.every(isGame)) return data;
  throw new Error('Invalid game array data');
};

export const convertToGameInviteArray = (data: any): Types.GameInvite[] => {
  if (Array.isArray(data) && data.every(isGameInvite)) return data;
  throw new Error('Invalid game invite array data');
};

export const convertToGameStats = (data: any): Types.GameStats => {
  if (isGameStats(data)) return data;
  throw new Error('Invalid game stats data');
};

// API 응답 안전성 검증
export const validateApiResponse = <T>(data: any, validator: (obj: any) => obj is T): T => {
  if (validator(data)) return data;
  throw new Error(`Invalid API response data: ${JSON.stringify(data)}`);
};

// 안전한 JSON 파싱
export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};
