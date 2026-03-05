import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setupHttpInterceptors } from './api/http';
import { registerPermissionDirective } from './directives/permission';
import { setupAuthSync } from './composables/useAuthSync';
import './styles/main.css';

const app = createApp(App);
const pinia = createPinia();

setActivePinia(pinia);
app.use(pinia);

const authStore = useAuthStore();
setupHttpInterceptors(authStore);
setupAuthSync(authStore);
registerPermissionDirective(app, authStore);

app.use(router);

authStore.bootstrap().finally(() => {
  app.mount('#app');
});