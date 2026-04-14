import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
const buildNumber = (() => { try { return fs.readFileSync(path.resolve(__dirname, '../build.txt'), 'utf-8').trim(); } catch { return '0'; } })();
const appVersion = pkg.version;
const hermesagentCompat = pkg.hermesagentCompat;

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:19788',
        ws: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __APP_VERSION__: JSON.stringify(appVersion),
    __HERMES_AGENT_COMPAT__: JSON.stringify(hermesagentCompat),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../internal/web/dist'),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            (warning.message && warning.message.includes('dynamically imported'))) {
          return;
        }
        warn(warning);
      }
    }
  },
});
