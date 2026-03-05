import { defineStore } from 'pinia';
import {
  getMyProfile,
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  refreshRequest,
} from '../api/auth';
import {
  adaptAuthError,
  AuthErrorCode,
  isUnauthenticatedErrorCode,
} from '../errors/auth-error';
import { publishAuthEvent } from '../composables/useAuthSync';
import type { AuthProfile, AuthUser, LoginCredentials, LogoutOptions, RefreshOptions } from '../types/auth';

interface AuthState {
  bootstrapped: boolean;
  bootstrapping: boolean;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  sessionExpired: boolean;
}

function getInitialState(): AuthState {
  return {
    bootstrapped: false,
    bootstrapping: false,
    accessToken: null,
    tokenExpiresAt: null,
    user: null,
    roles: [],
    permissions: [],
    sessionExpired: false,
  };
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => getInitialState(),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.accessToken && state.user),

    displayName: (state): string => state.user?.name || state.user?.email || 'Unknown User',

    hasPermission: (state) => (permission: string): boolean => state.permissions.includes(permission),

    hasRole: (state) => (role: string): boolean => state.roles.includes(role),

    hasAllPermissions:
      (state) =>
      (requiredPermissions: string[] = []): boolean =>
        requiredPermissions.every((permission) => state.permissions.includes(permission)),
  },

  actions: {
    setAccessToken(accessToken: string, expiresIn = 900): void {
      this.accessToken = accessToken;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    },

    applyProfile(profile: AuthProfile): void {
      this.user = profile.user || null;
      this.roles = Array.isArray(profile.roles) ? profile.roles : [];
      this.permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
      this.sessionExpired = false;
    },

    clearLocalSession(): void {
      this.accessToken = null;
      this.tokenExpiresAt = null;
      this.user = null;
      this.roles = [];
      this.permissions = [];
    },

    markSessionExpired(): void {
      this.sessionExpired = true;
    },

    async bootstrap(): Promise<void> {
      if (this.bootstrapping || this.bootstrapped) {
        return;
      }

      this.bootstrapping = true;

      try {
        const profile = await getMyProfile({ skipAuthRefresh: true });
        this.applyProfile(profile);
      } catch (error) {
        const authError = adaptAuthError(error);

        if (isUnauthenticatedErrorCode(authError.code)) {
          try {
            await this.refreshSession({ silent: true });
            const profile = await getMyProfile({ skipAuthRefresh: true });
            this.applyProfile(profile);
          } catch {
            this.clearLocalSession();
          }
        } else {
          this.clearLocalSession();
        }
      } finally {
        this.bootstrapping = false;
        this.bootstrapped = true;
      }
    },

    async login(credentials: LoginCredentials): Promise<void> {
      const loginResult = await loginRequest(credentials);
      this.setAccessToken(loginResult.accessToken, loginResult.expiresIn);

      const profile = await getMyProfile({ skipAuthRefresh: true });
      this.applyProfile(profile);
      this.bootstrapped = true;
      publishAuthEvent('login', { userId: this.user?.id });
    },

    async refreshSession(options: RefreshOptions = {}): Promise<void> {
      const { silent = false } = options;

      try {
        const refreshResult = await refreshRequest();
        this.setAccessToken(refreshResult.accessToken, refreshResult.expiresIn);
        this.sessionExpired = false;
      } catch (error) {
        const authError = adaptAuthError(error);

        this.clearLocalSession();
        this.bootstrapped = true;

        if (!silent && isUnauthenticatedErrorCode(authError.code)) {
          this.sessionExpired = true;
          publishAuthEvent('session-expired');
        }

        throw authError;
      }
    },

    async logout(options: LogoutOptions = {}): Promise<void> {
      const { allDevices = false, broadcast = true } = options;

      try {
        if (allDevices) {
          await logoutAllRequest();
        } else {
          await logoutRequest();
        }
      } catch (error) {
        const authError = adaptAuthError(error);
        if (authError.code !== AuthErrorCode.UNAUTHORIZED) {
          throw authError;
        }
      } finally {
        this.clearLocalSession();
        this.bootstrapped = true;
        this.sessionExpired = false;

        if (broadcast) {
          publishAuthEvent('logout', { allDevices });
        }
      }
    },

    handleExternalEvent(type: string, _payload?: Record<string, unknown>): void {
      if (type === 'logout') {
        this.clearLocalSession();
        this.bootstrapped = true;
        this.sessionExpired = false;
        return;
      }

      if (type === 'session-expired') {
        this.clearLocalSession();
        this.bootstrapped = true;
        this.sessionExpired = true;
        return;
      }

      if (type === 'login') {
        this.bootstrapped = false;
      }
    },
  },
});