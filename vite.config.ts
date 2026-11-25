import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const r = (p: string) => resolve(import.meta.dirname, p);
export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: { input: { inicio: r('index.html'), casa: r('casa-de-campo/index.html'), lotes: r('lotes/index.html'), privacidad: r('privacidad/index.html') } },
  },
});
