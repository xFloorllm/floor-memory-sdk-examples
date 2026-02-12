import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  GetFloorInformation200Response,
  SignInWithEmail200Response,
  SignUp200Response,
} from '@xfloor/floor-memory-sdk-ts';
import { authService } from '../services/authService';

type StoredProfile = {
  userId: string;
  name?: string;
  avatar?: {
    url?: string;
    type?: string;
  };
  [key: string]: unknown;
};

export type AuthUser = {
  userId: string;
  floorId: string;
  profile: StoredProfile | null;
};

type SetCredentialsInput = {
  bearerToken: string;
  appId: string;
  podFloorId: string;
  userId: string;
  floorInfo?: GetFloorInformation200Response;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  podInfo: GetFloorInformation200Response | null;
  loading: boolean;
  signUp: (userData: Parameters<typeof authService.signUp>[0]) => Promise<SignUp200Response>;
  signInWithEmail: (
    credentials: Parameters<typeof authService.signInWithEmail>[0]
  ) => Promise<SignInWithEmail200Response>;
  signInWithMobile: (
    credentials: Parameters<typeof authService.signInWithMobile>[0]
  ) => Promise<SignInWithEmail200Response>;
  signOut: () => void;
  updatePodInfo: (newPodInfo: GetFloorInformation200Response) => void;
  setCredentials: (credentials: SetCredentialsInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [podInfo, setPodInfo] = useState<GetFloorInformation200Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = (): void => {
      if (authService.isAuthenticated()) {
        const userId = authService.getUserId();
        const floorId = authService.getFloorId();
        const profile = authService.getProfile() as StoredProfile | null;

        if (userId && floorId) {
          setIsAuthenticated(true);
          setUser({
            userId,
            floorId,
            profile,
          });
          setPodInfo(authService.getPodInfo());
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (userData: Parameters<typeof authService.signUp>[0]) => {
    return authService.signUp(userData);
  };

  const signInWithEmail = async (credentials: Parameters<typeof authService.signInWithEmail>[0]) => {
    const response = await authService.signInWithEmail(credentials);
    setIsAuthenticated(true);
    setUser({
      userId: response.profile.userId,
      floorId: response.podInfo.floorId,
      profile: response.profile as unknown as StoredProfile,
    });
    setPodInfo(response.podInfo as unknown as GetFloorInformation200Response);
    return response;
  };

  const signInWithMobile = async (credentials: Parameters<typeof authService.signInWithMobile>[0]) => {
    const response = await authService.signInWithMobile(credentials);
    setIsAuthenticated(true);
    setUser({
      userId: response.profile.userId,
      floorId: response.podInfo.floorId,
      profile: response.profile as unknown as StoredProfile,
    });
    setPodInfo(response.podInfo as unknown as GetFloorInformation200Response);
    return response;
  };

  const signOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setPodInfo(null);
  };

  const updatePodInfo = (newPodInfo: GetFloorInformation200Response) => {
    setPodInfo(newPodInfo);
    localStorage.setItem('xfloor_pod_info', JSON.stringify(newPodInfo));
  };

  const setCredentials = async (credentials: SetCredentialsInput) => {
    localStorage.setItem('xfloor_token', credentials.bearerToken);
    localStorage.setItem('xfloor_app_id', credentials.appId);
    localStorage.setItem('xfloor_user_id', credentials.userId);
    localStorage.setItem('xfloor_floor_id', credentials.podFloorId);

    const fallbackPodInfo: GetFloorInformation200Response = {
      floorId: credentials.podFloorId,
      title: `Floor ${credentials.podFloorId}`,
      details: '',
      floorUid: credentials.podFloorId,
      blocks: [],
      isOwner: '1',
      floorType: 'POD',
      appId: credentials.appId,
    };

    const resolvedPodInfo = credentials.floorInfo || fallbackPodInfo;
    localStorage.setItem('xfloor_pod_info', JSON.stringify(resolvedPodInfo));

    const profile: StoredProfile = {
      userId: credentials.userId,
      name: 'User',
    };

    localStorage.setItem('xfloor_profile', JSON.stringify(profile));

    setIsAuthenticated(true);
    setUser({
      userId: credentials.userId,
      floorId: credentials.podFloorId,
      profile,
    });
    setPodInfo(resolvedPodInfo);
  };

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    podInfo,
    loading,
    signUp,
    signInWithEmail,
    signInWithMobile,
    signOut,
    updatePodInfo,
    setCredentials,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
