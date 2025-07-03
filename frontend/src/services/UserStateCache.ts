import { User } from '../types/types.js';

export interface CacheData {
  user: User;
  timestamp: number;
  version: string;
}

export class UserStateCache {
  private static readonly CACHE_KEY = 'user_state_cache';
  private static readonly CACHE_VERSION = '1.1';
  private static readonly MAX_AGE = 60 * 60 * 1000; // 1 hour

  /**
   * 사용자 상태를 로컬 스토리지에 캐시 (2FA 상태 동기화 포함)
   */
  static cache(user: User): void {
    try {
      const cacheData: CacheData = {
        user,
        timestamp: Date.now(),
        version: UserStateCache.CACHE_VERSION
      };
      localStorage.setItem(UserStateCache.CACHE_KEY, JSON.stringify(cacheData));
      
      console.log('💾 User state cached successfully:', user.username, '2FA:', user.twoFactorEnabled);
    } catch (error) {
      console.warn('❌ Failed to cache user state:', error);
    }
  }

  /**
   * 캐시된 사용자 상태 복원 (2FA 상태 동기화 포함)
   */
  static restore(): User | null {
    try {
      const cached = localStorage.getItem(UserStateCache.CACHE_KEY);
      if (!cached) {
        return null;
      }
      
      const { user, timestamp }: CacheData = JSON.parse(cached);
      
      // 캐시 만료 확인
      const age = Date.now() - timestamp;
      if (age > UserStateCache.MAX_AGE) {
        console.log('⏰ Cached user state expired');
        UserStateCache.clear();
        return null;
      }
      
      console.log('📱 Restored cached user state:', user.username, '2FA:', user.twoFactorEnabled);
      return user;
    } catch (error) {
      console.warn('❌ Failed to restore cached user state:', error);
      return null;
    }
  }

  /**
   * 사용자 상태 캐시 클리어
   */
  static clear(): void {
    try {
      localStorage.removeItem(UserStateCache.CACHE_KEY);
      console.log('🗑️ User state cache cleared');
    } catch (error) {
      console.warn('❌ Failed to clear user state cache:', error);
    }
  }

  /**
   * 캐시된 데이터가 있는지 확인
   */
  static hasCache(): boolean {
    return localStorage.getItem(UserStateCache.CACHE_KEY) !== null;
  }

  /**
   * 캐시 버전 확인
   */
  static getCacheVersion(): string | null {
    try {
      const cached = localStorage.getItem(UserStateCache.CACHE_KEY);
      if (!cached) {
        return null;
      }
      
      const { version }: CacheData = JSON.parse(cached);
      return version;
    } catch (error) {
      console.warn('❌ Failed to get cache version:', error);
      return null;
    }
  }

  /**
   * 캐시 만료 시간 확인 (남은 시간을 ms로 반환)
   */
  static getTimeUntilExpiry(): number | null {
    try {
      const cached = localStorage.getItem(UserStateCache.CACHE_KEY);
      if (!cached) {
        return null;
      }
      
      const { timestamp }: CacheData = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const remaining = UserStateCache.MAX_AGE - age;
      
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.warn('❌ Failed to get cache expiry time:', error);
      return null;
    }
  }
}