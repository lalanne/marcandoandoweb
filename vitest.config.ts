import { defineConfig } from "vitest/config";

import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    // Coverage is reported, with no threshold (spec 003, decision 1).
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["app/**", "src/**", "scripts/**"],
    },
  },
});
