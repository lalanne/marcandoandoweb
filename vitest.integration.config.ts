import { defineConfig } from "vitest/config";

// Integration tests run against local Supabase (spec 003). Start it first:
// see "Local Supabase" in CLAUDE.md.
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    // One database, shared by all files: run files one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
