import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, Wallet } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signout: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { user: userData } = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const refreshWallet = async () => {
    try {
      const { wallet: walletData } = await api.getWallet();
      setWallet(walletData);
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
      setWallet(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        try {
          await refreshUser();
          await refreshWallet();
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('accessToken');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signin = async (email: string, password: string) => {
    const { accessToken } = await api.signin(email, password);
    localStorage.setItem('accessToken', accessToken);
    await refreshUser();
    await refreshWallet();
  };

  const signup = async (email: string, password: string, name: string) => {
    await api.signup(email, password, name);
    await signin(email, password);
  };

  const signout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading,
        isAuthenticated: !!user,
        signin,
        signup,
        signout,
        refreshUser,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
