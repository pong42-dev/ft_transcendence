// API 클라이언트 사용을 위한 유틸리티 함수들

import { ApiClient } from '../services/ApiClient';
import { InterceptorSetup } from '../services/interceptors/InterceptorSetup';
import { CacheConfig } from '../types/types';

// 싱글톤 API 클라이언트 인스턴스
let apiClientInstance: ApiClient | null = null;

export function getApiClient(options?: {
  showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
  environment?: 'development' | 'production' | 'test';
}): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient(options);
  }
  return apiClientInstance;
}

// 캐시 설정 헬퍼
export const createCacheConfig = (ttl: number = 300000, enabled: boolean = true): CacheConfig => ({
  enabled,
  ttl
});

// 자주 사용되는 캐시 설정들
export const CACHE_CONFIGS = {
  SHORT: createCacheConfig(60000),    // 1분
  MEDIUM: createCacheConfig(300000),  // 5분
  LONG: createCacheConfig(900000),    // 15분
  VERY_LONG: createCacheConfig(3600000), // 1시간
  DISABLED: createCacheConfig(0, false)
};

/**
 * API 클라이언트 초기화 헬퍼 (통합 인터셉터 시스템 사용)
 */
export function initializeApiClient(options?: {
  showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
  environment?: 'development' | 'production' | 'test';
}): ApiClient {
  // 기존 인스턴스가 있으면 재설정
  if (apiClientInstance) {
    InterceptorSetup.reset();
    apiClientInstance = null;
  }
  
  return getApiClient(options);
}

/**
 * 런타임에 커스텀 인터셉터 추가
 */
export function addGlobalInterceptor(
  name: string,
  interceptor: any,
  type: 'request' | 'response'
): void {
  InterceptorSetup.addCustomInterceptor(name, interceptor, type);
}

/**
 * 인터셉터 제거
 */
export function removeGlobalInterceptor(name: string): void {
  InterceptorSetup.removeInterceptor(name);
}

/**
 * 현재 등록된 인터셉터 목록 조회
 */
export function getRegisteredInterceptors(): string[] {
  return InterceptorSetup.getRegisteredInterceptors();
}

/**
 * 개발용: 인터셉터 시스템 상태 출력
 */
export function debugInterceptorSystem(): void {
  console.group('🔧 Interceptor System Status');
  console.log('Registered interceptors:', getRegisteredInterceptors());
  console.log('API Client instance:', !!apiClientInstance);
  console.groupEnd();
}
