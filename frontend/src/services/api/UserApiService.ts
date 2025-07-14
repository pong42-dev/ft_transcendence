import { BaseApiService } from './BaseApiService.js';
import * as Types from '../../types/types.js';
import i18next from 'i18next';

export class UserApiService extends BaseApiService {
  constructor() {
    super(undefined, 'UserApiService');
  }

  // 현재 사용자 프로필 조회 - /api/users/me
  async getProfile(): Promise<Types.User> {
    const response = await this.get<any>('/api/users/me');
    
    // 응답 구조 검증 및 호환성 처리
    let userData: { name: string; avatar: string | null; twoFA?: boolean; email?: string; provider?: string };
    
    if (response.data?.userInfo) {
      // 새로운 API 구조: data.userInfo
      userData = response.data.userInfo;
    } else if (response.data?.me) {
      // 이전 API 구조: data.me (호환성)
      const meData = response.data.me;
      userData = {
        name: meData.name,
        avatar: meData.avatar,
        twoFA: meData.twoFactorEnabled,
        email: meData.email,
        provider: meData.provider
      };
      console.warn('[UserApi] Using legacy API structure (data.me)');
    } else {
      console.error('[UserApi] Invalid API response structure:', response);
      throw new Error(i18next.t('user.invalidApiResponseStructure'));
    }
    
    // 필수 필드 검증
    if (!userData.name) {
      console.error('[UserApi] Missing required field: name');
      throw new Error(i18next.t('user.invalidUserDataMissingName'));
    }
    
    // 게임 통계와 매치 히스토리 데이터 추출
    const gameStats = response.data?.gameStats || { totalGames: 0, totalWins: 0, winRate: 0 };
    const oneOnOneHistory = response.data?.oneOnOneHistory || [];
    const tournHistory = response.data?.tournHistory || [];
    
    // 매치 히스토리를 MatchHistory 형식으로 변환
    const matchHistory: Types.MatchHistory[] = [
      ...oneOnOneHistory.map((match: any) => ({
        date: new Date(match.endedAt).toISOString().split('T')[0],
        opponent: match.opponent.name,
        rank: match.winnerId === null ? 2 : (match.winnerId === match.opponent.id ? 2 : 1),
        type: '1v1' as const,
        myScore: match.myScore,
        opponentScore: match.opponentScore
      }))
    ];

    // 토너먼트 히스토리는 별도로 저장 (상세 정보 유지)
    const tournamentHistory = tournHistory.map((tournament: any) => ({
      tournament_id: tournament.tournament_id,
      tournament_date: tournament.tournament_date,
      participants: tournament.participants,
      rounds: tournament.rounds,
      final_rank: tournament.final_rank
    }));

    // User 객체로 변환
    const user: Types.User = {
      id: '0', // API에서 제공하지 않으므로 기본값
      username: userData.name,
      nickname: userData.name,
      email: userData.email,
      avatarUrl: userData.avatar || undefined,
      twoFactorEnabled: userData.twoFA ?? false,
      provider: userData.provider,
      gamesPlayed: gameStats.totalGames,
      gamesWon: gameStats.totalWins,
      friends: [],
      matchHistory: matchHistory,
      tournamentHistory: tournamentHistory
    };
    
    return user;
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

  // 사용자 이름 업데이트 - /api/users/me/name
  async updateName(newName: string): Promise<Types.User> {
    // BaseApiService의 patch 메소드 사용 (mock 지원)
    const response = await this.patch<{
      success: boolean;
      msg: string;
    }>('/api/users/me/name', { name: newName });
    
    // 백엔드에서 success: false를 반환하는 경우 처리
    if (response && response.success === false) {
      throw new Error(response.msg || i18next.t('user.nameUpdateFailed'));
    }
    
    // 업데이트 후 최신 프로필 조회
    return await this.getProfile();
  }

  // 사용자명으로 프로필 조회 - /api/users/me/friends (친구 목록에서만 조회)
  async getUserProfile(username: string): Promise<Types.User> {
    // 친구 목록에서 해당 사용자 찾기
    const friendsResponse = await this.get<{
      success: boolean;
      msg: string;
      data: {
        friends: Array<{
          user_id: number;
          name: string;
          avatar: string;
          status: boolean;
        }>;
      };
    }>('/api/users/me/friends');
    
    const friend = friendsResponse.data.friends.find(f => f.name === username);
    if (!friend) {
      throw new Error(i18next.t('user.userNotFoundOrNotInFriendsList', { username }));
    }
    
    // 친구 상세 프로필 조회
    const profileResponse = await this.get<{
      success: boolean;
      msg: string;
      data: {
        friendInfo: {
          name: string;
          avatar: string;
        };
        gameStats: {
          totalGames: number;
          totalWins: number;
          winRate: number;
        };
        oneOnOneHistory: any[];
        tournHistory: any[];
      };
    }>(`/api/users/me/friends/${friend.user_id}`);
    
    const profileData = profileResponse.data;
    
    // User 객체로 변환
    const user: Types.User = {
      id: friend.user_id.toString(),
      username: profileData.friendInfo.name,
      nickname: profileData.friendInfo.name,
      avatarUrl: profileData.friendInfo.avatar || undefined,
      twoFactorEnabled: false, // 다른 사용자의 2FA 정보는 노출하지 않음
      gamesPlayed: profileData.gameStats.totalGames,
      gamesWon: profileData.gameStats.totalWins,
      friends: [],
      matchHistory: []
    };
    
    return user;
  }


}
