export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthProfile {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType?: string;
}

export interface LogoutOptions {
  allDevices?: boolean;
  broadcast?: boolean;
}

export interface RefreshOptions {
  silent?: boolean;
}

export interface AuthEvent {
  type: string;
  payload?: Record<string, unknown>;
  at: number;
}