import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  integrations: [react()],
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    host: '0.0.0.0'
  },
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    ssr: {
      noExternal: ['better-sqlite3']
    }
  },
  publicDir: 'public',
  outDir: 'dist',
});
