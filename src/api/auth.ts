import { adaptAuthError } from '../errors/auth-error';
import type { AuthProfile, LoginCredentials, TokenResponse } from '../types/auth';
import { authHttp, http } from './http';

interface LogoutResponse {
  success: boolean;
}

export async function loginRequest(credentials: LoginCredentials): Promise<TokenResponse> {
  try {
    const { data } = await authHttp.post<TokenResponse>('/auth/login', credentials, {
      skipAuthRefresh: true,
    });
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}

export async function refreshRequest(): Promise<TokenResponse> {
  try {
    const { data } = await authHttp.post<TokenResponse>(
      '/auth/refresh',
      {},
      {
        skipAuthRefresh: true,
      }
    );
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}

export async function logoutRequest(): Promise<LogoutResponse> {
  try {
    const { data } = await authHttp.post<LogoutResponse>(
      '/auth/logout',
      {},
      {
        skipAuthRefresh: true,
      }
    );
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}

export async function logoutAllRequest(): Promise<LogoutResponse> {
  try {
    const { data } = await http.post<LogoutResponse>('/auth/logout-all');
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}

export async function getMyProfile(options: { skipAuthRefresh?: boolean } = {}): Promise<AuthProfile> {
  const { skipAuthRefresh = false } = options;

  try {
    const { data } = await http.get<AuthProfile>('/auth/me', {
      skipAuthRefresh,
    });
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}