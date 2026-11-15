import { defineConfig, devices } from "@playwright/test";
import { supabaseEnv } from "./tests/e2e/supabase";

// Spec 003: end to end at 360 and 1280 px. In CI the production build is
// started (`npm run build` ran before); locally the dev server is used.
const { url, anonKey } = supabaseEnv();

// [002-AC98] saves in the panel at every step and then reads the cache, so it
// runs with the isolated projects too (issue #163): no other test saves, reads
// the catalog or rebuilds the cache while it runs. Same file, same code.
const ISOLATED_AT_TOP = /tests\/e2e\/catalog-cache\.spec\.ts$/;

export default defineConfig({
  testDir: "./tests/e2e",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile-360",
      testIgnore: [/isolated\//, ISOLATED_AT_TOP],
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "desktop-1280",
      testIgnore: [/isolated\//, ISOLATED_AT_TOP],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    // Tests that change shared seeded data (tests/e2e/isolated/) run only after
    // every other test, one viewport after the other and one file at a time
    // (workers: 1), so nothing else reads the database while they do.
    {
      name: "isolated-360",
      testMatch: [/isolated\/.*\.spec\.ts/, ISOLATED_AT_TOP],
      workers: 1,
      dependencies: ["mobile-360", "desktop-1280"],
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "isolated-1280",
      testMatch: [/isolated\/.*\.spec\.ts/, ISOLATED_AT_TOP],
      workers: 1,
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
