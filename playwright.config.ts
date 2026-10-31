import { defineConfig, devices } from "@playwright/test";
import { supabaseEnv } from "./tests/e2e/supabase";

// Spec 003: end to end at 360 and 1280 px. In CI the production build is
// started (`npm run build` ran before); locally the dev server is used.
const { url, anonKey } = supabaseEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile-360",
      testIgnore: /isolated\//,
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "desktop-1280",
      testIgnore: /isolated\//,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    // Tests that change shared seeded data (tests/e2e/isolated/) run only after
    // every other test, and one viewport after the other, so nothing else reads
    // the database while they do.
    {
      name: "isolated-360",
      testMatch: /isolated\/.*\.spec\.ts/,
      dependencies: ["mobile-360", "desktop-1280"],
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "isolated-1280",
      testMatch: /isolated\/.*\.spec\.ts/,
      dependencies: ["isolated-360"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    },
  },
});
