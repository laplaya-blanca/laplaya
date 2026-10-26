import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The public site is the only Vite entry. admin/ (owner dashboard), content/, uploads/ and assets/
// are plain static folders: served as-is by the dev server and copied into dist/ by scripts/copy-static.mjs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'app' }
});
