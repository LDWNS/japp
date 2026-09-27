import { defineConfig, devices } from "@playwright/test";

// Runs against the static export; `pnpm build` first (pnpm check does both).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm exec serve out -l 3100 --no-request-logging",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
