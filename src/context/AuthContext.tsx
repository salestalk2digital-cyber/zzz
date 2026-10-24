import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, OutletId } from '../types/index.ts';
import { api, setStoredToken, clearStoredToken, getStoredToken } from '../services/api.ts';
import { signInWithGoogle, signOutFirebase } from '../services/firebase.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeOutlet: OutletId | 'all';
  setActiveOutlet: (outlet: OutletId | 'all') => void;
  canChangeOutlet: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  loginWithGoogleAuth: () => Promise<void>;
  quickLoginAsDemo: (account: User & { samplePassword: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOutlet, setActiveOutletState] = useState<OutletId | 'all'>('all');

  // Verify stored session on load
  useEffect(() => {
    async function initAuth() {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user } = await api.getCurrentUser();
        setUser(user);
        // Default active outlet based on user role
        if (user.role === 'gurgaon_team') {
          setActiveOutletState('gurgaon');
        } else if (user.role === 'faridabad_team') {
          setActiveOutletState('faridabad');
        } else if (user.role === 'manager' && user.outletId && user.outletId !== 'all') {
          setActiveOutletState(user.outletId);
        } else {
          setActiveOutletState('all');
        }
      } catch {
        clearStoredToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const canChangeOutlet =
    user?.role === 'supreme_ads_owner' ||
    user?.role === 'client_admin' ||
    (user?.role === 'manager' && user.outletId === 'all');

  const setActiveOutlet = (outlet: OutletId | 'all') => {
    if (!canChangeOutlet && user) {
      if (user.role === 'gurgaon_team') return setActiveOutletState('gurgaon');
      if (user.role === 'faridabad_team') return setActiveOutletState('faridabad');
      if (user.outletId && user.outletId !== 'all') return setActiveOutletState(user.outletId);
    }
    setActiveOutletState(outlet);
  };

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(usernameOrEmail, password);
      setStoredToken(data.token);
      setUser(data.user);

      if (data.user.role === 'gurgaon_team') {
        setActiveOutletState('gurgaon');
      } else if (data.user.role === 'faridabad_team') {
        setActiveOutletState('faridabad');
      } else if (data.user.role === 'manager' && data.user.outletId && data.user.outletId !== 'all') {
        setActiveOutletState(data.user.outletId);
      } else {
        setActiveOutletState('all');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser || !googleUser.email) {
        throw new Error('Google sign-in did not return a valid email address');
      }

      const data = await api.loginWithGoogle({
        email: googleUser.email,
        name: googleUser.displayName || undefined,
        uid: googleUser.uid,
      });

      setStoredToken(data.token);
      setUser(data.user);

      if (data.user.role === 'gurgaon_team') {
        setActiveOutletState('gurgaon');
      } else if (data.user.role === 'faridabad_team') {
        setActiveOutletState('faridabad');
      } else if (data.user.role === 'manager' && data.user.outletId && data.user.outletId !== 'all') {
        setActiveOutletState(data.user.outletId);
      } else {
        setActiveOutletState('all');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAsDemo = async (account: User & { samplePassword: string }) => {
    await login(account.username, account.samplePassword);
  };

  const logout = async () => {
    try {
      await api.logout();
      await signOutFirebase().catch(() => {});
    } catch {
      // ignore
    } finally {
      clearStoredToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeOutlet,
        setActiveOutlet,
        canChangeOutlet,
        login,
        loginWithGoogleAuth,
        quickLoginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
