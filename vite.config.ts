import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// App build/dev config. Vitest reads its own config from vitest.config.ts so the
// two concerns stay separate and the app bundle never pulls in test tooling.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
