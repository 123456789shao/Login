/** v-permission 指令：当用户缺少权限时隐藏对应 UI 元素。 */
import type { App } from 'vue';

interface PermissionStoreLike {
  hasAllPermissions(requiredPermissions: string[]): boolean;
}

function normalizeRequiredPermissions(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return typeof value === 'string' && value.length > 0 ? [value] : [];
}

function canAccess(authStore: PermissionStoreLike, bindingValue: unknown): boolean {
  const requiredPermissions = normalizeRequiredPermissions(bindingValue);

  if (requiredPermissions.length === 0) {
    return true;
  }

  return authStore.hasAllPermissions(requiredPermissions);
}

function applyVisibility(el: HTMLElement, isVisible: boolean): void {
  el.style.display = isVisible ? '' : 'none';
}

export function registerPermissionDirective(app: App, authStore: PermissionStoreLike): void {
  app.directive('permission', {
    mounted(el, binding) {
      applyVisibility(el as HTMLElement, canAccess(authStore, binding.value));
    },
    updated(el, binding) {
      applyVisibility(el as HTMLElement, canAccess(authStore, binding.value));
    },
  });
}