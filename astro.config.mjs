import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://flowpay.cash',
  output: 'server',
  integrations: [react()],
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4321')
  },
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    // Mantendo externalização do better-sqlite3 por segurança
    ssr: {
      external: ['better-sqlite3']
    }
  },
  publicDir: 'public',
  outDir: 'dist',
});
