import { BaseApiService } from './BaseApiService';
import { transformFriends } from '../core/DataTransformers';
import { convertToFriendArray } from '../../utils/TypeSafetyUtils';
import * as Types from '../../types/types';

export class FriendApiService extends BaseApiService {
  constructor() {
    super(undefined, 'FriendApi');
  }

  // 친구 목록 조회 - 인터셉터에서 자동 변환됨
  async getFriends(): Promise<Types.Friend[]> {
    const friendsData = await this.get<Types.Friend[]>('/friends');
    // 타입 안전성을 위한 변환 검증
    return convertToFriendArray(friendsData);
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

  // 친구 요청 목록 조회 - 변환된 타입으로 반환
  async getFriendRequests(): Promise<Types.Friend[]> {
    const requestsData = await this.get<Types.BackendFriend[]>('/friends/requests');
    return transformFriends(requestsData);
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