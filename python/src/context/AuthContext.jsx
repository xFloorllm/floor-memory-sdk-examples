import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [podInfo, setPodInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        setIsAuthenticated(true);
        setUser({
          userId: authService.getUserId(),
          floorId: authService.getFloorId(),
          profile: authService.getProfile(),
        });
        setPodInfo(authService.getPodInfo());
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (userData) => {
    const response = await authService.signUp(userData);
    return response;
  };

  const signInWithEmail = async (credentials) => {
    const response = await authService.signInWithEmail(credentials);
    setIsAuthenticated(true);
    setUser({
      userId: response.profile.user_id,
      floorId: response.pod_info.floor_id,
      profile: response.profile,
    });
    setPodInfo(response.pod_info);
    return response;
  };

  const signInWithMobile = async (credentials) => {
    const response = await authService.signInWithMobile(credentials);
    setIsAuthenticated(true);
    setUser({
      userId: response.profile.user_id,
      floorId: response.pod_info.floor_id,
      profile: response.profile,
    });
    setPodInfo(response.pod_info);
    return response;
  };

  const signOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setPodInfo(null);
  };

  const updatePodInfo = (newPodInfo) => {
    setPodInfo(newPodInfo);
    localStorage.setItem('xfloor_pod_info', JSON.stringify(newPodInfo));
  };

  const setCredentials = async (credentials) => {
    // Store the credentials in localStorage
    localStorage.setItem('xfloor_token', credentials.bearerToken);
    localStorage.setItem('xfloor_app_id', credentials.appId);
    localStorage.setItem('xfloor_user_id', credentials.userId);
    localStorage.setItem('xfloor_floor_id', credentials.podFloorId);

    // Create pod info object with the floor ID
    const podInfo = {
      floor_id: credentials.podFloorId,
      title: `Floor ${credentials.podFloorId}`,
    };
    localStorage.setItem('xfloor_pod_info', JSON.stringify(podInfo));

    // Create user profile object
    const profile = {
      user_id: credentials.userId,
      name: 'User',
    };
    localStorage.setItem('xfloor_profile', JSON.stringify(profile));

    // Update state
    setIsAuthenticated(true);
    setUser({
      userId: credentials.userId,
      floorId: credentials.podFloorId,
      profile,
    });
    setPodInfo(podInfo);
  };

  const value = {
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
