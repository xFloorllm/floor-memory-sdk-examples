import {
  AuthApi,
  Configuration,
  EventApi,
  FloorApi,
  type EventResponse,
  QueryApi,
} from '@xfloor/floor-memory-sdk-ts';
import { APP_CONFIG } from './appConfig';

export const getActiveToken = (): string | null => {
  const stored = localStorage.getItem('xfloor_token');
  if (stored) return stored;
  return APP_CONFIG.BEARER_TOKEN || null;
};

export const getActiveAppId = (): string => {
  return localStorage.getItem('xfloor_app_id') || APP_CONFIG.APP_ID;
};

const createConfiguration = (): Configuration => {
  const token = getActiveToken();

  return new Configuration({
    basePath: APP_CONFIG.API_BASE_URL,
    accessToken: token || '',
  });
};

export const getAuthApi = (): AuthApi => new AuthApi(createConfiguration());
export const getQueryApi = (): QueryApi => new QueryApi(createConfiguration());
export const getEventApi = (): EventApi => new EventApi(createConfiguration());
export const getRecentEventsApi = (): EventApi => new EventApi(createConfiguration());
export const getFloorApi = (): FloorApi => new FloorApi(createConfiguration());

export const createEventWithFiles = async (
  inputInfo: string,
  appId: string,
  userId: string,
  files: File[] = []
): Promise<EventResponse> => {
  const eventApi = getEventApi();

  return eventApi.event({
    inputInfo,
    appId,
    userId,
    files: files.length > 0 ? files : undefined,
  });
};

export const getMemoryClient = () => {
  console.warn('getMemoryClient is deprecated. Use typed API helpers directly.');

  return {
    query: async ({ userId, floorId, query }: { userId: string; floorId: string; query: string }) => {
      const queryApi = getQueryApi();
      const result = await queryApi.query({
        queryRequest: {
          userId,
          query,
          floorIds: [floorId],
          includeMetadata: '1',
          summaryNeeded: '1',
          appId: getActiveAppId(),
        },
      });

      return result.answer || result;
    },

    getConversations: async (_: { userId: string; floorId?: string }) => {
      throw new Error('Conversation history endpoints are not available in @xfloor/floor-memory-sdk-ts v1.0.23.');
    },
  };
};
