<template>
  <section class="dashboard-grid">
    <article class="panel card">
      <h2>Session Overview</h2>
      <dl>
        <div>
          <dt>User</dt>
          <dd>{{ authStore.displayName }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{{ authStore.user?.email }}</dd>
        </div>
        <div>
          <dt>Roles</dt>
          <dd>{{ authStore.roles.join(', ') || 'None' }}</dd>
        </div>
        <div>
          <dt>Token Expires</dt>
          <dd>{{ tokenExpiryText }}</dd>
        </div>
      </dl>
      <div class="card-actions">
        <button class="primary" type="button" @click="refreshNow" :disabled="refreshing">
          {{ refreshing ? 'Refreshing...' : 'Refresh Session' }}
        </button>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </div>
    </article>

    <article class="panel card">
      <h2>Permissions</h2>
      <div class="badges">
        <span v-for="permission in authStore.permissions" :key="permission" class="badge">
          {{ permission }}
        </span>
      </div>
      <p v-if="!authStore.permissions.length" class="muted">No permissions granted.</p>
    </article>

    <article class="panel card full-row">
      <h2>Permission Demo Actions</h2>
      <div class="actions-wrap">
        <button v-permission="'admin:access'" class="ghost" type="button" @click="goAdmin">
          Open Admin Center
        </button>
        <button v-permission="'billing:read'" class="ghost" type="button">View Billing Dashboard</button>
        <button v-permission="'users:write'" class="ghost" type="button">Manage Team Members</button>
      </div>
      <p class="muted">
        Buttons above are controlled by <code>v-permission</code>. Route entry still enforces authorization in
        router guards.
      </p>
    </article>
  </section>
</template>

<script setup lang="ts">
// 仪表盘页：展示会话信息、手动刷新，并演示权限控制按钮。
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuthErrorMessage } from '../errors/auth-error';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const refreshing = ref(false);
const feedback = ref('');

const tokenExpiryText = computed(() => {
  if (!authStore.tokenExpiresAt) {
    return 'Unknown';
  }

  const expiry = new Date(authStore.tokenExpiresAt);
  return expiry.toLocaleString();
});

async function refreshNow(): Promise<void> {
  if (refreshing.value) {
    return;
  }

  refreshing.value = true;
  feedback.value = '';

  try {
    await authStore.refreshSession();
    feedback.value = 'Session refreshed successfully.';
  } catch (error) {
    feedback.value = getAuthErrorMessage(error);
  } finally {
    refreshing.value = false;
  }
}

function goAdmin(): void {
  router.push('/admin');
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card {
  padding: 1.2rem;
}

.full-row {
  grid-column: 1 / -1;
}

h2 {
  margin-top: 0;
}

dl {
  display: grid;
  gap: 0.8rem;
  margin: 0;
}

div {
  margin: 0;
}

dt {
  color: #95acce;
  font-size: 0.82rem;
  margin-bottom: 0.2rem;
}

dd {
  margin: 0;
}

.card-actions {
  margin-top: 1rem;
}

.primary {
  background: linear-gradient(135deg, #4bc2a6, #59d3ff);
  color: #061522;
  font-weight: 700;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  background: rgba(89, 211, 255, 0.14);
  border: 1px solid rgba(89, 211, 255, 0.4);
  border-radius: 999px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.78rem;
  padding: 0.25rem 0.65rem;
}

.actions-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 0.75rem;
}

.ghost {
  background: transparent;
  border-color: #355071;
  color: #d6e5f9;
}

.feedback {
  color: #8fe9c1;
  margin: 0.65rem 0 0;
}

.muted {
  color: #9ab0cf;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>