/** 鉴权接口适配层：封装登录/刷新/登出/用户信息请求，并做请求并发去重。 */
import { adaptAuthError } from '../errors/auth-error';
import type { AuthProfile, LoginCredentials, TokenResponse } from '../types/auth';
import { authHttp, http } from './http';

/**
 * 登出接口响应格式
 */
interface LogoutResponse {
  success: boolean;
}

/**
 * 获取用户信息请求配置项
 */
interface GetMyProfileOptions {
  /** 是否跳过鉴权自动刷新逻辑，默认为 false */
  skipAuthRefresh?: boolean;
  /** 是否开启并发请求去重，默认为 true */
  dedupe?: boolean;
}

/** 正在请求中的获取用户信息 Promise，用于并发去重 */
let profileRequestInFlight: Promise<AuthProfile> | null = null;

/**
 * 用户登录请求
 * @param credentials 登录凭证（用户名/邮箱和密码）
 * @returns 包含访问令牌和刷新令牌的响应
 * @throws 适配后的鉴权错误
 */
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

/**
 * 刷新访问令牌请求
 * @returns 新的令牌响应
 * @throws 适配后的鉴权错误
 */
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

/**
 * 用户登出请求（仅限当前会话）
 * @returns 登出结果
 * @throws 适配后的鉴权错误
 */
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

/**
 * 登出所有设备请求
 * 销毁该用户在所有设备上的活动会话
 * @returns 登出结果
 * @throws 适配后的鉴权错误
 */
export async function logoutAllRequest(): Promise<LogoutResponse> {
  try {
    const { data } = await http.post<LogoutResponse>('/auth/logout-all');
    return data;
  } catch (error) {
    throw adaptAuthError(error);
  }
}

/**
 * 获取当前登录用户的详细信息
 * @param options 请求配置项，包括去重和刷新控制
 * @returns 用户资料信息
 * @throws 适配后的鉴权错误
 */
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