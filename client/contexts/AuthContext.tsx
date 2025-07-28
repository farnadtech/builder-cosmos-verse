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

  // Check for existing token on app start
  useEffect(() => {
    const token = localStorage.getItem('zemano_token');
    const userData = localStorage.getItem('zemano_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('zemano_token');
        localStorage.removeItem('zemano_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (phoneNumber: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password }),
        cache: 'no-cache',
      });

      // Clone response to avoid "body stream already read" errors
      const responseClone = response.clone();

      // Read response text once, then parse
      const responseText = await responseClone.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Login JSON parse error:', parseError);
        return { success: false, message: 'خطا در پردازش پاسخ سرور' };
      }

      if (response.ok && data.success) {
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
          reject(new Error('��مان انتظار تمام شد'));
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
        return { success: false, message: data.data.message || 'خطا ��ر ثبت نام' };
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

      const responseClone = response.clone();
      const responseText = await responseClone.text();
      const data = JSON.parse(responseText);
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

      const responseClone = response.clone();
      const responseText = await responseClone.text();
      const data = JSON.parse(responseText);

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

      const responseClone = response.clone();
      const responseText = await responseClone.text();
      const data = JSON.parse(responseText);

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
