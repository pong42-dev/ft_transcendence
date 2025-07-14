// 환경별 설정
export interface Config {
  apiUrl: string;
  wsUrl: string;
  useMockData: boolean;
  enableLogging: boolean;
}

const getEnvVar = (key: string, fallback?: string): string => {
  // 브라우저 환경에서는 window 객체를 통해 환경 변수에 접근
  // Docker 컨테이너에서 환경 변수가 주입될 예정
  const windowEnv = (window as any).__ENV__ || {};
  
  const envVars: { [key: string]: string } = {
    'API_URL': windowEnv.API_URL || 'http://localhost:3000',
    'WS_URL': windowEnv.WS_URL || 'ws://localhost:3000',
    'USE_MOCK_DATA': windowEnv.USE_MOCK_DATA || 'false',
    'ENABLE_LOGGING': windowEnv.ENABLE_LOGGING || 'true',
    'MODE': windowEnv.MODE || 'development'
  };
  
  return envVars[key] || fallback || '';
};

const getBooleanEnvVar = (key: string, fallback: boolean = false): boolean => {
  const value = getEnvVar(key);
  if (value === '') return fallback; // 환경 변수가 없으면 fallback 사용
  return value === 'true';
};

const getConfigByEnv = (env: string): Config => {
  return {
    apiUrl: getEnvVar('API_URL', 'http://localhost:3000'),
    wsUrl: getEnvVar('WS_URL', 'ws://localhost:3000'),
    useMockData: getBooleanEnvVar('USE_MOCK_DATA', false),
    enableLogging: getBooleanEnvVar('ENABLE_LOGGING', env === 'development'),
  };
};

export const getConfig = (): Config => {
  const env = getEnvVar('MODE', 'development');
  
  const config = getConfigByEnv(env);
  
  // 디버깅을 위한 환경 변수 로깅 (항상 표시)
  console.group('🔧 Environment Configuration Debug');
  console.log('Environment:', env);
  console.log('Final Config:', config);
  console.log('  getEnvVar(API_URL):', getEnvVar('API_URL'));
  console.log('  getBooleanEnvVar(USE_MOCK_DATA):', getBooleanEnvVar('USE_MOCK_DATA'));
  console.groupEnd();
  
  return config;
};

export const isDevelopment = (): boolean => {
  // Vite 사용 시 - getEnvVar를 통해 MODE 읽기
  return getEnvVar('MODE', 'development') === 'development';
  
  // Vite 제거 후 (Node.js 환경)
  // return (process.env.NODE_ENV || 'development') === 'development';
};

export const isProduction = (): boolean => {
  // Vite 사용 시 - getEnvVar를 통해 MODE 읽기
  return getEnvVar('MODE', 'development') === 'production';
  
  // Vite 제거 후 (Node.js 환경)
  // return (process.env.NODE_ENV || 'development') === 'production';
};
