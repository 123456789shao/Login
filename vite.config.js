import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split('\\').join('/');

          if (normalizedId.includes('/node_modules/')) {
            if (
              normalizedId.includes('/vue/') ||
              normalizedId.includes('/pinia/') ||
              normalizedId.includes('/vue-router/')
            ) {
              return 'framework';
            }

            if (normalizedId.includes('/axios/')) {
              return 'network';
            }

            return 'vendor';
          }

          if (
            normalizedId.includes('/src/stores/') ||
            normalizedId.includes('/src/api/') ||
            normalizedId.includes('/src/errors/') ||
            normalizedId.includes('/src/composables/') ||
            normalizedId.includes('/src/directives/')
          ) {
            return 'auth-core';
          }

          return undefined;
        },
      },
    },
  },
});