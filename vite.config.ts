import { defineConfig } from 'vite';
import packageInfo from './package.json';

export default defineConfig({
  base: './',
  define: {
    // Keep the browser build and Electron package on one release number.
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
