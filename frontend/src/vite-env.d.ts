/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODE: string;
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_ENABLE_LOGGING: string;
  readonly VITE_PRODUCTION_API_URL: string;
  readonly VITE_PRODUCTION_WS_URL: string;
  readonly VITE_PRODUCTION_USE_MOCK_DATA: string;
  readonly VITE_PRODUCTION_ENABLE_LOGGING: string;
  readonly VITE_TEST_API_URL: string;
  readonly VITE_TEST_WS_URL: string;
  readonly VITE_TEST_USE_MOCK_DATA: string;
  readonly VITE_TEST_ENABLE_LOGGING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
