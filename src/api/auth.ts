/** 鉴权接口适配层：封装登录/刷新/登出/用户信息请求，并做请求并发去重。 */
import { adaptAuthError } from '../errors/auth-error';
import type { AuthProfile, LoginCredentials, TokenResponse } from '../types/auth';
import { authHttp, http } from './http';

interface LogoutResponse {
  success: boolean;
}

interface GetMyProfileOptions {
  skipAuthRefresh?: boolean;
  dedupe?: boolean;
}

let profileRequestInFlight: Promise<AuthProfile> | null = null;

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

export async function getMyProfile(options: GetMyProfileOptions = {}): Promise<AuthProfile> {
  const { skipAuthRefresh = false, dedupe = true } = options;

  if (dedupe && profileRequestInFlight) {
    return profileRequestInFlight;
  }

  const requestPromise = (async () => {
    try {
      const { data } = await http.get<AuthProfile>('/auth/me', {
        skipAuthRefresh,
      });
      return data;
    } catch (error) {
      throw adaptAuthError(error);
    }
  })();

  if (!dedupe) {
    return requestPromise;
  }

  profileRequestInFlight = requestPromise.finally(() => {
    profileRequestInFlight = null;
  });

  return profileRequestInFlight;
}