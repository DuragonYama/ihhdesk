import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../utils/api';
import type { User, LoginRequest, LoginResponse } from '../types/api';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      username: credentials.username,
      password: credentials.password
    });

    const { access_token } = response.data;

    localStorage.setItem('token', access_token);

    // Get user info
    const userResponse = await api.get<User>('/api/users/me');
    const userData = userResponse.data;

    // Only allow employee role
    if (userData.role !== 'employee') {
      localStorage.removeItem('token');
      throw new Error('Deze app is alleen voor medewerkers');
    }

    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
