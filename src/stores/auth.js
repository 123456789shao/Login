import { defineStore } from 'pinia';
import {
  getMyProfile,
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  refreshRequest,
} from '../api/auth';
import { publishAuthEvent } from '../composables/useAuthSync';

function getInitialState() {
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
  state: () => getInitialState(),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),

    displayName: (state) => state.user?.name || state.user?.email || 'Unknown User',

    hasPermission: (state) => (permission) => state.permissions.includes(permission),

    hasRole: (state) => (role) => state.roles.includes(role),

    hasAllPermissions: (state) => (requiredPermissions = []) =>
      requiredPermissions.every((permission) => state.permissions.includes(permission)),
  },

  actions: {
    setAccessToken(accessToken, expiresIn = 900) {
      this.accessToken = accessToken;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    },

    applyProfile(profile) {
      this.user = profile.user || null;
      this.roles = Array.isArray(profile.roles) ? profile.roles : [];
      this.permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
      this.sessionExpired = false;
    },

    clearLocalSession() {
      this.accessToken = null;
      this.tokenExpiresAt = null;
      this.user = null;
      this.roles = [];
      this.permissions = [];
    },

    markSessionExpired() {
      this.sessionExpired = true;
    },

    async bootstrap() {
      if (this.bootstrapping || this.bootstrapped) {
        return;
      }

      this.bootstrapping = true;

      try {
        const profile = await getMyProfile({ skipAuthRefresh: true });
        this.applyProfile(profile);
      } catch (error) {
        if (error.response?.status === 401) {
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

    async login(credentials) {
      const loginResult = await loginRequest(credentials);
      this.setAccessToken(loginResult.accessToken, loginResult.expiresIn);

      const profile = await getMyProfile({ skipAuthRefresh: true });
      this.applyProfile(profile);
      this.bootstrapped = true;
      publishAuthEvent('login', { userId: this.user?.id });
    },

    async refreshSession(options = {}) {
      const { silent = false } = options;

      try {
        const refreshResult = await refreshRequest();
        this.setAccessToken(refreshResult.accessToken, refreshResult.expiresIn);
        this.sessionExpired = false;
        return refreshResult;
      } catch (error) {
        this.clearLocalSession();
        this.bootstrapped = true;

        if (!silent) {
          this.sessionExpired = true;
          publishAuthEvent('session-expired');
        }

        throw error;
      }
    },

    async logout(options = {}) {
      const { allDevices = false, broadcast = true } = options;

      try {
        if (allDevices) {
          await logoutAllRequest();
        } else {
          await logoutRequest();
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

    handleExternalEvent(type) {
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