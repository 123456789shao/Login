/** 权限组合函数：为组件提供角色与权限判断能力。 */
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

export function usePermission() {
  const authStore = useAuthStore();

  const permissions = computed(() => authStore.permissions);

  function can(permission: string): boolean {
    return authStore.hasPermission(permission);
  }

  function canAll(requiredPermissions: string[] = []): boolean {
    return authStore.hasAllPermissions(requiredPermissions);
  }

  function hasRole(role: string): boolean {
    return authStore.hasRole(role);
  }

  return {
    permissions,
    can,
    canAll,
    hasRole,
  };
}