/**
 * xFloor Application Configuration
 *
 * Tokens and app identifiers are resolved at runtime:
 * 1) Vite environment variables (if provided)
 * 2) localStorage values written by the credentials form
 */

const getEnvValue = (key) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const getStorageValue = (key) => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key)?.trim() || '';
};

export const APP_CONFIG = {
  /**
   * Bearer Token for API authentication
   * Source priority: VITE_XFLOOR_BEARER_TOKEN -> xfloor_token (localStorage)
   */
  get BEARER_TOKEN() {
    return getEnvValue('VITE_XFLOOR_BEARER_TOKEN') || getStorageValue('xfloor_token');
  },

  /**
   * Application ID
   * Source priority: VITE_XFLOOR_APP_ID -> xfloor_app_id (localStorage)
   */
  get APP_ID() {
    return getEnvValue('VITE_XFLOOR_APP_ID') || getStorageValue('xfloor_app_id');
  },

  /**
   * API Base URL
   * Default production URL for xFloor services
   */
  API_BASE_URL: getEnvValue('VITE_XFLOOR_API_BASE_URL') || 'https://appfloor.in',
};

/**
 * Validation function to check static configuration
 */
export const validateConfig = () => {
  const errors = [];

  if (!APP_CONFIG.API_BASE_URL) {
    errors.push('API_BASE_URL is not configured');
  }

  return errors;
};
