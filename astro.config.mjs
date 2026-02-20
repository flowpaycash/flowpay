import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sentry from "@sentry/astro";

export default defineConfig({
  site: "https://flowpay.cash",
  output: "server",
  integrations: [
    react(),
    sentry({
      sourceMapsUploadOptions: {
        project: "javascript-astro",
        org: "flowpay-ms",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4321"),
  },
  build: {
    assets: "assets",
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    // Mantendo externalização do better-sqlite3 por segurança
    ssr: {
      external: ["better-sqlite3"],
    },
  },
  publicDir: "public",
  outDir: "dist",
});
