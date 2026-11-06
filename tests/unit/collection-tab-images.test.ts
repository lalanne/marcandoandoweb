import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Spec 002, criterion 95 (issue #126): the three tab illustrations are files in
// public/img/ of at most 30 KB each.
const MAX_BYTES = 30 * 1024;

describe("collection tab illustrations", () => {
  for (const name of ["tab-todos.webp", "tab-navidad.webp", "tab-escolar.webp"]) {
    it(`[002-AC95] public/img/${name} exists and is at most 30 KB`, () => {
      const file = path.join(process.cwd(), "public", "img", name);
      expect(existsSync(file), `${name} is missing`).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(MAX_BYTES);
    });
  }
});
