import { BaseApiService } from './BaseApiService';
import { ErrorLevel } from '../../utils/ErrorHandler';
import * as Types from '../../types/types';

export class FriendApiService extends BaseApiService {
  constructor() {
    super(undefined, 'FriendApiService');
  }

  // 친구 목록 조회 - /api/users/me/friends
  async getFriends(): Promise<Array<Types.Friend & { user_id: number }>> {
    try {
      const response = await this.get<{
        success: boolean;
        msg: string;
        data: {
          friends: Array<{
            user_id: number;
            name: string;
            avatar: string | null;
            status?: boolean;
          }>;
        };
      }>('/api/users/me/friends');
      
      // 응답 검증
      if (!response.success || !response.data?.friends) {
        throw new Error(response.msg || 'Invalid response format');
      }
      
      // Friend 객체로 변환 (user_id 포함)
      return response.data.friends.map(friend => ({
        username: friend.name,
        nickname: friend.name,
        status: friend.status ? 'online' : 'offline' as 'online' | 'offline' | 'inGame',
        blocked: false,
        user_id: friend.user_id
      }));
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'FriendApiService.getFriends',
        ErrorLevel.ERROR,
        {
          component: 'FriendApiService',
          action: 'getFriends'
        }
      );
      throw error;
    }
  }

  // 현재 백엔드에 구현되지 않은 API들 (향후 구현 예정)
  
  // 친구 추가 (팔로우) - /api/users/me/friends
  async addFriend(friendName: string): Promise<void> {
    try {
      const response = await this.post<{
        success: boolean;
        msg: string;
      }>('/api/users/me/friends', {
        friend_name: friendName
      });
      
      // 응답 검증
      if (!response.success) {
        throw new Error(response.msg || 'Failed to add friend');
      }
      
      console.log('[Friend] Successfully followed user:', friendName);
    } catch (error) {
      // 클라이언트 에러(4xx)는 추가 로깅 없이 바로 던지기
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw error; // 클라이언트 에러는 정상적인 응답이므로 추가 로깅하지 않음
        }
      }
      
      // 5xx 서버 에러나 네트워크 에러만 로깅
      this.errorHandler.handleError(
        error as Error,
        'FriendApiService.addFriend',
        ErrorLevel.ERROR,
        {
          component: 'FriendApiService',
          action: 'addFriend',
          additionalData: { friendName }
        }
      );
      throw error;
    }
  }

  // 친구 삭제 (언팔로우) - /api/users/me/friends/:id
  async removeFriend(friendId: number): Promise<void> {
    try {
      const response = await this.delete<{
        success: boolean;
        msg: string;
      }>(`/api/users/me/friends/${friendId}`);
      
      // 응답 검증
      if (!response.success) {
        throw new Error(response.msg || 'Failed to remove friend');
      }
      
      console.log('[Friend] Successfully unfollowed user:', friendId);
    } catch (error) {
      // 클라이언트 에러(4xx)는 추가 로깅 없이 바로 던지기
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw error; // 클라이언트 에러는 정상적인 응답이므로 추가 로깅하지 않음
        }
      }
      
      // 5xx 서버 에러나 네트워크 에러만 로깅
      this.errorHandler.handleError(
        error as Error,
        'FriendApiService.removeFriend',
        ErrorLevel.ERROR,
        {
          component: 'FriendApiService',
          action: 'removeFriend',
          additionalData: { friendId }
        }
      );
      throw error;
    }
  }

  // 특정 친구 정보 조회 - /api/users/me/friends/:id
  async getFriendProfile(friendId: number): Promise<Types.User> {
    try {
      const response = await this.get<{
        success: boolean;
        msg: string;
        data: {
          friend: {
            user_id?: number;
            name: string;
            avatar: string | null;
          };
        };
      }>(`/api/users/me/friends/${friendId}`);
      
      // 응답 검증
      if (!response.success || !response.data?.friend) {
        throw new Error(response.msg || 'Invalid response format');
      }
      
      // User 객체로 변환
      return {
        id: (response.data.friend.user_id || friendId).toString(),
        username: response.data.friend.name,
        nickname: response.data.friend.name,
        avatarUrl: response.data.friend.avatar || undefined,
        twoFactorEnabled: false,
        gamesPlayed: 0,
        gamesWon: 0,
        friends: [],
        matchHistory: []
      };
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'FriendApiService.getFriendProfile',
        ErrorLevel.ERROR,
        {
          component: 'FriendApiService',
          action: 'getFriendProfile',
          additionalData: { friendId }
        }
      );
      throw error;
    }
  }

}