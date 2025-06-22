import { BaseApiService } from './BaseApiService';
import { ErrorLevel } from '../../utils/ErrorHandler';
import * as Types from '../../types/types';

export class FriendApiService extends BaseApiService {
  constructor() {
    super(undefined, 'FriendApiService');
  }

  // 친구 목록 조회 - /api/users/me/friends
  async getFriends(): Promise<Array<Types.Friend & { user_id: number }>> {
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
    
    // Friend 객체로 변환 (user_id 포함)
    return response.data.friends.map(friend => ({
      username: friend.name,
      nickname: friend.name,
      status: friend.status ? 'online' : 'offline' as 'online' | 'offline' | 'in-game',
      blocked: false,
      user_id: friend.user_id
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
  async removeFriend(friendId: number): Promise<void> {
    await this.delete<{
      success: boolean;
      msg: string;
    }>(`/api/users/me/friends/${friendId}`);
  }

  // 특정 친구 정보 조회 - /api/users/me/friends/:id
  async getFriendProfile(friendId: number): Promise<Types.User> {
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
      id: friendId.toString(),
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

}