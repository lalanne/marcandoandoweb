import { existsSync, readFileSync, statSync } from "node:fs";
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

// Spec 002, criterion 127 (issue #174): the Casual illustration is a drawn SVG with
// the same aspect ratio (150 by 112) as the others, at most 30 KB.
describe("the Casual tab illustration", () => {
  const file = path.join(process.cwd(), "public", "img", "tab-casual.svg");

  it("[002-AC127] public/img/tab-casual.svg exists, is at most 30 KB and is an SVG of 150 by 112", () => {
    expect(existsSync(file), "tab-casual.svg is missing").toBe(true);
    expect(statSync(file).size).toBeLessThanOrEqual(MAX_BYTES);
    const svg = readFileSync(file, "utf8");
    expect(svg).toMatch(/<svg[^>]*viewBox="0 0 150 112"/);
    expect(svg).not.toMatch(/<script/i);
  });
});
