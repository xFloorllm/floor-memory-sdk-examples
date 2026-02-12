import { APP_CONFIG } from './appConfig';

const MEMORY_BASE = APP_CONFIG.MEMORY_SERVER_BASE_URL;

const getToken = () => {
  const localToken = localStorage.getItem('xfloor_token');
  if (localToken) return localToken;

  if (APP_CONFIG.BEARER_TOKEN && APP_CONFIG.BEARER_TOKEN !== 'YOUR_BEARER_TOKEN_HERE') {
    return APP_CONFIG.BEARER_TOKEN;
  }

  return '';
};

const createHeaders = (extra = {}) => {
  const token = getToken();
  const headers = { ...extra };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const buildError = async (response) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message =
    payload?.error?.message ||
    payload?.message ||
    (typeof payload?.detail === 'string' ? payload.detail : null) ||
    `Request failed with status ${response.status}`;

  const error = new Error(message);
  error.status = response.status;
  error.response = {
    status: response.status,
    text: message,
    body: payload,
  };
  return error;
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${MEMORY_BASE}${path}`, options);

  if (!response.ok) {
    throw await buildError(response);
  }

  return await response.json();
};

const callbackify = (promise, callback) => {
  promise
    .then((data) => callback?.(null, data))
    .catch((error) => callback?.(error, null));
};

const normalizeEventArgs = (inputInfo, appIdOrOpts, optsOrCallback, maybeCallback) => {
  let appId = APP_CONFIG.APP_ID;
  let opts = {};
  let callback = null;

  if (typeof appIdOrOpts === 'string') {
    appId = appIdOrOpts;
  } else if (typeof appIdOrOpts === 'function') {
    callback = appIdOrOpts;
  } else if (appIdOrOpts && typeof appIdOrOpts === 'object') {
    opts = appIdOrOpts;
    appId = APP_CONFIG.APP_ID;
  }

  if (typeof optsOrCallback === 'function') {
    callback = optsOrCallback;
  } else if (optsOrCallback && typeof optsOrCallback === 'object') {
    opts = optsOrCallback;
  }

  if (typeof maybeCallback === 'function') {
    callback = maybeCallback;
  }

  if (!appId) {
    appId = localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID;
  }

  return { inputInfo, appId, opts, callback };
};

export const getQueryApi = () => ({
  query(queryRequest, callback) {
    const effectiveRequest = {
      ...queryRequest,
      app_id:
        queryRequest?.app_id ||
        localStorage.getItem('xfloor_app_id') ||
        APP_CONFIG.APP_ID,
    };

    const promise = requestJson('/query', {
      method: 'POST',
      headers: createHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(effectiveRequest),
    });

    callbackify(promise, callback);
    return promise;
  },
});

export const getEventApi = () => ({
  event(inputInfo, appIdOrOpts, optsOrCallback, maybeCallback) {
    const { appId, opts, callback } = normalizeEventArgs(
      inputInfo,
      appIdOrOpts,
      optsOrCallback,
      maybeCallback,
    );

    const formData = new FormData();
    formData.append('input_info', inputInfo);
    formData.append('app_id', appId);

    const files = opts?.files;
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append('files', file));
    } else if (files) {
      formData.append('files', files);
    }

    const promise = requestJson('/events', {
      method: 'POST',
      headers: createHeaders(),
      body: formData,
    });

    callbackify(promise, callback);
    return promise;
  },
});

export const getRecentEventsApi = () => ({
  getRecentEvents(floorId, appId, opts = {}, callback) {
    const effectiveAppId = appId || localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID;
    const userId = opts?.userId || opts?.user_id || null;
    const params = new URLSearchParams({
      floor_id: floorId,
      app_id: effectiveAppId,
    });

    if (userId) {
      params.set('user_id', userId);
    }

    const promise = requestJson(`/recent-events?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    callbackify(promise, callback);
    return promise;
  },
});

export const getEditFloorApi = () => ({
  editFloor(floorId, userId, appId, opts = {}, callback) {
    const effectiveAppId = appId || localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID;
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('app_id', effectiveAppId);

    if (opts.title) formData.append('title', opts.title);
    if (opts.details) formData.append('details', opts.details);

    const logoFile = opts.logoFile || opts.logo_file;
    if (logoFile) {
      formData.append('logo_file', logoFile);
    }

    const promise = requestJson(`/floors/${encodeURIComponent(floorId)}/edit`, {
      method: 'POST',
      headers: createHeaders(),
      body: formData,
    });

    callbackify(promise, callback);
    return promise;
  },
});

export const getFloorInfoApi = () => ({
  getFloorInformation(floorId, appId, opts = {}, callback) {
    const effectiveAppId = appId || localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID;
    const userId = opts?.userId || opts?.user_id || null;
    const params = new URLSearchParams({ app_id: effectiveAppId });

    if (userId) {
      params.set('user_id', userId);
    }

    const promise = requestJson(`/floors/${encodeURIComponent(floorId)}?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    callbackify(promise, callback);
    return promise;
  },
});

export const getMemoryClient = () => ({
  async query({ userId, floorId, query }) {
    const queryApi = getQueryApi();

    return await queryApi.query({
      user_id: userId,
      query,
      floor_ids: [floorId],
      k: 5,
      include_metadata: '1',
      summary_needed: '1',
      app_id: localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID,
    });
  },

  async getConversations({ userId, floorId, threadId }) {
    if (threadId) {
      const params = new URLSearchParams({
        user_id: userId,
        thread_id: threadId,
      });

      return await requestJson(`/conversations?${params.toString()}`, {
        method: 'GET',
        headers: createHeaders(),
      });
    }

    if (floorId) {
      const params = new URLSearchParams({
        user_id: userId,
        floor_id: floorId,
      });

      return await requestJson(`/threads?${params.toString()}`, {
        method: 'GET',
        headers: createHeaders(),
      });
    }

    throw new Error('Provide either threadId or floorId to fetch conversation history.');
  },
});
