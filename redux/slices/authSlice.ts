import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest, authenticatedRequest } from '@/lib/api';
import { setToken, clearAuthData } from '@/lib/tokenManager';
import type {
  AuthResponse,
  AuthSessionResponse,
  AuthUser,
  MessageResponse,
} from '@/lib/types/auth';

// Define Auth State
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Call the backend login endpoint
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      console.log('Login response:', data);
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { name, email, password, profileImage }: { name: string; email: string; password: string; profileImage?: string | null },
    { rejectWithValue }
  ) => {
    try {
      // Determine avatar - use uploaded image or generate from initials
      let avatar = profileImage;

      // If no profile image was uploaded, use UI Avatars API to generate one based on initials
      if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=200`;
      }

      // Log the data being sent to the API
      console.log('Sending registration data:', {
        name,
        email,
        hasPassword: !!password,
        profileImage: profileImage ? 'base64_image_data' : null
      });

      // Call the backend register endpoint
      const data = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password, avatar: profileImage },
      });

      console.log('Registration response:', data);
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    // No need to call an API endpoint for logout, just clear the state
    return null;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
  }
});

export const fetchUserProfile = createAsyncThunk('auth/fetchUserProfile', async (_, { rejectWithValue }) => {
  try {
    // Call the backend user profile endpoint
    const data = await authenticatedRequest<AuthSessionResponse>('/auth/me');
    console.log('User profile response:', data);
    return data.user;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user profile');
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    {
      name,
      email,
      bio,
      phone,
      profileImage
    }: {
      name: string;
      email: string;
      bio?: string;
      phone?: string;
      profileImage?: string | null
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: AuthState };

      if (!state.auth.user) {
        throw new Error('You must be logged in to update your profile');
      }

      // Determine avatar - use uploaded image, current avatar, or generate from initials
      let avatar = profileImage || state.auth.user.avatar;

      // If no profile image was uploaded and no current avatar, use UI Avatars API
      if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=200`;
      }

      // Log the data being sent to the API
      console.log('Sending profile update data:', {
        name,
        email,
        bio: bio || null,
        phone: phone || null,
        profileImage: profileImage ? 'base64_image_data' : null
      });

      // Call the backend update profile endpoint
      const data = await authenticatedRequest<AuthResponse>('/auth/update-profile', {
        method: 'PUT',
        body: { name, email, bio, phone, avatar: profileImage },
      });

      console.log('Update profile response:', data);

      console.log('Profile update response received:', {
        hasUser: !!data.user,
        hasToken: !!data.token,
        userData: data.user ? { id: data.user.id, name: data.user.name } : null
      });

      // Validate response data
      if (!data.token) {
        console.error('No token received in profile update response');
        throw new Error('Authentication error: No token received');
      }

      if (!data.user) {
        console.error('No user data received in profile update response');
        throw new Error('Authentication error: No user data received');
      }

      // Store the new token using tokenManager
      console.log('Storing new token using tokenManager');
      setToken(data.token);

      // Return both user and token for the reducer
      console.log('Returning user and token to reducer');
      return {
        user: data.user,
        token: data.token
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update profile');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      // Call the backend change password endpoint
      await authenticatedRequest<MessageResponse>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });

      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to change password');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      // Call the backend forgot password endpoint
      await apiRequest<MessageResponse>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send password reset email');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      // Call the backend reset password endpoint
      await apiRequest<MessageResponse>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });

      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to reset password');
    }
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      console.log('Cleared auth error state');
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        // Save token using tokenManager
        setToken(action.payload.token);
        console.log('Login successful, token saved and state updated');
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        // Save token using tokenManager
        setToken(action.payload.token);
        console.log('Registration successful, token saved and state updated');
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        // Remove token using tokenManager
        clearAuthData();
        console.log('Logout successful, token removed and state updated');
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        // Remove token using tokenManager
        clearAuthData();
        console.log('Fetch user profile failed, token removed and state updated');
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
        console.log('Profile update fulfilled, updating Redux state');
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        console.log('Redux state updated with new token and user data');
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer;
