import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  role_name?: string;
  avatar_url?: string;
  bio?: string;
  instagram_url?: string;
  spotify_uri?: string;
  preferences?: Record<string, any>;
  last_google_ads_import_completed_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  mutateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('sf_token');

    if (storedToken) {
      setToken(storedToken);

      // Fetch user from backend using the stored token
      const fetchUser = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
          const res = await fetch(`${API_BASE_URL}/user`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Accept': 'application/json'
            }
          });
          if (res.ok) {
            const freshUser = await res.json();
            setUser(freshUser);
          } else {
            // Token might be invalid or expired
            setToken(null);
            localStorage.removeItem('sf_token');
            sessionStorage.removeItem('sf_vault_token');
          }
        } catch (e) {
          console.error("Failed to fetch user session", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, turnstileToken?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          'cf-turnstile-response': turnstileToken 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Credenciais inválidas. Verifique seu email e senha.'
        };
      }

      // Store token and user
      // Store token
      localStorage.setItem('sf_token', data.token);

      setToken(data.token);
      setUser(data.user);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Erro de conexão. Tente novamente.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user'); // cleanup legacy
    sessionStorage.removeItem('sf_vault_token'); // clear vault token
    setToken(null);
    setUser(null);
  };

  const mutateUser = (newUser: User) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        mutateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
