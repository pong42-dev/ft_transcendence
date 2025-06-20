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
  const envPrefix = env.toUpperCase();
  
  return {
    apiUrl: getEnvVar(`${envPrefix}_API_URL`) || getEnvVar('API_URL', 'http://localhost:3000/api'),
    wsUrl: getEnvVar(`${envPrefix}_WS_URL`) || getEnvVar('WS_URL', 'ws://localhost:3000'),
    useMockData: getBooleanEnvVar(`${envPrefix}_USE_MOCK_DATA`, env === 'development') || getBooleanEnvVar('USE_MOCK_DATA', env === 'development'),
    enableLogging: getBooleanEnvVar(`${envPrefix}_ENABLE_LOGGING`, env === 'development') || getBooleanEnvVar('ENABLE_LOGGING', env === 'development'),
  };
};

export const getConfig = (): Config => {
  // Vite 사용 시 - getEnvVar를 통해 MODE 읽기
  const env = getEnvVar('MODE', 'development');
  
  // Vite 제거 후 (Node.js 환경)
  // const env = process.env.NODE_ENV || 'development';
  
  return getConfigByEnv(env);
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
