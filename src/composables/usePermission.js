import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

export function usePermission() {
  const authStore = useAuthStore();

  const permissions = computed(() => authStore.permissions);

  function can(permission) {
    return authStore.hasPermission(permission);
  }

  function canAll(requiredPermissions = []) {
    return authStore.hasAllPermissions(requiredPermissions);
  }

  function hasRole(role) {
    return authStore.hasRole(role);
  }

  return {
    permissions,
    can,
    canAll,
    hasRole,
  };
}