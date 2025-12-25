import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  adapter: netlify({
    functionPerRoute: false,
  }),
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
  // Public dir será copiado para dist durante o build
  publicDir: 'public',
  // Output para dist (padrão do Astro)
  outDir: 'dist',
});

