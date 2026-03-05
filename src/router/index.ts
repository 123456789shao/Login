/** 路由配置：使用懒加载页面，并接入登录态与权限守卫链路。 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const DashboardView = () => import('../views/DashboardView.vue');
const AdminView = () => import('../views/AdminView.vue');
const ForbiddenView = () => import('../views/ForbiddenView.vue');
const LoginView = () => import('../views/LoginView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');

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

  // bootstrap() 已做并发去重；此处统一 await，避免守卫竞态。
  await authStore.bootstrap();

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