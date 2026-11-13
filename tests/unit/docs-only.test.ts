import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isDocsFile, isDocsOnly } from "../../scripts/docs-only.mjs";
import { isDeployNeeded } from "../../scripts/deploy-needed.mjs";

describe("docs-only rule (spec 003, issue #146)", () => {
  it("[003-AC19] a list of docs, specs, assets, issue templates and markdown is docs only", () => {
    expect(
      isDocsOnly([
        "docs/requirements.md",
        "specs/003-ci-and-testing.md",
        "assets/logo.png",
        ".github/ISSUE_TEMPLATE/task.yml",
        "README.md",
        "CLAUDE.md",
        "app/NOTES.md",
      ]),
    ).toBe(true);
  });

  it.each([
    ["app/page.tsx"],
    ["package.json"],
    ["package-lock.json"],
    [".github/workflows/ci.yml"],
    ["scripts/x.mjs"],
    ["supabase/migrations/x.sql"],
    ["public/img/x.webp"],
    ["tests/unit/x.test.ts"],
  ])("[003-AC20] %s is not docs", (file) => {
    expect(isDocsFile(file)).toBe(false);
    expect(isDocsOnly([file])).toBe(false);
  });

  it("[003-AC20] a docs file mixed with a code file is not docs only", () => {
    expect(isDocsOnly(["docs/x.md", "app/page.tsx"])).toBe(false);
  });

  it("[003-AC21] an empty list is not docs only, while the deploy check still skips it", () => {
    expect(isDocsOnly([])).toBe(false);
    expect(isDeployNeeded([]).needed).toBe(false);
  });

  it("[003-AC25] the deploy check and the CI decision classify every file the same way", () => {
    const files = [
      "docs/a.md",
      "specs/a.md",
      "assets/a.png",
      ".github/ISSUE_TEMPLATE/a.yml",
      "README.md",
      "app/page.tsx",
      "package.json",
      ".github/workflows/ci.yml",
      "scripts/x.mjs",
      "supabase/migrations/x.sql",
      "public/img/x.webp",
      "tests/unit/x.test.ts",
    ];
    for (const file of files) {
      expect(isDeployNeeded([file]).needed).toBe(!isDocsFile(file));
    }
  });

  it("[003-AC25] deploy-needed.mjs imports the shared rule instead of keeping its own list", () => {
    const source = readFileSync("scripts/deploy-needed.mjs", "utf8");
    expect(source).toContain("./docs-only.mjs");
    expect(source).not.toContain("NON_RUNTIME_PREFIXES");
  });
});
