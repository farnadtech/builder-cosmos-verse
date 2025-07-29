import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'employer' | 'contractor' | 'arbitrator' | 'admin';
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyOTP: (phoneNumber: string, code: string) => Promise<{ success: boolean; message: string }>;
  sendOTP: (phoneNumber: string) => Promise<{ success: boolean; message: string }>;
  verifyIdentity: (formData: FormData) => Promise<{ success: boolean; message: string }>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Token refresh function
  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('zemano_refresh_token');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('zemano_token', data.data.accessToken);
          localStorage.setItem('zemano_refresh_token', data.data.refreshToken);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  // Check for existing token on app start
  useEffect(() => {
    const token = localStorage.getItem('zemano_token');
    const userData = localStorage.getItem('zemano_user');

    console.log('AuthContext: Checking for existing session...', {
      hasToken: !!token,
      hasUserData: !!userData
    });

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        console.log('AuthContext: Loaded user from localStorage:', user);
        setUser(user);
      } catch (error) {
        console.error('AuthContext: Failed to parse user data:', error);
        localStorage.removeItem('zemano_token');
        localStorage.removeItem('zemano_user');
        localStorage.removeItem('zemano_refresh_token');
      }
    }
    setIsLoading(false);
  }, []);

  // Setup global authenticated fetch function for automatic token refresh
  useEffect(() => {
    if (user) {
      console.log('Setting up authenticatedFetch for user:', user.email);
      // Function to make authenticated requests with automatic token refresh
      window.authenticatedFetch = async (url: string, options: RequestInit = {}) => {
        let token = localStorage.getItem('zemano_token');
        console.log('Making authenticated request to:', url, 'with token:', token ? 'exists' : 'missing');

        // First attempt with current token
        const headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': options.headers?.['Content-Type'] || 'application/json'
        };

        let response = await fetch(url, { ...options, headers });
        console.log('Response status:', response.status);

        // If token is expired (401), try to refresh
        if (response.status === 401) {
          console.log('Token expired, attempting refresh...');
          const refreshed = await refreshAuthToken();

          if (refreshed) {
            console.log('Token refreshed successfully, retrying request...');
            // Retry with new token
            token = localStorage.getItem('zemano_token');
            const newHeaders = {
              ...options.headers,
              'Authorization': `Bearer ${token}`,
              'Content-Type': options.headers?.['Content-Type'] || 'application/json'
            };
            response = await fetch(url, { ...options, headers: newHeaders });
            console.log('Retry response status:', response.status);
          } else {
            console.log('Token refresh failed, logging out user');
            // Refresh failed, logout user
            logout();
            return response;
          }
        }

        return response;
      };
    } else {
      // Remove the global fetch function when user is not logged in
      console.log('User not logged in, removing authenticatedFetch');
      delete window.authenticatedFetch;
    }
  }, [user, logout]);

  const login = async (phoneNumber: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Use XMLHttpRequest to avoid response body consumption issues
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/auth/login');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');

        xhr.onload = () => {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve({
              data: responseData,
              status: xhr.status,
              ok: xhr.status >= 200 && xhr.status < 300
            });
          } catch (parseError) {
            resolve({
              data: { message: xhr.responseText || 'خطا در پردازش پاسخ' },
              status: xhr.status,
              ok: false
            });
          }
        };

        xhr.onerror = () => reject(new Error('خطا در ارتباط با سرور'));
        xhr.ontimeout = () => reject(new Error('زمان انتظار تمام شد'));
        xhr.timeout = 30000;
        xhr.send(JSON.stringify({ phoneNumber, password }));
      });

      const data = result.data;

      if (result.ok && data.success) {
        const userData: User = {
          id: data.data.user.id,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          email: data.data.user.email,
          phoneNumber: data.data.user.phoneNumber,
          role: data.data.user.role,
          isVerified: data.data.user.isVerified
        };

        setUser(userData);
        localStorage.setItem('zemano_token', data.data.tokens.accessToken);
        localStorage.setItem('zemano_refresh_token', data.data.tokens.refreshToken);
        localStorage.setItem('zemano_user', JSON.stringify(userData));

        return { success: true, message: 'ورود با موفقیت انجام شد' };
      } else {
        return { success: false, message: data.message || 'خطا در ورود' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'خطا در ��تصال به سرور' };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Attempting registration with data:', userData);

      // Use XMLHttpRequest as a fallback to avoid response body consumption issues
      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/auth/register');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');

        xhr.onload = () => {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve({
              data: responseData,
              status: xhr.status,
              ok: xhr.status >= 200 && xhr.status < 300
            });
          } catch (parseError) {
            resolve({
              data: { message: xhr.responseText || 'خطا در پردازش پاسخ' },
              status: xhr.status,
              ok: false
            });
          }
        };

        xhr.onerror = () => {
          reject(new Error('خطا در ارتباط با سرور'));
        };

        xhr.ontimeout = () => {
          reject(new Error('زمان انتظار تمام شد'));
        };

        xhr.timeout = 30000; // 30 second timeout
        xhr.send(JSON.stringify(userData));
      });

      console.log('Registration response:', data);

      // Handle error responses
      if (!data.ok) {
        const errorMessage = data.data?.message || data.data?.messageFA || 'خطا در ثبت نام';
        return { success: false, message: errorMessage };
      }

      if (data.data.success) {
        const newUser: User = {
          id: data.data.data.user.id,
          firstName: data.data.data.user.firstName,
          lastName: data.data.data.user.lastName,
          email: data.data.data.user.email,
          phoneNumber: data.data.data.user.phoneNumber,
          role: data.data.data.user.role,
          isVerified: data.data.data.user.isVerified
        };

        setUser(newUser);
        localStorage.setItem('zemano_token', data.data.data.tokens.accessToken);
        localStorage.setItem('zemano_refresh_token', data.data.data.tokens.refreshToken);
        localStorage.setItem('zemano_user', JSON.stringify(newUser));

        return { success: true, message: data.data.message || 'ثبت نام با موفقیت انجام شد' };
      } else {
        return { success: false, message: data.data.message || 'خطا در ثبت نام' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'خطا در اتصال به سرور' };
    }
  };

  const sendOTP = async (phoneNumber: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
        cache: 'no-cache',
      });

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'خطا در ارسال کد تایید' };
    }
  };

  const verifyOTP = async (phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, code }),
        cache: 'no-cache',
      });

      const data = await response.json();

      if (data.success && user) {
        setUser({ ...user, isVerified: true });
        const updatedUser = { ...user, isVerified: true };
        localStorage.setItem('zemano_user', JSON.stringify(updatedUser));
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'خطا در تایید کد' };
    }
  };

  const verifyIdentity = async (formData: FormData): Promise<{ success: boolean; message: string }> => {
    try {
      const token = localStorage.getItem('zemano_token');
      const response = await fetch('/api/auth/verify-identity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        cache: 'no-cache',
      });

      const data = await response.json();

      if (data.success && user) {
        const updatedUser = { ...user, isVerified: true };
        setUser(updatedUser);
        localStorage.setItem('zemano_user', JSON.stringify(updatedUser));
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('Verify identity error:', error);
      return { success: false, message: 'خطا در احراز هویت' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zemano_token');
    localStorage.removeItem('zemano_refresh_token');
    localStorage.removeItem('zemano_user');
    // Remove the global fetch function
    delete window.authenticatedFetch;
    navigate('/');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    verifyOTP,
    sendOTP,
    verifyIdentity
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
