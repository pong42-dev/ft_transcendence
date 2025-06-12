import { AuthApiService } from './AuthApiService';
import { getConfig } from '../config/environment';

// 모든 API 서비스를 통합하는 클래스
export class ApiService {
  public auth: AuthApiService;
  private config = getConfig();

  constructor() {
    this.auth = new AuthApiService();
  }

  // 전체 서비스의 토큰 설정
  setToken(token: string | null): void {
    this.auth.setToken(token);
  }

  // 인증 상태 확인
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  // 현재 토큰 가져오기
  getToken(): string | null {
    return this.auth.getToken();
  }

  // Mock 데이터 사용 여부
  shouldUseMockData(): boolean {
    return this.config.useMockData;
  }
}

// 싱글톤 인스턴스 생성
export const apiService = new ApiService();
