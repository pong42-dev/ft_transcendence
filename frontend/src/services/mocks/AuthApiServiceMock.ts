/**
 * AuthApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

// Mock 2FA 상태 저장 (메모리에서만 유지)
let mock2FAEnabled = false;
let mockTmpTokens = new Set<string>();

// Mock Google OAuth 상태 저장
let mockGoogleOAuthCompleted = false;
let mockGoogleUser = {
  name: 'gogglechu_master',
  avatar: 'https://digi-api.com/images/digimon/w/Gabumon.png',
  email: 'gogglechu@digiworld.com'
};

// Mock QR Code 생성 함수
const generateMockQRCode = (): string => {
  // 간단한 PNG 기반 Mock QR 코드 생성 (Canvas API 사용)
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    // Canvas를 사용할 수 없는 경우 간단한 플레이스홀더 반환
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
  
  // 흰 배경
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);
  
  // 검은 패턴으로 QR 코드 모양 그리기
  ctx.fillStyle = 'black';
  
  // QR 코드의 찾기 패턴 (3개 모서리 사각형)
  // 왼쪽 상단
  ctx.fillRect(10, 10, 60, 60);
  ctx.fillStyle = 'white';
  ctx.fillRect(20, 20, 40, 40);
  ctx.fillStyle = 'black';
  ctx.fillRect(30, 30, 20, 20);
  
  // 오른쪽 상단
  ctx.fillRect(130, 10, 60, 60);
  ctx.fillStyle = 'white';
  ctx.fillRect(140, 20, 40, 40);
  ctx.fillStyle = 'black';
  ctx.fillRect(150, 30, 20, 20);
  
  // 왼쪽 하단
  ctx.fillRect(10, 130, 60, 60);
  ctx.fillStyle = 'white';
  ctx.fillRect(20, 140, 40, 40);
  ctx.fillStyle = 'black';
  ctx.fillRect(30, 150, 20, 20);
  
  // Mock 데이터 패턴들
  const patterns = [
    [90, 30], [110, 30], [90, 50], [110, 50], [90, 70], [110, 70],
    [30, 90], [50, 90], [70, 90], [90, 90], [110, 90], [130, 90], [150, 90], [170, 90],
    [90, 110], [110, 110], [130, 110], [150, 110], [170, 110]
  ];
  
  patterns.forEach(([x, y]) => {
    ctx.fillRect(x, y, 10, 10);
  });
  
  // "MOCK QR" 텍스트 추가
  ctx.fillStyle = 'gray';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MOCK 2FA QR', 100, 180);
  
  // Canvas를 data URL로 변환
  return canvas.toDataURL('image/png');
};

export const getAuthApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;
  
  // 로그인 Mock - /api/users/login/local (2FA 지원)
  if (endpoint.includes('/api/users/login/local') && method === 'POST') {
    // 2FA가 활성화된 경우
    if (mock2FAEnabled) {
      const tmpToken = 'mock_tmp_token_' + Date.now();
      mockTmpTokens.add(tmpToken);
      return {
        success: true,
        requires2FA: true,
        msg: 'Two-factor authentication is required.',
        data: {
          token: tmpToken
        }
      } as T;
    }
    
    // 일반 로그인
    return {
      success: true,
      msg: 'Successfully logged in.',
      data: {
        accessToken: 'mock_jwt_token_here'
      }
    } as T;
  }
  
  // 회원가입 Mock - /api/users/register
  if (endpoint.includes('/api/users/register') && method === 'POST') {
    return {
      msg: 'Registration completed successfully.'
    } as T;
  }
  
  // 현재 사용자 정보 Mock - /api/users/me
  if (endpoint.includes('/api/users/me') && method === 'GET') {
    // Google OAuth 사용자인지 확인
    const userData = mockGoogleOAuthCompleted ? mockGoogleUser : {
      name: 'agumon_trainer',
      avatar: 'https://digi-api.com/images/digimon/w/Agumon.png',
      email: 'agumon@digiworld.com'
    };
    
    return {
      success: true,
      msg: 'User Profile successfully retrieved.',
      data: {
        userInfo: {
          name: userData.name,
          avatar: userData.avatar,
          twoFA: mock2FAEnabled,
          email: userData.email
        }
      }
    } as T;
  }
  
  // 로그아웃 Mock - /api/users/logout
  if (endpoint.includes('/api/users/logout') && method === 'POST') {
    // OAuth 상태 초기화
    mockGoogleOAuthCompleted = false;
    // TODO: 향후 신규 사용자 상태 관리 구현 예정
    // mockIsNewGoogleUser = true; // 다음 로그인 시 신규 사용자로 처리
    
    return {
      success: true,
      msg: 'Successfully logged out'
    } as T;
  }
  
  // 토큰 갱신 Mock - /api/users/refresh-token
  if (endpoint.includes('/api/users/refresh-token') && method === 'POST') {
    return {
      success: true,
      msg: 'Token refreshed successfully.',
      data: {
        accessToken: 'new_mock_jwt_token'
      }
    } as T;
  }
  
  // 이메일 중복 확인 Mock - /api/users/check-email
  if (endpoint.includes('/api/users/check-email') && method === 'POST') {
    return {
      success: true,
      msg: '사용 가능한 이메일입니다.'
    } as T;
  }
  
  // 닉네임 중복 확인 Mock - /api/users/check-name
  if (endpoint.includes('/api/users/check-name') && method === 'POST') {
    return {
      success: true,
      msg: '사용 가능한 닉네임입니다.'
    } as T;
  }
  
  // ===== 2FA Mock Endpoints =====
  
  // 2FA 설정 초기화 Mock - /api/users/auth/2fa/enable/init
  if (endpoint.includes('/api/users/auth/2fa/enable/init') && method === 'POST') {
    if (mock2FAEnabled) {
      throw new Error('This account already has 2FA enabled. Please disable it before setting up again.');
    }
    
    const tmpToken = 'mock_2fa_setup_token_' + Date.now();
    mockTmpTokens.add(tmpToken);
    
    return {
      success: true,
      msg: 'QR code for 2FA setup has been generated.',
      data: {
        qrCodeUrl: generateMockQRCode(), // Mock QR code
        secret: 'JBSWY3DPEHPK3PXP', // Mock base32 secret
        token: tmpToken
      }
    } as T;
  }
  
  // 2FA 활성화 Mock - /api/users/auth/2fa/enable
  if (endpoint.includes('/api/users/auth/2fa/enable') && method === 'POST') {
    if (!body || !body.tmpToken || !body.token) {
      throw new Error('Invalid request: missing tmpToken or token');
    }
    
    if (!mockTmpTokens.has(body.tmpToken)) {
      throw new Error('Invalid tmp token.');
    }
    
    if (body.token !== '123456') { // Mock: only accept 123456 as valid code
      throw new Error('Invalid 2FA token.');
    }
    
    if (mock2FAEnabled) {
      throw new Error('This account already has 2FA enabled. Please disable it before setting up again.');
    }
    
    mock2FAEnabled = true;
    mockTmpTokens.delete(body.tmpToken);
    
    return {
      success: true,
      msg: '2FA has been enabled successfully.'
    } as T;
  }
  
  // 2FA 로그인 검증 Mock - /api/users/auth/2fa
  if (endpoint.includes('/api/users/auth/2fa') && method === 'POST') {
    if (!body || !body.tmpToken || !body.token) {
      throw new Error('Invalid request: missing tmpToken or token');
    }
    
    if (!mockTmpTokens.has(body.tmpToken)) {
      throw new Error('Invalid tmp token.');
    }
    
    if (!mock2FAEnabled) {
      throw new Error('2FA is not enabled.');
    }
    
    if (body.token !== '123456') { // Mock: only accept 123456 as valid code
      throw new Error('Invalid 2FA token.');
    }
    
    mockTmpTokens.delete(body.tmpToken);
    
    return {
      success: true,
      msg: 'Successfully logged in.',
      data: {
        token: 'mock_jwt_token_2fa_verified'
      }
    } as T;
  }
  
  // 2FA 비활성화 Mock - /api/users/auth/2fa/disable
  if (endpoint.includes('/api/users/auth/2fa/disable') && method === 'POST') {
    if (!body || !body.token) {
      throw new Error('Invalid request: missing token');
    }
    
    if (!mock2FAEnabled) {
      throw new Error('This account already has 2FA disabled. Please enable it before setting up again.');
    }
    
    if (body.token !== '123456') { // Mock: only accept 123456 as valid code
      throw new Error('Invalid 2FA token.');
    }
    
    mock2FAEnabled = false;
    
    return {
      success: true,
      msg: '2FA has been disabled successfully.'
    } as T;
  }
  
  // 2FA 상태 조회 Mock - /api/users/auth/2fa/status
  if (endpoint.includes('/api/users/auth/2fa/status') && method === 'GET') {
    return {
      success: true,
      msg: '2FA status retrieved successfully.',
      data: {
        enabled: mock2FAEnabled
      }
    } as T;
  }
  
  // ===== Google OAuth Mock Endpoints =====
  
  // Google OAuth 시작 Mock - /api/users/login/google
  if (endpoint.includes('/api/users/login/google') && method === 'GET') {
    // Mock: Google OAuth를 시뮬레이션하기 위해 Mock 사용자 반환
    mockGoogleOAuthCompleted = true;
    
    // Mock Google 사용자 데이터 - User 타입에 맞게 수정
    const mockUser = {
      id: 'google_mock_123',
      username: 'gogglechu_master',
      nickname: 'Gogglechu Master',
      avatarUrl: 'https://digi-api.com/images/digimon/w/Gabumon.png',
      twoFactorEnabled: false,
      gamesPlayed: 42,
      gamesWon: 28,
      friends: [],
      matchHistory: []
    };
    
    // Mock 토큰 설정 (동적 import 사용)
    import('../../services/core/TokenManager.js').then(({ TokenManager }) => {
      TokenManager.setTokens('mock_google_access_token', 'cookie-managed');
    });
    
    return mockUser as T;
  }
  
  // Google OAuth 콜백 Mock - /api/users/login/google/callback
  if (endpoint.includes('/api/users/login/google/callback') && method === 'GET') {
    // Mock: Google OAuth 콜백 처리
    return {
      success: true,
      msg: 'OAuth callback processed',
      redirect: '/' // Mock 리다이렉트
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for AuthApiService'
  } as T;
};
