import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildVersion = process.env.RENDER_GIT_COMMIT || new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pwa-build-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: buildVersion })
        });
      }
    }
  ],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion)
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true, // Permitir cualquier host/dominio de Ngrok o IP de red local
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://backend:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
