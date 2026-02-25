// @ts-check
// ════════════════════════════════════════════════════════════════
// 🎭 FlowPay · Playwright E2E Configuration
// ════════════════════════════════════════════════════════════════
// Runs full user journeys against the running Astro dev server.
//
// Usage:
//   pnpm exec playwright test             # run all E2E tests
//   pnpm exec playwright test --ui        # interactive UI mode
//   pnpm exec playwright test --headed    # with browser visible
//   pnpm exec playwright show-report      # open last HTML report
//
// First time: install browsers with:
//   pnpm exec playwright install --with-deps chromium
// ════════════════════════════════════════════════════════════════

const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    // ── Test discovery ──────────────────────────────────────────
    testDir: "./tests/e2e",
    testMatch: ["**/*.spec.js"],

    // ── Global settings ─────────────────────────────────────────
    // Allow each test up to 60 s — PIX polling needs breathing room
    timeout: 60_000,
    // Give parallel workers a headstart: 2 retries on CI, 0 locally
    retries: process.env.CI ? 2 : 0,
    // Cap parallelism to avoid concurrency issues with DB/mocks
    workers: process.env.CI ? 2 : 1,
    // Full verbose output
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ],

    // ── Shared browser context ──────────────────────────────────
    use: {
        // Base URL of the running dev server
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:4321',
        // Keep traces on first retry for debugging
        trace: 'on-first-retry',
        // Screenshot on failure
        screenshot: 'only-on-failure',
        // Viewport — mobile-first (checkout is mobile-first)
        viewport: { width: 390, height: 844 },
        // Faster network emulation
        locale: 'pt-BR',
    },

    // ── Browser projects ────────────────────────────────────────
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'webkit',
            use: { ...devices['iPhone 14'] },
        },
    ],

    // ── Dev server ──────────────────────────────────────────────
    // Playwright will start the Astro dev server automatically
    // if it is not already running. Remove this block if you
    // prefer to start the server manually before running tests.
    webServer: {
        command: 'pnpm run dev',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
