import { BaseApiService } from './BaseApiService';
import { ErrorLevel } from '../../utils/ErrorHandler';
import * as Types from '../../types/types';

export class UserApiService extends BaseApiService {
  constructor() {
    super(undefined, 'UserApiService');
  }

  // 현재 사용자 프로필 조회 - /api/users/me
  async getProfile(): Promise<Types.User> {
    const response = await this.get<{
      success: boolean;
      msg: string;
      data: {
        me: {
          name: string;
          avatar: string | null;
        };
      };
    }>('/api/users/me');
    
    // User 객체로 변환
    const user: Types.User = {
      id: '0', // API에서 제공하지 않으므로 기본값
      username: response.data.me.name,
      nickname: response.data.me.name,
      avatarUrl: response.data.me.avatar || undefined,
      twoFactorEnabled: false,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
  }

  // 닉네임 변경 - /api/users/me/name
  async updateNickname(nickname: string): Promise<Types.User> {
    await this.patch<{
      success: boolean;
      msg: string;
    }>('/api/users/me/name', { name: nickname });
    
    // 업데이트 후 최신 프로필 조회
    return await this.getProfile();
  }

  // 아바타 업로드 - /api/users/me/avatar
  async uploadAvatar(file: File): Promise<Types.User> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    // BaseApiService의 put 메소드 사용 (mock 지원)
    await this.put<{
      success: boolean;
      msg: string;
    }>('/api/users/me/avatar', formData, true); // isFormData = true
    
    // 업데이트 후 최신 프로필 조회
    return await this.getProfile();
  }

}
