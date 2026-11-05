import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const database =
  process.env.TEST_DATABASE_URL ||
  "postgresql://catalogue:change-me@127.0.0.1:55432/catalogue_test?schema=public";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "node --experimental-strip-types src/server.ts",
      cwd: path.resolve(process.cwd(), "../backend"),
      url: "http://localhost:4100/api/ready",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: database,
        PUBLIC_ORIGIN: "http://localhost:3100",
        PORT: "4100",
        NODE_ENV: "test",
      },
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        API_INTERNAL_URL: "http://localhost:4100",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
