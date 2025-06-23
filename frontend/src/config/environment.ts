// 환경별 설정
export interface Config {
  apiUrl: string;
  wsUrl: string;
  useMockData: boolean;
  enableLogging: boolean;
}

const getEnvVar = (key: string, fallback?: string): string => {
  // Vite 사용 시 - 타입 안전한 방식으로 접근
  const viteKey = `VITE_${key}` as keyof ImportMetaEnv;
  return import.meta.env[viteKey] || fallback || '';
  
  // Vite 제거 후 (Node.js 환경)
  // return process.env[key] || fallback || '';
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
  // Vite 사용 시 - getEnvVar를 통해 MODE 읽기
  const env = getEnvVar('MODE', 'development');
  
  // Vite 제거 후 (Node.js 환경)
  // const env = process.env.NODE_ENV || 'development';
  
  const config = getConfigByEnv(env);
  
  // 디버깅을 위한 환경 변수 로깅 (항상 표시)
  console.group('🔧 Environment Configuration Debug');
  console.log('Environment:', env);
  console.log('Final Config:', config);
  console.log('All import.meta.env:', import.meta.env);
  console.log('Specific checks:');
  console.log('  import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  import.meta.env.VITE_USE_MOCK_DATA:', import.meta.env.VITE_USE_MOCK_DATA);
  console.log('  import.meta.env.VITE_MODE:', import.meta.env.VITE_MODE);
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
