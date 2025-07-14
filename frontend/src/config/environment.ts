// 환경별 설정
export interface Config {
  apiUrl: string;
  wsUrl: string;
  useMockData: boolean;
  enableLogging: boolean;
}

// 빌드 시점에 생성된 환경변수 - 기본값 설정
let envConfig: { [key: string]: string } = {
  API_URL: 'https://localhost:8443',
  WS_URL: 'wss://localhost:8443',
  USE_MOCK_DATA: 'false',
  ENABLE_LOGGING: 'true',
  MODE: 'development'
};

// env-config.js가 존재하면 import (빌드 시점에 생성됨)
try {
  // @ts-ignore
  if (typeof ENV_CONFIG !== 'undefined') {
    // @ts-ignore
    envConfig = ENV_CONFIG;
  }
} catch (e) {
  console.log('Using default environment config');
}

const getEnvVar = (key: string, fallback?: string): string => {
  // 빌드 시점에 주입된 환경변수 사용
  const envVars: { [key: string]: string } = {
    'API_URL': envConfig.API_URL || 'https://localhost:8443',
    'WS_URL': envConfig.WS_URL || 'wss://localhost:8443',
    'USE_MOCK_DATA': envConfig.USE_MOCK_DATA || 'false',
    'ENABLE_LOGGING': envConfig.ENABLE_LOGGING || 'true',
    'MODE': envConfig.MODE || 'development'
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
    apiUrl: getEnvVar('API_URL', 'https://localhost:8443'),
    wsUrl: getEnvVar('WS_URL', 'wss://localhost:8443'),
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
