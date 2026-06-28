declare namespace NodeJS {
  interface ProcessEnv {
    SUREPASS_ENVIRONMENT?: 'sandbox' | 'production';
    SUREPASS_TIMEOUT_MS?: string;
    SUREPASS_SANDBOX_BASE_URL?: string;
    SUREPASS_SANDBOX_TOKEN?: string;
    SUREPASS_PRODUCTION_BASE_URL?: string;
    SUREPASS_PRODUCTION_TOKEN?: string;
  }
}
