<template>
  <section class="login-page">
    <div class="login-card panel">
      <p class="kicker">ENTERPRISE ACCESS</p>
      <h1>LOGIN</h1>
      <p class="subtitle">Sign in to continue to your workspace.</p>

      <form class="login-form" @submit.prevent="submit">
        <label>
          Work Email
          <input v-model="form.email" type="email" autocomplete="username" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" autocomplete="current-password" required />
        </label>

        <button class="primary" type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="demo-accounts">
        <p>Demo accounts</p>
        <ul>
          <li><code>admin@corp.com / Admin@123</code></li>
          <li><code>viewer@corp.com / Viewer@123</code></li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 登录页：提交凭据、处理登录后跳转，并展示统一错误提示。
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAuthErrorMessage } from '../errors/auth-error';
import { useAuthStore } from '../stores/auth';
import type { LoginCredentials } from '../types/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const form = reactive<LoginCredentials>({
  email: 'admin@corp.com',
  password: 'Admin@123',
});

const submitting = ref(false);
const errorMessage = ref(authStore.sessionExpired ? 'Your session has expired. Please sign in again.' : '');

const redirectPath = computed(() => {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/';
});

async function submit(): Promise<void> {
  if (submitting.value) {
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    await authStore.login({ ...form });
    await router.replace(redirectPath.value);
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 3rem);
}

.login-card {
  max-width: 430px;
  padding: 2rem;
  width: 100%;
}

.kicker {
  color: #85a5cc;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  margin: 0;
}

h1 {
  font-size: 2rem;
  margin: 0.35rem 0;
}

.subtitle {
  color: #9ab0cf;
  margin: 0 0 1.4rem;
}

.login-form {
  display: grid;
  gap: 0.95rem;
}

label {
  color: #bdcce2;
  display: grid;
  font-size: 0.92rem;
  gap: 0.35rem;
}

input {
  background: rgba(14, 23, 38, 0.85);
  border: 1px solid #2f425f;
  border-radius: 10px;
  color: #e8eef7;
  font: inherit;
  outline: none;
  padding: 0.65rem 0.75rem;
}

input:focus {
  border-color: #4bc2a6;
  box-shadow: 0 0 0 3px rgba(75, 194, 166, 0.16);
}

.primary {
  background: linear-gradient(135deg, #4bc2a6, #59d3ff);
  color: #061522;
  font-weight: 700;
  margin-top: 0.5rem;
}

.error {
  background: rgba(255, 107, 107, 0.13);
  border: 1px solid rgba(255, 107, 107, 0.45);
  border-radius: 10px;
  color: #ffbebe;
  margin: 1rem 0 0;
  padding: 0.6rem 0.7rem;
}

.demo-accounts {
  border-top: 1px dashed #355071;
  color: #9ab0cf;
  margin-top: 1.2rem;
  padding-top: 1rem;
}

.demo-accounts p {
  margin: 0 0 0.45rem;
}

.demo-accounts ul {
  margin: 0;
  padding-left: 1rem;
}

code {
  color: #d0ddf0;
  font-family: Consolas, 'Courier New', monospace;
}
</style>