import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, OutletId } from '../types/index.ts';
import { api, setStoredToken, clearStoredToken, getStoredToken } from '../services/api.ts';
import { auth, signInWithGoogle, signOutFirebase } from '../services/firebase.ts';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  activeOutlet: OutletId | 'all';
  setActiveOutlet: (outlet: OutletId | 'all') => void;
  canChangeOutlet: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  loginWithGoogleAuth: (customEmail?: string) => Promise<void>;
  quickLoginAsDemo: (account: User & { samplePassword: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOutlet, setActiveOutletState] = useState<OutletId | 'all'>('all');

  // Determine initial active outlet based on user role
  const syncOutletForUser = (currentUser: User) => {
    if (currentUser.role === 'gurgaon_team') {
      setActiveOutletState('gurgaon');
    } else if (currentUser.role === 'faridabad_team') {
      setActiveOutletState('faridabad');
    } else if (currentUser.role === 'manager' && currentUser.outletId && currentUser.outletId !== 'all') {
      setActiveOutletState(currentUser.outletId);
    } else {
      setActiveOutletState('all');
    }
  };

  // 1. Initial verify of stored session token
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const token = getStoredToken();
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { user } = await api.getCurrentUser();
        if (isMounted) {
          setUser(user);
          syncOutletForUser(user);
        }
      } catch {
        clearStoredToken();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email && !getStoredToken()) {
        try {
          const data = await api.loginWithGoogle({
            email: fbUser.email,
            name: fbUser.displayName || undefined,
            uid: fbUser.uid,
          });
          setStoredToken(data.token);
          setUser(data.user);
          syncOutletForUser(data.user);
        } catch (err) {
          console.error('[Firebase Auth] Failed to synchronize backend session:', err);
        }
      }
    });

    return () => unsubscribe();
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
      const cleanId = usernameOrEmail.trim();
      const cleanPass = password.trim();
      const data = await api.login(cleanId, cleanPass);
      setStoredToken(data.token);
      setUser(data.user);
      syncOutletForUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleAuth = async (customEmail?: string) => {
    setIsLoading(true);
    try {
      let email = customEmail;
      let name: string | undefined;
      let uid = `g-user-${Date.now()}`;

      if (!customEmail) {
        const googleRes = await signInWithGoogle();
        email = googleRes.user?.email || googleRes.fallbackEmail || 'sales.talk2digital@gmail.com';
        name = googleRes.user?.displayName || googleRes.fallbackName || email?.split('@')[0];
        uid = googleRes.user?.uid || uid;

        if (googleRes.user) {
          setFirebaseUser(googleRes.user);
        }
      }

      const finalEmail = email || 'sales.talk2digital@gmail.com';
      const data = await api.loginWithGoogle({
        email: finalEmail,
        name: name || finalEmail.split('@')[0],
        uid,
      });

      setStoredToken(data.token);
      setUser(data.user);
      syncOutletForUser(data.user);
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAsDemo = async (account: User & { samplePassword: string }) => {
    await login(account.username, account.samplePassword);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout().catch(() => {});
      await signOutFirebase().catch(() => {});
    } finally {
      clearStoredToken();
      setUser(null);
      setFirebaseUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
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
