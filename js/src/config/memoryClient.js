import {
  ApiClient,
  QueryApi,
  EventApi,
  GetRecentEventsApi,
  EditFloorApi,
  GetFloorInformationApi
} from '@xfloor/floor-memory-sdk-js';
import { APP_CONFIG } from './appConfig';

// Initialize the SDK's API client with bearer authentication
const initializeSDK = () => {
  const defaultClient = ApiClient.instance;

  defaultClient.basePath = APP_CONFIG.API_BASE_URL;

  // Remove the SDK's default User-Agent header — it causes CORS preflight failures
  // in browsers because the server doesn't whitelist 'user-agent' in Access-Control-Allow-Headers
  delete defaultClient.defaultHeaders['User-Agent'];

  // Configure Bearer Token authentication
  const bearerAuth = defaultClient.authentications['bearer'];
  if (bearerAuth) {
    // Dynamically import authService to avoid circular dependency
    // Get token from localStorage or use the config token
    const token = localStorage.getItem('xfloor_token') || APP_CONFIG.BEARER_TOKEN;
    bearerAuth.accessToken = token;
  }

  return defaultClient;
};

// Export API instances (singleton pattern)
export const getQueryApi = () => {
  // Reinitialize to get latest token
  initializeSDK();
  return new QueryApi();
};

export const getEventApi = () => {
  initializeSDK();
  return new EventApi();
};

export const getRecentEventsApi = () => {
  initializeSDK();
  return new GetRecentEventsApi();
};

export const getEditFloorApi = () => {
  initializeSDK();
  return new EditFloorApi();
};

export const getFloorInfoApi = () => {
  initializeSDK();
  return new GetFloorInformationApi();
};

// Legacy export for backward compatibility (used by QueryConversation)
export const getMemoryClient = () => {
  console.warn('getMemoryClient is deprecated. Use getQueryApi instead.');
  return {
    query: async ({ userId, floorId, query }) => {
      const queryApi = getQueryApi();
      return new Promise((resolve, reject) => {
        const queryRequest = {
          user_id: userId,
          query: query,
          floor_ids: [floorId],
          k: 5,
          include_metadata: '1',
          summary_needed: '1',
          app_id: APP_CONFIG.APP_ID
        };

        queryApi.query(queryRequest, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data.answer || data);
          }
        });
      });
    }
  };
};
