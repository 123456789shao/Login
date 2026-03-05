/** 应用入口：初始化 Pinia、鉴权能力与路由，并挂载 Vue 应用。 */
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