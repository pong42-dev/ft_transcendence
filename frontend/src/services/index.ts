/**
 * API 서비스 레이어 메인 엔트리 포인트
 * 단순화되고 잘 구조화된 API 서비스들을 제공합니다
 */

// 메인 API 클라이언트
export { ApiClient, ApiError } from './ApiClient.js';

// 개별 API 서비스들
export { AuthApiService } from './api/AuthApiService.js';
export { FriendApiService } from './api/FriendApiService.js';
export { GameApiService } from './api/GameApiService.js';
export { UserApiService } from './api/UserApiService.js';
export { BaseApiService } from './api/BaseApiService.js';

// 핵심 유틸리티들
export { TokenManager } from './core/TokenManager.js';
export { SimpleInterceptorManager } from './core/Interceptors.js';
export { 
  transformUser, 
  transformFriend, 
  transformGame,
  transformUsers,
  transformFriends, 
  transformGames 
} from './core/DataTransformers.js';

