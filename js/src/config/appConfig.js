/**
 * xFloor Application Configuration
 *
 * IMPORTANT: Developers must configure these values before running the app
 */

export const APP_CONFIG = {
  /**
   * Bearer Token for API authentication
   * Get this token from your xFloor dashboard or authentication flow
   * Format: Your actual token string (without "Bearer " prefix)
   */
  // BEARER_TOKEN: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMzUzMDY2MTEwMzI3Iiwicm9sZSI6InVzZXIiLCJ0b2tlbl9uYW1lIjoiU2FtcGxlIFRva2VuIiwiZXhwIjoxNzc2OTMxODMyfQ.V8UYem-BP5kzhkLwgXFHe_vCksKD0A0WBi6zwTx3xCEbQCF8B5AhYTZQnz9_-Erc6QcbtTWNB7te3d9u__k_fOJErmeadElYuVkYCl6guKN_ubw9fz6sJeAnAwN52KThskYbzvCbydpDto5I-Vw_th5qd2hSEhoDKRnx2qBrOtupvtuxW6p703CDUdRNophoqqhN8HcgAbJSYoQos_5skW7qvqOQTplojHW01REzlUHzBNjHuovkES-oHtSDISxAhS22ZqMFRV6PInWD_YEGLxkjdILZVFnUlfGh_ax4onvwzvkfIYWTVNgsc1v2T53hs70RDbCO-Ncdt3fJdyo59Y3BbtUC4n92KtKtqSTRBjXLpP3TVjKZEhZh1SK2OuYK6AlQ-6qBCzB-q_LzpWyTulwCMP7533mJ82bCcxlFQ2yPjNkQ2IwhhvTChjTs2TNwXNr7gPmbI1BFX-4-nOJb_p7bGGlhxC7PzXQpMtjDPb-6tM43xEw39XhF0OKJT_hNy_N1JBKJChMPkt8fUhB4FkZ3Lb9UpIljY_Ur-PmaHc6Cgeo9k6_VpLktfgtdSMGjva95degGoxI25qalJhiYCZYKjWb5aCuNW3mZb2_E9kBEGx8yLuFE-yaQ78QTWhlca8Wke-bqw0af9SQebYyEUO9oRkiR1LP3nKE4PmououQ',
    BEARER_TOKEN:'',
  /**
   * Application ID
   * This is a 13-digit numeric value provided when you register as a developer
   * Used to associate users and API calls with your application
   */
  APP_ID: '1767241752233',

  /**
   * API Base URL
   * Default production URL for xFloor services
   */
  API_BASE_URL: 'https://appfloor.in',
};

/**
 * Validation function to check if configuration is set
 */
export const validateConfig = () => {
  const errors = [];

  if (!APP_CONFIG.BEARER_TOKEN || APP_CONFIG.BEARER_TOKEN === 'YOUR_BEARER_TOKEN_HERE') {
    errors.push('BEARER_TOKEN is not configured in src/config/appConfig.js');
  }

  if (!APP_CONFIG.APP_ID || APP_CONFIG.APP_ID === 'YOUR_APP_ID_HERE') {
    errors.push('APP_ID is not configured in src/config/appConfig.js');
  }

  return errors;
};
