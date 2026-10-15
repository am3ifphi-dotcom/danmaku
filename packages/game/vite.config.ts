import { defineConfig } from 'vite';

// GitHub Pages serves the game from /<repo>/game/, so the production base must match that subpath.
export default defineConfig(() => ({
  base: './',
  server: { host: true, allowedHosts: true as const },
  preview: { host: true, allowedHosts: true as const },
  build: {
    target: 'es2022',
  },
}));
