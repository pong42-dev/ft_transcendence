// 환경별 설정
export interface Config {
  apiUrl: string;
  wsUrl: string;
  useMockData: boolean;
  enableLogging: boolean;
}

export const config: Record<string, Config> = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    wsUrl: 'ws://localhost:3000',
    useMockData: true, // 실제 API 테스트
    enableLogging: true,
  },
  production: {
    apiUrl: 'https://your-backend-domain.com/api',
    wsUrl: 'wss://your-backend-domain.com',
    useMockData: true,
    enableLogging: false,
  },
  test: {
    apiUrl: 'http://localhost:3001/api',
    wsUrl: 'ws://localhost:3001',
    useMockData: true,
    enableLogging: false,
  }
};

export const getConfig = (): Config => {
  const env = import.meta.env.MODE || 'development';
  return config[env] || config.development;
};

export const isDevelopment = (): boolean => {
  return (import.meta.env.MODE || 'development') === 'development';
};

export const isProduction = (): boolean => {
  return (import.meta.env.MODE || 'development') === 'production';
};
