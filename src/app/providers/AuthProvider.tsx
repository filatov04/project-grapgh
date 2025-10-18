import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../../shared/types/authTypes';
import { userModel } from '../../entities/user';
import { authApi } from '../../shared/api';
import { api } from '../../shared/api/customAxiosInstance';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = userModel.getToken();
      const savedUser = userModel.getUser();

      if (token && savedUser) {
        // Добавляем токен к каждому запросу
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Проверяем валидность токена
        try {
          const response = await authApi.getCurrentUser();
          setUser(response.data.user);
        } catch (error) {
          // Токен невалиден, очищаем данные
          userModel.clearAuth();
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (user: User, token: string) => {
    setUser(user);
    userModel.saveUser(user);
    userModel.saveToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      userModel.clearAuth();
      delete api.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

