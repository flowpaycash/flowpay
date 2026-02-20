import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";

export default defineConfig({
  site: "https://flowpay.cash",
  output: "server",
  integrations: [
    sitemap(),
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
      target: "es2020",
    },
    ssr: {
      external: ["better-sqlite3"],
      noExternal: ["@sentry/astro", "@sentry/core", "@sentry/browser"],
    },
  },
  publicDir: "public",
  outDir: "dist",
});
