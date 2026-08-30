import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  // Every spec reseeds the same shared MongoDB database via the admin
  // seed script (dropDatabase + reseed). Mirrors elexify.online's
  // playwright.config.ts: must always be 1 worker, not just in CI.
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4221",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_EXTERNAL_SERVER === "true" ? undefined : {
    command: "npx ng serve --configuration e2e --port 4221",
    url: "http://localhost:4221",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
