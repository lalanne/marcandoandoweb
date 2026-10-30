import { defineConfig, devices } from "@playwright/test";

// Spec 004, criteria 12 to 16: the post-deploy smoke test. It runs against any
// URL given in PRODUCTION_URL (or SMOKE_BASE_URL), starts no server and is not
// part of `npm run test:e2e`. Read-only: GET requests only, no credentials.
const baseURL = process.env.PRODUCTION_URL || process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: "./tests/smoke",
  // Each check retries itself while the new deployment becomes live; see the spec.
  retries: 0,
  timeout: (Number(process.env.SMOKE_RETRY_SECONDS ?? 60) + 30) * 1000,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: process.env.SMOKE_RESULTS_FILE ?? "smoke-results.json" }],
  ],
  outputDir: "test-results-smoke",
  use: { baseURL, ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
});
