import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const root = css.match(/:root\s*{([^}]*)}/)?.[1] ?? "";

describe("brand palette", () => {
  it.each([
    ["--brand-pink", "#E8647F"],
    ["--brand-yellow", "#F0B242"],
    ["--brand-teal", "#4FB0B0"],
    ["--brand-purple", "#9565C4"],
    ["--brand-night", "#141824"],
    ["--brand-cream", "#FBF5E9"],
  ])("defines %s as %s on :root", (name, value) => {
    expect(root.toLowerCase()).toContain(`${name}: ${value.toLowerCase()}`);
  });
});
