function normalizeRequiredPermissions(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function canAccess(authStore, bindingValue) {
  const requiredPermissions = normalizeRequiredPermissions(bindingValue);
  if (requiredPermissions.length === 0) {
    return true;
  }
  return authStore.hasAllPermissions(requiredPermissions);
}

function applyVisibility(el, isVisible) {
  el.style.display = isVisible ? '' : 'none';
}

export function registerPermissionDirective(app, authStore) {
  app.directive('permission', {
    mounted(el, binding) {
      applyVisibility(el, canAccess(authStore, binding.value));
    },
    updated(el, binding) {
      applyVisibility(el, canAccess(authStore, binding.value));
    },
  });
}