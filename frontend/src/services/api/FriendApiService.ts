import { BaseApiService, ApiError } from './BaseApiService';
import * as Types from '../../types/types';

export class FriendApiService extends BaseApiService {
  constructor() {
    super(undefined, 'FriendApiService');
  }

  // 친구 목록 조회 - /api/users/me/friends
  async getFriends(): Promise<Types.Friend[]> {
    const response = await this.get<{
      success: boolean;
      msg: string;
      data: {
        friends: Array<{
          user_id: number;
          name: string;
          avatar: string | null;
          status: boolean;
        }>;
      };
    }>('/api/users/me/friends');
    
    // Friend 객체로 변환
    return response.data.friends.map(friend => ({
      username: friend.name,
      nickname: friend.name,
      status: friend.status ? 'online' : 'offline' as 'online' | 'offline' | 'in-game',
      blocked: false
    }));
  }

  // 현재 백엔드에 구현되지 않은 API들 (향후 구현 예정)
  
  // 친구 추가 (팔로우) - /api/users/me/friends
  async addFriend(friendName: string): Promise<void> {
    await this.post<{
      success: boolean;
      msg: string;
    }>('/api/users/me/friends', {
      friend_name: friendName
    });
  }

  // 친구 삭제 (언팔로우) - /api/users/me/friends/:id
  async removeFriend(friendId: string): Promise<void> {
    await this.delete<{
      success: boolean;
      msg: string;
    }>(`/api/users/me/friends/${friendId}`);
  }

  // 특정 친구 정보 조회 - /api/users/me/friends/:id
  async getFriendProfile(friendId: string): Promise<Types.User> {
    const response = await this.get<{
      success: boolean;
      msg: string;
      data: {
        friend: {
          name: string;
          avatar: string | null;
        };
      };
    }>(`/api/users/me/friends/${friendId}`);
    
    // User 객체로 변환
    return {
      id: friendId,
      username: response.data.friend.name,
      nickname: response.data.friend.name,
      avatarUrl: response.data.friend.avatar || undefined,
      twoFactorEnabled: false,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
  }

  // 아래 API들은 현재 백엔드에 구현되지 않음 (향후 구현 예정)
  
  // 친구 차단 (백엔드 미구현)
  async blockFriend(username: string): Promise<void> {
    throw new ApiError(501, 'Not Implemented', { message: 'Block friend not implemented in backend' });
  }

  // 친구 차단 해제 (백엔드 미구현)
  async unblockFriend(username: string): Promise<void> {
    throw new ApiError(501, 'Not Implemented', { message: 'Unblock friend not implemented in backend' });
  }

  // 친구 요청 목록 조회 (백엔드 미구현 - 현재는 즉시 팔로우 방식)
  async getFriendRequests(): Promise<Types.Friend[]> {
    throw new ApiError(501, 'Not Implemented', { message: 'Friend requests not implemented - using direct follow system' });
  }

  // 친구 요청 응답 (백엔드 미구현 - 현재는 즉시 팔로우 방식)
  async respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
    throw new ApiError(501, 'Not Implemented', { message: 'Friend request response not implemented - using direct follow system' });
  }

  // 친구 온라인 상태 조회 (백엔드 미구현)
  async getFriendsStatus(): Promise<{ [username: string]: 'online' | 'offline' | 'in-game' }> {
    throw new ApiError(501, 'Not Implemented', { message: 'Friends status not implemented in backend' });
  }

  // 특정 친구 상태 조회 (백엔드 미구현)
  async getFriendStatus(username: string): Promise<'online' | 'offline' | 'in-game'> {
    throw new ApiError(501, 'Not Implemented', { message: 'Friend status not implemented in backend' });
  }

  // 차단된 사용자 목록 조회 (백엔드 미구현)
  async getBlockedUsers(): Promise<Types.Friend[]> {
    throw new ApiError(501, 'Not Implemented', { message: 'Blocked users not implemented in backend' });
  }
}