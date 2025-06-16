import { BaseApiService } from './BaseApiService';
import { convertToUser, convertToUserArray } from '../utils/TypeSafetyUtils';
import * as Types from '../../types/types';

export class UserApiService extends BaseApiService {
  constructor() {
    super(undefined, 'UserApi');
  }

  // 현재 사용자 프로필 조회
  async getProfile(): Promise<Types.User> {
    const userData = await this.get<Types.User>('/users/profile');
    return convertToUser(userData);
  }

  // 프로필 업데이트
  async updateProfile(data: Types.UpdateProfileData): Promise<Types.User> {
    const userData = await this.put<Types.User>('/users/profile', data);
    return convertToUser(userData);
  }

  // 아바타 업로드
  async uploadAvatar(file: File): Promise<Types.User> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const userData = await this.post<Types.User>('/users/avatar', formData, { isFormData: true });
    return convertToUser(userData);
  }

  // 사용자 검색
  async searchUsers(query: string): Promise<Types.User[]> {
    const usersData = await this.get<Types.User[]>(`/users/search?query=${encodeURIComponent(query)}`);
    return convertToUserArray(usersData);
  }

  // ID로 사용자 조회
  async getUserById(id: string): Promise<Types.User> {
    const userData = await this.get<Types.User>(`/users/${id}`);
    return convertToUser(userData);
  }

  // 사용자 이름으로 조회 (기존 AuthApiService에서 이동)
  async getUserByUsername(username: string): Promise<Types.User> {
    const userData = await this.get<Types.User>(`/users/${username}`);
    return convertToUser(userData);
  }
}
