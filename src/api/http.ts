import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { adaptAuthError } from '../errors/auth-error';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthStoreLike {
  accessToken: string | null;
  refreshSession(options?: { silent?: boolean }): Promise<unknown>;
  logout(options?: { allDevices?: boolean; broadcast?: boolean }): Promise<unknown>;
  markSessionExpired(): void;
}

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

export const authHttp: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

function rejectAdapted(error: unknown): Promise<never> {
  return Promise.reject(adaptAuthError(error));
}

export function setupHttpInterceptors(authStore: AuthStoreLike): void {
  let refreshPromise: Promise<unknown> | null = null;

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

  http.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalConfig = error.config;
      const status = error.response?.status;
      const shouldSkipRefresh = Boolean(originalConfig?.skipAuthRefresh);
      const requestUrl = String(originalConfig?.url || '');
      const isRefreshRequest = requestUrl.includes('/auth/refresh');

      if (!originalConfig || status !== 401 || shouldSkipRefresh || isRefreshRequest || originalConfig._retry) {
        return rejectAdapted(error);
      }

      originalConfig._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = authStore.refreshSession({ silent: true }).finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;

        const token = authStore.accessToken;
        if (token) {
          originalConfig.headers = originalConfig.headers ?? {};
          originalConfig.headers.Authorization = `Bearer ${token}`;
        }

        return http(originalConfig);
      } catch (refreshError) {
        await authStore.logout({ allDevices: false, broadcast: true }).catch(() => {});
        authStore.markSessionExpired();
        return rejectAdapted(refreshError);
      }
    }
  );
}