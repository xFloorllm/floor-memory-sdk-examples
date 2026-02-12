import type {
  GetFloorInformation200Response,
  SendValidationCode200Response,
  SignInWithEmail200Response,
  SignUp200Response,
} from '@xfloor/floor-memory-sdk-ts';
import { APP_CONFIG } from '../config/appConfig';
import { getDefaultApi, getEditFloorApi, getFloorInfoApi, getActiveAppId, getActiveToken } from '../config/memoryClient';

type SignUpInput = {
  name: string;
  email_id?: string;
  mobile_number?: string;
  password: string;
  app_id?: string;
};

type SignInEmailInput = {
  email_id: string;
  pass_code: string;
  login_type: string;
  app_id?: string;
};

type SignInMobileInput = {
  mobile_number: string;
  pass_code: string;
  login_type: string;
  app_id?: string;
};

type SendValidationCodeInput = {
  email_id?: string;
  mobile_number?: string;
  user_id?: string;
  mode: string;
};

type EditFloorInput = {
  floorId: string;
  title?: string;
  details?: string;
  logoFile?: File;
  userId?: string;
  appId?: string;
};

type StoredProfile = SignInWithEmail200Response['profile'] | { userId: string; name?: string };

const getAppId = (): string | null => {
  const storedAppId = localStorage.getItem('xfloor_app_id');
  if (storedAppId) return storedAppId;
  return APP_CONFIG.APP_ID || null;
};

const getBearerToken = (): string | null => getActiveToken();

const extractToken = (headers: Headers, data: any): string | null => {
  const headerToken = headers.get('Authorization') || headers.get('authorization');
  const bodyToken = data?.token || data?.accessToken || data?.access_token;
  const token = headerToken || bodyToken;

  if (!token || typeof token !== 'string') {
    return null;
  }

  return token.replace(/^Bearer\s+/i, '');
};

const storeAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('xfloor_token', token);
  }
};

const storeUserSession = (data: SignInWithEmail200Response): void => {
  if (data.profile?.userId) {
    localStorage.setItem('xfloor_user_id', data.profile.userId);
  }

  if (data.podInfo?.floorId) {
    localStorage.setItem('xfloor_floor_id', data.podInfo.floorId);
  }

  if (data.podInfo) {
    localStorage.setItem('xfloor_pod_info', JSON.stringify(data.podInfo));
  }

  if (data.profile) {
    localStorage.setItem('xfloor_profile', JSON.stringify(data.profile));
  }
};

const getApiErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: Response }).response;

    if (response) {
      try {
        const payload = await response.clone().json();
        return payload?.error?.message || payload?.message || fallback;
      } catch {
        try {
          const text = await response.clone().text();
          if (text) return text;
        } catch {
          // Ignore and fallback
        }
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const authService = {
  async signUp(userData: SignUpInput): Promise<SignUp200Response> {
    const appId = userData.app_id || getAppId() || undefined;
    const defaultApi = getDefaultApi();

    try {
      const rawResponse = await defaultApi.signUpRaw({
        name: userData.name,
        emailId: userData.email_id,
        mobileNumber: userData.mobile_number,
        password: userData.password,
        appId,
      });

      const data = await rawResponse.value();
      storeAuthToken(extractToken(rawResponse.raw.headers, data));
      return data;
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Sign up failed'));
    }
  },

  async signInWithEmail(credentials: SignInEmailInput): Promise<SignInWithEmail200Response> {
    const appId = credentials.app_id || getAppId() || undefined;
    const defaultApi = getDefaultApi();

    try {
      const rawResponse = await defaultApi.signInWithEmailRaw({
        emailId: credentials.email_id,
        passCode: credentials.pass_code,
        loginType: credentials.login_type,
        appId,
      });

      const data = await rawResponse.value();
      storeAuthToken(extractToken(rawResponse.raw.headers, data));
      storeUserSession(data);
      return data;
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Sign in failed'));
    }
  },

  async signInWithMobile(credentials: SignInMobileInput): Promise<SignInWithEmail200Response> {
    const appId = credentials.app_id || getAppId() || undefined;
    const defaultApi = getDefaultApi();

    try {
      const rawResponse = await defaultApi.signInWithMobileNumberRaw({
        body: {
          mobile_number: credentials.mobile_number,
          pass_code: credentials.pass_code,
          login_type: credentials.login_type,
          app_id: appId,
        },
      });

      const data = await rawResponse.value();
      storeAuthToken(extractToken(rawResponse.raw.headers, data));
      storeUserSession(data);
      return data;
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Sign in failed'));
    }
  },

  async sendValidationCode(data: SendValidationCodeInput): Promise<SendValidationCode200Response> {
    const defaultApi = getDefaultApi();

    try {
      return await defaultApi.sendValidationCode({
        sendValidationCodeRequest: {
          userId: data.user_id,
          mode: data.mode,
          emailId: data.email_id,
          mobilesNumber: data.mobile_number,
        },
      });
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Failed to send validation code'));
    }
  },

  signOut(): void {
    localStorage.removeItem('xfloor_token');
    localStorage.removeItem('xfloor_app_id');
    localStorage.removeItem('xfloor_user_id');
    localStorage.removeItem('xfloor_floor_id');
    localStorage.removeItem('xfloor_pod_info');
    localStorage.removeItem('xfloor_profile');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('xfloor_token');
  },

  getUserId(): string | null {
    return localStorage.getItem('xfloor_user_id');
  },

  getFloorId(): string | null {
    return localStorage.getItem('xfloor_floor_id');
  },

  getPodInfo(): GetFloorInformation200Response | null {
    const podInfo = localStorage.getItem('xfloor_pod_info');
    return podInfo ? (JSON.parse(podInfo) as GetFloorInformation200Response) : null;
  },

  getProfile(): StoredProfile | null {
    const profile = localStorage.getItem('xfloor_profile');
    return profile ? (JSON.parse(profile) as StoredProfile) : null;
  },

  getToken(): string | null {
    return getBearerToken();
  },

  async getFloorInfo(floorId: string, appId: string, userId?: string): Promise<GetFloorInformation200Response> {
    const floorInfoApi = getFloorInfoApi();

    try {
      return await floorInfoApi.getFloorInformation({
        floorId,
        appId,
        userId,
      });
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Failed to fetch floor information'));
    }
  },

  async editFloor(floorData: EditFloorInput): Promise<GetFloorInformation200Response> {
    const userId = floorData.userId || this.getUserId();
    const appId = floorData.appId || getActiveAppId();

    if (!userId) {
      throw new Error('User ID is required to edit floor');
    }

    if (!appId) {
      throw new Error('App ID is required to edit floor');
    }

    const editFloorApi = getEditFloorApi();

    try {
      const updatedFloor = await editFloorApi.editFloor({
        floorId: floorData.floorId,
        userId,
        appId,
        title: floorData.title,
        details: floorData.details,
        logoFile: floorData.logoFile,
      });

      const currentPodInfo = this.getPodInfo();
      if (currentPodInfo && currentPodInfo.floorId === floorData.floorId) {
        localStorage.setItem('xfloor_pod_info', JSON.stringify(updatedFloor));
      }

      return updatedFloor;
    } catch (error) {
      throw new Error(await getApiErrorMessage(error, 'Failed to edit floor'));
    }
  },
};
