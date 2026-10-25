import { defineConfig } from "vitest/config";

export default defineConfig({
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
