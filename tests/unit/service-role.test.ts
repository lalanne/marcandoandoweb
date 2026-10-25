import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [path] : [];
  });
}

// The service-role key bypasses row-level security. Only scripts/ and tests may
// read it; the app (and so the browser bundle) never does.
describe("service-role key", () => {
  it("is never referenced by app code", () => {
    const files = [
      ...sourceFiles("app"),
      ...sourceFiles("lib"),
      "proxy.ts",
    ];
    const offenders = files.filter((file) =>
      /service_role|SERVICE_ROLE/i.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
