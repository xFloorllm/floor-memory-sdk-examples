/**
 * xFloor Application Configuration
 *
 * Configure these values before running the app.
 */
export const APP_CONFIG = {
  /**
   * Bearer token used for API authentication.
   * You can also provide this at runtime from the credentials screen.
   */
  BEARER_TOKEN: '',

  /**
   * 13-digit app ID from xFloor developer registration.
   */
  APP_ID: '1767241752233',

  /**
   * Base URL for xFloor APIs.
   */
  API_BASE_URL: 'https://appfloor.in',
};

export const validateConfig = (): string[] => {
  const errors: string[] = [];

  if (!APP_CONFIG.BEARER_TOKEN && !localStorage.getItem('xfloor_token')) {
    errors.push('BEARER_TOKEN is not configured in src/config/appConfig.ts');
  }

  if (!APP_CONFIG.APP_ID && !localStorage.getItem('xfloor_app_id')) {
    errors.push('APP_ID is not configured in src/config/appConfig.ts');
  }

  return errors;
};
