import { BaseApiService } from './BaseApiService';
import * as Types from '../types/types';

export class FriendApiService extends BaseApiService {
  constructor() {
    super();
  }

  // Mock 응답 생성 (BaseApiService의 추상 메서드 구현)
  protected async getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Mock 데이터 시뮬레이션을 위한 지연
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    const method = options.method || 'GET';
    
    // Mock 응답 생성 로직
    if (endpoint.includes('/friends') && method === 'GET') {
      return [
        {
          id: 1,
          user: {
            id: 2,
            username: 'friend1',
            nickname: 'Friend One',
            avatarUrl: ''
          },
          status: 'accepted',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 2,
          user: {
            id: 3,
            username: 'friend2',
            nickname: 'Friend Two',
            avatarUrl: ''
          },
          status: 'accepted',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ] as T;
    }
    
    if (endpoint.includes('/friends') && method === 'POST') {
      return {
        success: true,
        message: 'Friend request sent'
      } as T;
    }
    
    if (endpoint.includes('/friends/') && method === 'DELETE') {
      return {
        success: true,
        message: 'Friend removed'
      } as T;
    }
    
    if (endpoint.includes('/friends/') && endpoint.includes('/block')) {
      return {
        success: true,
        message: 'Friend blocked'
      } as T;
    }
    
    if (endpoint.includes('/friends/') && endpoint.includes('/unblock')) {
      return {
        success: true,
        message: 'Friend unblocked'
      } as T;
    }

    if (endpoint.includes('/friends/requests')) {
      return [
        {
          id: 10,
          user: {
            id: 5,
            username: 'requester1',
            nickname: 'Requester One',
            avatarUrl: ''
          },
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ] as T;
    }

    // 기본 성공 응답
    return { success: true } as T;
  }

  // 친구 목록 조회
  async getFriends(): Promise<Types.Friend[]> {
    const friends = await this.get<Types.BackendFriend[]>('/friends');
    return friends.map((f: Types.BackendFriend) => ({
      username: f.user.username,
      nickname: f.user.nickname || f.user.username,
      status: 'offline' as 'online' | 'offline' | 'in-game',
      blocked: f.status === 'blocked'
    }));
  }

  // 친구 요청 보내기
  async addFriend(username: string): Promise<void> {
    await this.post('/friends', { username });
  }

  // 친구 삭제
  async removeFriend(username: string): Promise<void> {
    await this.delete(`/friends/${username}`);
  }

  // 친구 차단
  async blockFriend(username: string): Promise<void> {
    await this.put(`/friends/${username}/block`, {});
  }

  // 친구 차단 해제
  async unblockFriend(username: string): Promise<void> {
    await this.put(`/friends/${username}/unblock`, {});
  }

  // 친구 요청 목록 조회
  async getFriendRequests(): Promise<Types.BackendFriend[]> {
    return this.get('/friends/requests');
  }

  // 친구 요청 응답 (수락/거절)
  async respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
    await this.post(`/friends/requests/${requestId}/respond`, { accept });
  }

  // 친구 온라인 상태 조회
  async getFriendsStatus(): Promise<{ [username: string]: 'online' | 'offline' | 'in-game' }> {
    return this.get('/friends/status');
  }

  // 특정 친구 상태 조회
  async getFriendStatus(username: string): Promise<'online' | 'offline' | 'in-game'> {
    const result = await this.get<{ status: 'online' | 'offline' | 'in-game' }>(`/friends/${username}/status`);
    return result.status;
  }

  // 차단된 사용자 목록 조회
  async getBlockedUsers(): Promise<Types.Friend[]> {
    const blocked = await this.get<Types.BackendFriend[]>('/friends/blocked');
    return blocked.map((f: Types.BackendFriend) => ({
      username: f.user.username,
      nickname: f.user.nickname || f.user.username,
      status: 'offline' as 'online' | 'offline' | 'in-game',
      blocked: true
    }));
  }
}