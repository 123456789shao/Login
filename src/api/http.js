import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const http = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

export const authHttp = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
});

export function setupHttpInterceptors(authStore) {
  let refreshPromise = null;

  http.interceptors.request.use((config) => {
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
    (response) => response,
    async (error) => {
      const originalConfig = error.config ?? {};
      const status = error.response?.status;
      const shouldSkipRefresh = Boolean(originalConfig.skipAuthRefresh);
      const requestUrl = String(originalConfig.url || '');
      const isRefreshRequest = requestUrl.includes('/auth/refresh');

      if (status !== 401 || shouldSkipRefresh || isRefreshRequest || originalConfig._retry) {
        return Promise.reject(error);
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
        return Promise.reject(refreshError);
      }
    }
  );
}