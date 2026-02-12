import {
  Configuration,
  DefaultApi,
  EditFloorApi,
  EventApi,
  type EventResponse,
  GetFloorInformationApi,
  GetRecentEventsApi,
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

export const getDefaultApi = (): DefaultApi => new DefaultApi(createConfiguration());
export const getQueryApi = (): QueryApi => new QueryApi(createConfiguration());
export const getEventApi = (): EventApi => new EventApi(createConfiguration());
export const getRecentEventsApi = (): GetRecentEventsApi => new GetRecentEventsApi(createConfiguration());
export const getEditFloorApi = (): EditFloorApi => new EditFloorApi(createConfiguration());
export const getFloorInfoApi = (): GetFloorInformationApi => new GetFloorInformationApi(createConfiguration());

export const createEventWithFiles = async (
  inputInfo: string,
  appId: string,
  files: File[] = []
): Promise<EventResponse> => {
  const eventApi = getEventApi();

  if (files.length <= 1) {
    return eventApi.event({
      inputInfo,
      appId,
      files: files[0],
    });
  }

  // The generated SDK type accepts a single Blob, but the API supports multiple files.
  // Override the request body with multipart form data containing repeated "files" fields.
  const rawResponse = await eventApi.eventRaw(
    {
      inputInfo,
      appId,
      files: files[0],
    },
    async ({ init }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('input_info', inputInfo);
      formData.append('app_id', appId);

      return {
        ...init,
        body: formData,
      };
    }
  );

  return rawResponse.value();
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

    getConversations: async ({ userId, floorId }: { userId: string; floorId?: string }) => {
      const defaultApi = getDefaultApi();

      let threadId: string | undefined;
      if (floorId) {
        const threads = await defaultApi.conversationThreads({ userId, floorId });
        threadId = threads.threads?.[0]?.threadId;
      }

      return defaultApi.getConversations({
        userId,
        threadId,
      });
    },
  };
};
