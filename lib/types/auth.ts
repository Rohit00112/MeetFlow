export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
}

export interface MessageResponse {
  message?: string;
  resetLink?: string;
}
