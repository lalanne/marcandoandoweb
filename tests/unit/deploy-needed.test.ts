import { describe, expect, it } from "vitest";
import { isDeployNeeded } from "../../scripts/deploy-needed.mjs";

describe("deploy-needed", () => {
  it("[004-AC6] skips a change that only touches docs and specs", () => {
    const result = isDeployNeeded([
      "docs/requirements.md",
      "specs/004-deployment.md",
    ]);
    expect(result.needed).toBe(false);
  });

  it.each([
    ["README.md"],
    ["CLAUDE.md"],
    ["app/NOTES.md"],
    ["assets/logo.png"],
    [".github/ISSUE_TEMPLATE/task.yml"],
  ])("[004-AC6] skips a change that only touches %s", (file) => {
    expect(isDeployNeeded([file]).needed).toBe(false);
  });

  it.each([
    ["app/page.tsx"],
    ["supabase/migrations/20260101_init.sql"],
    ["package.json"],
    ["package-lock.json"],
    ["vercel.json"],
    ["public/img/hero.webp"],
    [".github/workflows/deploy.yml"],
    ["scripts/deploy-needed.mjs"],
  ])("[004-AC1] requests a deploy when %s changed", (file) => {
    expect(isDeployNeeded([file]).needed).toBe(true);
  });

  it("[004-AC1] deploys when a runtime file is mixed with docs", () => {
    const result = isDeployNeeded(["docs/x.md", "app/page.tsx"]);
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("app/page.tsx");
  });

  it("does not deploy when nothing changed", () => {
    expect(isDeployNeeded([]).needed).toBe(false);
  });

  it("does not treat a folder that merely starts with docs as docs", () => {
    expect(isDeployNeeded(["docs-extra/a.ts"]).needed).toBe(true);
  });
});
