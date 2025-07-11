import { ApiClient } from '../services/ApiClient.js';
import { Terminal } from '../components/Terminal.js';
import { ErrorHandler, ErrorLevel } from '../utils/ErrorHandler.js';
import { User } from '../types/types.js';
import { authStore } from '../store/index.js';
import { UserStateCache } from '../services/UserStateCache.js';
import i18next from 'i18next';

export class UserProfileManager {
  private pendingAvatarFile: File | null = null;

  constructor(
    private apiClient: ApiClient,
    private terminal: Terminal,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * 펜딩 아바타 파일 설정
   */
  setPendingAvatarFile(file: File): void {
    this.pendingAvatarFile = file;
  }

  /**
   * 펜딩 아바타 업로드 처리 (로그인 후 자동 실행)
   */
  async handlePendingAvatarUpload(): Promise<void> {
    if (this.pendingAvatarFile) {
      try {
        this.terminal.appendOutput(i18next.t('userProfile.uploadingProfilePicture'));
        await this.apiClient.user.uploadAvatar(this.pendingAvatarFile);
        this.terminal.appendOutput(i18next.t('userProfile.profilePictureUploadedSuccessfully'));
        this.pendingAvatarFile = null;
        
        // 아바타 업로드 후 사용자 정보 재로드
        try {
          const updatedUser = await this.apiClient.auth.verifyToken();
          authStore.login(updatedUser);
          UserStateCache.cache(updatedUser);
          console.log(i18next.t('userProfile.userProfileUpdatedWithNewAvatar'));
        } catch (error) {
          console.error(i18next.t('userProfile.failedToRefreshUserProfileAfterAvatarUpload'), error);
        }
      } catch (error) {
        console.error(i18next.t('userProfile.avatarUploadFailed'), error);
        this.terminal.appendOutput(i18next.t('userProfile.failedToUploadProfilePictureTryAgain'));
        this.pendingAvatarFile = null;
      }
    }
  }

  /**
   * 아바타 업로드 처리 (직접 업로드)
   */
  async handleAvatarUpload(file: File, resolve: () => void, reject: (error: any) => void, uiRenderer?: any): Promise<void> {
    try {
      this.terminal.appendOutput(i18next.t('userProfile.uploadingAvatar'));
      
      const updatedUser = await this.apiClient.user.uploadAvatar(file);
      authStore.updateUser(updatedUser);
      UserStateCache.cache(updatedUser);
      
      // UIRenderer가 있으면 프로필 새로고침
      if (uiRenderer && uiRenderer.getUserProfile()) {
        uiRenderer.refreshUserProfile(updatedUser);
      }
      
      this.terminal.appendOutput(i18next.t('userProfile.avatarUpdatedSuccessfully'));
      resolve();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : i18next.t('userProfile.failedToUploadAvatar');
      this.terminal.appendOutput(i18next.t('userProfile.avatarUploadFailedWithMessage', { message: errorMsg }));
      this.errorHandler.handleError(error as Error, 'UserProfileManager.handleAvatarUpload', ErrorLevel.ERROR);
      reject(error);
    }
  }

  /**
   * 사용자 상태 업데이트 (CommandHandler에서 호출)
   */
  updateUserState(user: User): void {
    authStore.updateUser(user);
    UserStateCache.cache(user);
  }

  /**
   * 펜딩 아바타 파일 확인
   */
  hasPendingAvatar(): boolean {
    return this.pendingAvatarFile !== null;
  }

  /**
   * 펜딩 아바타 파일 클리어
   */
  clearPendingAvatar(): void {
    this.pendingAvatarFile = null;
  }
}