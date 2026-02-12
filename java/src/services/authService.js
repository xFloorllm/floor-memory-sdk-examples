import { APP_CONFIG } from '../config/appConfig';

const MEMORY_BASE = APP_CONFIG.MEMORY_SERVER_BASE_URL;

const normalizeToken = (token) => {
  if (!token) return null;
  const trimmed = String(token).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Bearer\s+/i, '');
};

const maskToken = (token) => {
  if (!token) return null;
  if (token.length <= 14) return '***';
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

/**
 * Get Bearer token - local credentials take priority over static config
 */
const getBearerToken = () => {
  const storedToken = localStorage.getItem('xfloor_token');
  if (storedToken) {
    return normalizeToken(storedToken);
  }

  if (APP_CONFIG.BEARER_TOKEN && APP_CONFIG.BEARER_TOKEN !== 'YOUR_BEARER_TOKEN_HERE') {
    return normalizeToken(APP_CONFIG.BEARER_TOKEN);
  }

  return null;
};

/**
 * Get App ID - checks localStorage first, then falls back to appConfig.js
 */
const getAppId = () => {
  const storedAppId = localStorage.getItem('xfloor_app_id');
  if (storedAppId) {
    return storedAppId;
  }

  if (APP_CONFIG.APP_ID && APP_CONFIG.APP_ID !== 'YOUR_APP_ID_HERE') {
    return APP_CONFIG.APP_ID;
  }

  return null;
};

const createHeaders = (extra = {}) => {
  const headers = { ...extra };
  const token = getBearerToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseErrorMessage = (payload, fallback) => {
  if (!payload) return fallback;

  const details = payload.error?.details ?? payload.details;
  const detailsText =
    typeof details === 'string'
      ? details
      : details != null
        ? JSON.stringify(details)
        : null;

  const baseMessage =
    payload.error?.message ||
    payload.message ||
    (typeof payload.detail === 'string' ? payload.detail : null) ||
    fallback;

  if (
    detailsText &&
    typeof baseMessage === 'string' &&
    baseMessage.toLowerCase().includes('invalid request payload')
  ) {
    return `${baseMessage} ${detailsText}`;
  }

  return baseMessage || detailsText || fallback;
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${MEMORY_BASE}${path}`, options);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = parseErrorMessage(payload, `Request failed with status ${response.status}`);
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = {
      status: response.status,
      text: errorMessage,
      body: payload,
    };
    throw error;
  }

  return { payload, response };
};

const extractToken = (response, payload) => {
  const headerToken = response.headers.get('Authorization') || response.headers.get('authorization');
  if (headerToken) {
    return headerToken.replace(/^Bearer\s+/i, '');
  }

  if (payload?.token) {
    return String(payload.token).replace(/^Bearer\s+/i, '');
  }

  if (payload?.access_token) {
    return String(payload.access_token).replace(/^Bearer\s+/i, '');
  }

  return null;
};

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(userData) {
    const appId = userData.app_id || getAppId();

    const { payload, response } = await requestJson('/auth/sign-up', {
      method: 'POST',
      headers: createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        name: userData.name,
        password: userData.password,
        email_id: userData.email_id,
        mobile_number: userData.mobile_number,
        app_id: appId || undefined,
      }),
    });

    const token = extractToken(response, payload);
    if (token) {
      localStorage.setItem('xfloor_token', token);
    }

    return payload;
  },

  /**
   * Sign in with email
   */
  async signInWithEmail(credentials) {
    const appId = credentials.app_id || getAppId();

    const { payload, response } = await requestJson('/auth/sign-in/email', {
      method: 'POST',
      headers: createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        email_id: credentials.email_id,
        pass_code: credentials.pass_code,
        login_type: credentials.login_type,
        app_id: appId || undefined,
      }),
    });

    const token = extractToken(response, payload);
    if (token) {
      localStorage.setItem('xfloor_token', token);
    }

    if (payload?.profile?.user_id) {
      localStorage.setItem('xfloor_user_id', payload.profile.user_id);
    }
    if (payload?.pod_info?.floor_id) {
      localStorage.setItem('xfloor_floor_id', payload.pod_info.floor_id);
    }
    if (payload?.pod_info) {
      localStorage.setItem('xfloor_pod_info', JSON.stringify(payload.pod_info));
    }
    if (payload?.profile) {
      localStorage.setItem('xfloor_profile', JSON.stringify(payload.profile));
    }

    return payload;
  },

  /**
   * Sign in with mobile number
   */
  async signInWithMobile(credentials) {
    const appId = credentials.app_id || getAppId();

    const { payload, response } = await requestJson('/auth/sign-in/mobile', {
      method: 'POST',
      headers: createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        mobile_number: credentials.mobile_number,
        pass_code: credentials.pass_code,
        login_type: credentials.login_type,
        app_id: appId || undefined,
      }),
    });

    const token = extractToken(response, payload);
    if (token) {
      localStorage.setItem('xfloor_token', token);
    }

    if (payload?.profile?.user_id) {
      localStorage.setItem('xfloor_user_id', payload.profile.user_id);
    }
    if (payload?.pod_info?.floor_id) {
      localStorage.setItem('xfloor_floor_id', payload.pod_info.floor_id);
    }
    if (payload?.pod_info) {
      localStorage.setItem('xfloor_pod_info', JSON.stringify(payload.pod_info));
    }
    if (payload?.profile) {
      localStorage.setItem('xfloor_profile', JSON.stringify(payload.profile));
    }

    return payload;
  },

  /**
   * Send validation code for OTP login
   */
  async sendValidationCode(data) {
    const { payload } = await requestJson('/auth/send-validation-code', {
      method: 'POST',
      headers: createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        mode: data.mode,
        user_id: data.user_id,
        email_id: data.email_id,
        mobile_number: data.mobile_number,
      }),
    });

    return payload;
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
   */
  isAuthenticated() {
    return !!localStorage.getItem('xfloor_token');
  },

  /**
   * Get current user ID
   */
  getUserId() {
    return localStorage.getItem('xfloor_user_id');
  },

  /**
   * Get current floor ID
   */
  getFloorId() {
    return localStorage.getItem('xfloor_floor_id');
  },

  /**
   * Get pod info
   */
  getPodInfo() {
    const podInfo = localStorage.getItem('xfloor_pod_info');
    return podInfo ? JSON.parse(podInfo) : null;
  },

  /**
   * Get user profile
   */
  getProfile() {
    const profile = localStorage.getItem('xfloor_profile');
    return profile ? JSON.parse(profile) : null;
  },

  /**
   * Get Bearer token
   */
  getToken() {
    return getBearerToken();
  },

  /**
   * Get floor information
   */
  async getFloorInfo(floorId, appId, userId = null) {
    const resolvedAppId = appId || getAppId() || '';
    const params = new URLSearchParams({ app_id: resolvedAppId });
    if (userId) {
      params.set('user_id', userId);
    }

    const path = `/floors/${encodeURIComponent(floorId)}?${params.toString()}`;
    const headers = createHeaders();
    const authHeader = headers.Authorization || headers.authorization || null;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    console.info('[getFloorInfo] Request -> /memory', {
      method: 'GET',
      path,
      floor_id: floorId,
      app_id: resolvedAppId,
      user_id: userId || null,
      authorization_token_masked: maskToken(token),
    });

    const { payload } = await requestJson(path, {
      method: 'GET',
      headers,
    });

    console.info('[getFloorInfo] Response <- /memory', {
      floor_id: floorId,
      app_id: resolvedAppId,
      user_id: userId || null,
      has_floor_id: Boolean(payload?.floor_id),
      title: payload?.title || null,
    });

    return payload;
  },

  /**
   * Edit floor information
   */
  async editFloor(floorData) {
    const userId = this.getUserId();
    const appId = getAppId();

    const formData = new FormData();
    formData.append('user_id', userId || '');
    formData.append('app_id', appId || '');
    if (floorData.title) formData.append('title', floorData.title);
    if (floorData.details) formData.append('details', floorData.details);
    if (floorData.logo_file) formData.append('logo_file', floorData.logo_file);

    const { payload } = await requestJson(`/floors/${encodeURIComponent(floorData.floor_id)}/edit`, {
      method: 'POST',
      headers: createHeaders(),
      body: formData,
    });

    const currentPodInfo = this.getPodInfo();
    if (currentPodInfo && currentPodInfo.floor_id === floorData.floor_id) {
      localStorage.setItem('xfloor_pod_info', JSON.stringify(payload));
    }

    return payload;
  },
};
