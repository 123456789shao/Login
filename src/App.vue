<template>
  <div class="app-shell">
    <header v-if="authStore.isAuthenticated" class="topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <strong>{{ appName }}</strong>
      </div>
      <nav class="top-nav">
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink v-if="authStore.hasPermission('admin:access')" to="/admin">Admin</RouterLink>
      </nav>
      <div class="user-panel">
        <span>{{ authStore.displayName }}</span>
        <button class="ghost" type="button" @click="logout(false)">Sign Out</button>
        <button class="warn" type="button" @click="logout(true)">Sign Out All</button>
      </div>
    </header>

    <div v-if="authStore.sessionExpired" class="session-banner">
      Session expired. Please sign in again.
    </div>

    <main class="page-container">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const appName = computed(() => import.meta.env.VITE_APP_NAME || 'Enterprise Auth Starter');

async function logout(allDevices: boolean): Promise<void> {
  await authStore.logout({ allDevices });
  router.push('/login');
}
</script>