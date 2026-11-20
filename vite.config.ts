import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5199,
    strictPort: true,
    allowedHosts: true,
    hmr: process.env.FITBACK_ALWAYS_ON
      ? false
      : {
          clientPort: 5199,
        },
    proxy: {
      '/api/arbox': {
        target: 'http://127.0.0.1:5201',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arbox/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5198,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api/arbox': {
        target: 'http://127.0.0.1:5201',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arbox/, ''),
      },
    },
  },
});
