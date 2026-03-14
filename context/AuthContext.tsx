"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, authenticatedRequest, getAuthToken } from "@/lib/api";
import type {
  AuthResponse,
  AuthSessionResponse,
  AuthUser,
  MessageResponse,
} from "@/lib/types/auth";

// Define the AuthContext interface
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, profileImage?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  updateProfile: (name: string, email: string, profileImage?: string | null) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  refreshUserData: () => Promise<boolean>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to clear auth state (used internally)
  const clearAuthState = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  // Refresh user data
  const refreshUserData = async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const data = await authenticatedRequest<AuthSessionResponse>('/auth/me');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return false;
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = getAuthToken();
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
          console.log('No token or stored user found');
          clearAuthState();
          setLoading(false);
          return;
        }

        // Parse stored user data and set it immediately for better UX
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('Restored user from localStorage:', parsedUser.name);
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
          clearAuthState();
          setLoading(false);
          return;
        }

        // Don't wait for the server validation to complete before setting loading to false
        // This allows the UI to render with the stored user data while we validate in the background
        setLoading(false);

        try {
          // Validate token with server using the authenticated request utility
          console.log('Validating token with server...');
          const data = await authenticatedRequest<AuthSessionResponse>('/auth/me');

          // Update user data from server
          console.log('Token validated successfully, updating user data');
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } catch (error) {
          // If token is invalid, clear auth state
          console.error('Token validation failed:', error);
          clearAuthState();
          // Don't set loading to false here, as we already did it above
        }
      } catch (error) {
        console.error('Failed to restore authentication state:', error);
        // Clear invalid auth state
        clearAuthState();
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Use the API utility to make the request
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      // Save token to localStorage
      localStorage.setItem('token', data.token);

      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
    } catch (error) {
      // Handle specific error messages from the API
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unknown error occurred');
      }
      throw error; // Re-throw the error so the login page can handle it
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, profileImage?: string | null) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Determine avatar - use uploaded image or generate from initials
      let avatar = profileImage;

      // If no profile image was uploaded, use UI Avatars API to generate one based on initials
      if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=200`;
      }

      // Use the API utility to make the request
      const data = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password, avatar },
      });

      // Save token to localStorage
      localStorage.setItem('token', data.token);

      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);

    try {
      // Clear authentication state
      clearAuthState();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!email) {
        throw new Error('Email is required');
      }

      // Use the API utility to make the request
      const data = await apiRequest<MessageResponse>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      // In development, log the reset link
      if (process.env.NODE_ENV !== 'production' && data.resetLink) {
        console.log('Password reset link:', data.resetLink);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (name: string, email: string, profileImage?: string | null) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!name || !email) {
        throw new Error('Name and email are required');
      }

      if (!user) {
        throw new Error('You must be logged in to update your profile');
      }

      // Determine avatar - use uploaded image, current avatar, or generate from initials
      let avatar = profileImage || user.avatar;

      // If no profile image was uploaded and no current avatar, use UI Avatars API
      if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=200`;
      }

      // Use the authenticated API utility to make the request
      const data = await authenticatedRequest<AuthResponse>('/auth/update-profile', {
        method: 'PUT',
        body: { name, email, avatar },
      });

      // Save updated user data to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!token || !password) {
        throw new Error('Token and password are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Use the API utility to make the request
      await apiRequest<MessageResponse>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      // Use the authenticated API utility to make the request
      await authenticatedRequest<MessageResponse>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
