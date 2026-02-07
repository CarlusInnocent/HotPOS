import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, userApi, type AuthResponse, type LoginRequest } from '@/lib/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(data);
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response));
      
      setUser(response);
    } catch (err: unknown) {
      const errorMessage = 
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) return;
    try {
      const updatedUser = await userApi.getById(currentUser.userId);
      const refreshed: AuthResponse = {
        ...currentUser,
        fullName: updatedUser.fullName,
        email: updatedUser.email ?? currentUser.email,
      };
      localStorage.setItem('user', JSON.stringify(refreshed));
      setUser(refreshed);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
