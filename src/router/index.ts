import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AdminView from '../views/AdminView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true,
      permissions: ['dashboard:read'],
    },
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: {
      requiresAuth: true,
      permissions: ['admin:access'],
    },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: ForbiddenView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      publicOnly: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.bootstrapped && !authStore.bootstrapping) {
    await authStore.bootstrap();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (to.meta.publicOnly && authStore.isAuthenticated) {
    return {
      name: 'dashboard',
    };
  }

  const requiredPermissions = Array.isArray(to.meta.permissions) ? to.meta.permissions : [];

  if (requiredPermissions.length && !authStore.hasAllPermissions(requiredPermissions)) {
    return {
      name: 'forbidden',
    };
  }

  return true;
});

export default router;