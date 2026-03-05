/** HTTP 层：封装 axios 实例、注入访问令牌，并处理 401 刷新重试流程。 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { adaptAuthError } from '../errors/auth-error';

/** API 基础路径，优先从环境变量获取，默认为 /api */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 鉴权状态仓库接口描述
 * 抽象出 http 模块所需的 AuthStore 行为，解耦具体实现（如 Pinia/Zustand）
 */
export interface AuthStoreLike {
  /** 当前访问令牌 */
  accessToken: string | null;
  /** 刷新会话（获取新 Token） */
  refreshSession(options?: { silent?: boolean }): Promise<unknown>;
  /** 登出操作 */
  logout(options?: { allDevices?: boolean; broadcast?: boolean }): Promise<unknown>;
  /** 标记会话已过期 */
  markSessionExpired(): void;
}

/**
 * 通用业务请求实例
 * 默认包含 401 自动刷新重试逻辑
 */
export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

/**
 * 专门用于鉴权类操作的请求实例
 * 通常不包含 401 自动重试逻辑，避免死循环
 */
export const authHttp: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

/**
 * 统一错误转换处理
 * 将 Axios 原始错误适配为业务定义的错误类型
 */
function rejectAdapted(error: unknown): Promise<never> {
  return Promise.reject(adaptAuthError(error));
}

/**
 * 配置 HTTP 拦截器
 * 核心逻辑：注入 Token、处理 401 令牌刷新、并发请求去重重试
 * @param authStore 鉴权状态管理实例
 */
export function setupHttpInterceptors(authStore: AuthStoreLike): void {
  /** 正在进行的刷新 Token 请求，用于多个 401 并发时去重 */
  let refreshPromise: Promise<unknown> | null = null;

  // 请求拦截器：注入 Authorization 请求头
  http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = authStore.accessToken;

    if (token) {
      config.headers = config.headers ?? {};
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  });

  // 响应拦截器：处理成功响应及 401 错误重试
  http.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalConfig = error.config;
      const status = error.response?.status;
      /** 是否显式要求跳过自动刷新（用于特定接口） */
      const shouldSkipRefresh = Boolean(originalConfig?.skipAuthRefresh);
      const requestUrl = String(originalConfig?.url || '');
      /** 判断是否为刷新请求本身，防止无限递归 */
      const isRefreshRequest = requestUrl.includes('/auth/refresh');

      // 如果不是 401 错误，或者满足跳过刷新的条件，直接报错
      if (!originalConfig || status !== 401 || shouldSkipRefresh || isRefreshRequest || originalConfig._retry) {
        return rejectAdapted(error);
      }

      // 标记该请求已重试，防止死循环
      originalConfig._retry = true;

      try {
        // 如果当前没有正在进行的刷新请求，发起一个
        if (!refreshPromise) {
          refreshPromise = authStore.refreshSession({ silent: true }).finally(() => {
            refreshPromise = null;
          });
        }

        // 等待刷新结果（所有并发的 401 请求都会等待同一个 refreshPromise）
        await refreshPromise;

        // 刷新成功后，获取最新的 Token 并更新原始请求头
        const token = authStore.accessToken;
        if (token) {
          originalConfig.headers = originalConfig.headers ?? {};
          originalConfig.headers.Authorization = `Bearer ${token}`;
        }

        // 重新发起原始请求
        return http(originalConfig);
      } catch (refreshError) {
        // 刷新失败（如 Refresh Token 也过期了），执行登出清理
        await authStore.logout({ allDevices: false, broadcast: true }).catch(() => {});
        authStore.markSessionExpired();
        return rejectAdapted(refreshError);
      }
    }
  );
}
