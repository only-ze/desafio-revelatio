import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em desenvolvimento, as chamadas /api vão para o backend Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
  // O build vai para ../public, que o Express já serve em "/".
  build: { outDir: '../public', emptyOutDir: true },
});
