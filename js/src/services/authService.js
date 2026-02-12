import { APP_CONFIG } from '../config/appConfig';
import { getEditFloorApi, getFloorInfoApi } from '../config/memoryClient';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

/**
 * Get Bearer token - uses the token configured in appConfig.js
 */
const getBearerToken = () => {
  // Use the token from app config (set by developer)
  return APP_CONFIG.BEARER_TOKEN !== 'YOUR_BEARER_TOKEN_HERE' ? APP_CONFIG.BEARER_TOKEN : localStorage.getItem('xfloor_token');
};

/**
 * Get App ID - checks localStorage first, then falls back to appConfig.js
 */
const getAppId = () => {
  // Check localStorage first (from credentials input)
  const storedAppId = localStorage.getItem('xfloor_app_id');
  if (storedAppId) {
    return storedAppId;
  }
  // Fall back to config
  return APP_CONFIG.APP_ID !== 'YOUR_APP_ID_HERE' ? APP_CONFIG.APP_ID : null;
};

export const authService = {
  /**
   * Sign up a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email_id - Email address (optional if mobile provided)
   * @param {string} userData.mobile_number - Mobile number (optional if email provided)
   * @param {string} userData.password - User password
   * @param {string} userData.app_id - Application ID
   * @returns {Promise<Object>} Response with user_id and success message
   */
  async signUp(userData) {
    const formData = new FormData();
    formData.append('name', userData.name);
    if (userData.email_id) formData.append('email_id', userData.email_id);
    if (userData.mobile_number) formData.append('mobile_number', userData.mobile_number);
    formData.append('password', userData.password);

    // Use app_id from config or provided userData
    const appId = userData.app_id || getAppId();
    if (appId) formData.append('app_id', appId);

    const response = await fetch(`${API_BASE_URL}/auth-service/sign/up`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getBearerToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sign up failed');
    }

    const data = await response.json();

    // Extract token from response headers if present
    const token = response.headers.get('Authorization') || response.headers.get('authorization');
    if (token) {
      localStorage.setItem('xfloor_token', token.replace('Bearer ', ''));
    }

    return data;
  },

  /**
   * Sign in with email
   * @param {Object} credentials
   * @param {string} credentials.email_id - Email address
   * @param {string} credentials.pass_code - Password or validation code
   * @param {string} credentials.login_type - "1" for password, "2" for OTP
   * @param {string} credentials.app_id - Application ID
   * @returns {Promise<Object>} Response with pod_info and profile
   */
  async signInWithEmail(credentials) {
    const formData = new FormData();
    formData.append('email_id', credentials.email_id);
    formData.append('pass_code', credentials.pass_code);
    formData.append('login_type', credentials.login_type);

    // Use app_id from config or provided credentials
    const appId = credentials.app_id || getAppId();
    if (appId) formData.append('app_id', appId);

    const response = await fetch(`${API_BASE_URL}/auth-service/sign/in/with/email`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getBearerToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sign in failed');
    }

    const data = await response.json();

    console.log('Sign in with email - 200 response:', data);

    // Extract and store token from response headers
    const token = response.headers.get('Authorization') ||
                  response.headers.get('authorization') ||
                  data.token ||
                  data.access_token;

    if (token) {
      const cleanToken = token.replace('Bearer ', '');
      localStorage.setItem('xfloor_token', cleanToken);
    }

    // Store user data
    if (data.profile?.user_id) {
      localStorage.setItem('xfloor_user_id', data.profile.user_id);
    }
    if (data.pod_info?.floor_id) {
      localStorage.setItem('xfloor_floor_id', data.pod_info.floor_id);
    }
    if (data.pod_info) {
      localStorage.setItem('xfloor_pod_info', JSON.stringify(data.pod_info));
    }
    if (data.profile) {
      localStorage.setItem('xfloor_profile', JSON.stringify(data.profile));
    }

    return data;
  },

  /**
   * Sign in with mobile number
   * @param {Object} credentials
   * @param {string} credentials.mobile_number - Mobile number
   * @param {string} credentials.pass_code - Password or validation code
   * @param {string} credentials.login_type - "1" for password, "2" for OTP
   * @param {string} credentials.app_id - Application ID
   * @returns {Promise<Object>} Response with pod_info and profile
   */
  async signInWithMobile(credentials) {
    const formData = new FormData();
    formData.append('mobile_number', credentials.mobile_number);
    formData.append('pass_code', credentials.pass_code);
    formData.append('login_type', credentials.login_type);

    // Use app_id from config or provided credentials
    const appId = credentials.app_id || getAppId();
    if (appId) formData.append('app_id', appId);

    const response = await fetch(`${API_BASE_URL}/auth-service/sign/in/with/mobile/number`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getBearerToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sign in failed');
    }

    const data = await response.json();

    console.log('Sign in with mobile - 200 response:', data);

    // Extract and store token
    const token = response.headers.get('Authorization') ||
                  response.headers.get('authorization') ||
                  data.token ||
                  data.access_token;

    if (token) {
      const cleanToken = token.replace('Bearer ', '');
      localStorage.setItem('xfloor_token', cleanToken);
    }

    // Store user data
    if (data.profile?.user_id) {
      localStorage.setItem('xfloor_user_id', data.profile.user_id);
    }
    if (data.pod_info?.floor_id) {
      localStorage.setItem('xfloor_floor_id', data.pod_info.floor_id);
    }
    if (data.pod_info) {
      localStorage.setItem('xfloor_pod_info', JSON.stringify(data.pod_info));
    }
    if (data.profile) {
      localStorage.setItem('xfloor_profile', JSON.stringify(data.profile));
    }

    return data;
  },

  /**
   * Send validation code for OTP login
   * @param {Object} data
   * @param {string} data.email_id - Email or mobile
   * @param {string} data.mode - Mode ("0" for email/mobile change, "1" for password change)
   * @returns {Promise<Object>}
   */
  async sendValidationCode(data) {
    const formData = new FormData();
    formData.append('email_id', data.email_id);
    formData.append('mode', data.mode);

    const response = await fetch(`${API_BASE_URL}/auth-service/send/validation/code`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getBearerToken() || ''}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send validation code');
    }

    return await response.json();
  },

  /**
   * Sign out the current user
   */
  signOut() {
    localStorage.removeItem('xfloor_token');
    localStorage.removeItem('xfloor_app_id');
    localStorage.removeItem('xfloor_user_id');
    localStorage.removeItem('xfloor_floor_id');
    localStorage.removeItem('xfloor_pod_info');
    localStorage.removeItem('xfloor_profile');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('xfloor_token');
  },

  /**
   * Get current user ID
   * @returns {string|null}
   */
  getUserId() {
    return localStorage.getItem('xfloor_user_id');
  },

  /**
   * Get current floor ID
   * @returns {string|null}
   */
  getFloorId() {
    return localStorage.getItem('xfloor_floor_id');
  },

  /**
   * Get pod info
   * @returns {Object|null}
   */
  getPodInfo() {
    const podInfo = localStorage.getItem('xfloor_pod_info');
    return podInfo ? JSON.parse(podInfo) : null;
  },

  /**
   * Get user profile
   * @returns {Object|null}
   */
  getProfile() {
    const profile = localStorage.getItem('xfloor_profile');
    return profile ? JSON.parse(profile) : null;
  },

  /**
   * Get Bearer token
   * @returns {string|null}
   */
  getToken() {
    return getBearerToken();
  },

  /**
   * Get floor information
   * @param {string} floorId - Floor ID to fetch information for
   * @param {string} appId - App ID
   * @param {string} userId - Optional user ID for context
   * @returns {Promise<Object>} Floor information including title, details, avatar, etc.
   */
  async getFloorInfo(floorId, appId, userId = null) {
    const floorInfoApi = getFloorInfoApi();

    return new Promise((resolve, reject) => {
      floorInfoApi.getFloorInformation(
        floorId,
        appId,
        userId ? { user_id: userId } : {},
        (error, data) => {
          if (error) {
            const errorMessage = error.message || error.response?.text || 'Failed to fetch floor information';
            reject(new Error(errorMessage));
          } else {
            resolve(data);
          }
        }
      );
    });
  },

  /**
   * Edit floor information
   * @param {Object} floorData
   * @param {string} floorData.floor_id - Floor ID to edit
   * @param {string} floorData.title - New title (optional)
   * @param {string} floorData.details - New details/description (optional)
   * @param {File} floorData.logo_file - New logo file (optional)
   * @returns {Promise<Object>} Updated floor information
   */
  async editFloor(floorData) {
    const userId = this.getUserId();
    const appId = getAppId();

    // Use SDK's EditFloorApi
    const editFloorApi = getEditFloorApi();

    // Build body object with optional fields
    const body = {};
    if (floorData.title) body.title = floorData.title;
    if (floorData.details) body.details = floorData.details;
    if (floorData.logo_file) body.logo_file = floorData.logo_file;

    return new Promise((resolve, reject) => {
      editFloorApi.editFloor(
        floorData.floor_id,
        userId,
        appId,
        body,
        (error, data) => {
          if (error) {
            const errorMessage = error.message || error.response?.text || 'Failed to edit floor';
            reject(new Error(errorMessage));
          } else {
            // Update pod info in localStorage if this is the user's pod floor
            const currentPodInfo = this.getPodInfo();
            if (currentPodInfo && currentPodInfo.floor_id === floorData.floor_id) {
              localStorage.setItem('xfloor_pod_info', JSON.stringify(data));
            }
            resolve(data);
          }
        }
      );
    });
  },
};
