import { describe, expect, it } from "vitest";
import {
  checkTestsWithChanges,
  WAIVER_LABEL,
} from "../../scripts/tests-with-changes.mjs";

describe("tests-with-changes", () => {
  it("[003-AC2] fails when app/ changed and no test file did", () => {
    const result = checkTestsWithChanges(["app/page.tsx"], []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("app/page.tsx");
  });

  it("[003-AC2] passes when the PR has the waiver label", () => {
    const result = checkTestsWithChanges(["app/page.tsx"], [WAIVER_LABEL]);
    expect(result.ok).toBe(true);
  });

  it("the waiver label is no-test-needed", () => {
    expect(WAIVER_LABEL).toBe("no-test-needed");
  });

  it.each([
    ["src/lib/format.ts"],
    ["supabase/migrations/20260101_init.sql"],
  ])("fails when %s changed without a test", (file) => {
    expect(checkTestsWithChanges([file], []).ok).toBe(false);
  });

  it.each([
    ["tests/unit/format.test.ts"],
    ["tests/e2e/home.spec.ts"],
    ["tests/integration/rls.test.ts"],
  ])("passes when code changed together with %s", (testFile) => {
    expect(checkTestsWithChanges(["app/page.tsx", testFile], []).ok).toBe(true);
  });

  it("passes when only docs, specs or workflows changed", () => {
    const files = [
      "CLAUDE.md",
      "specs/003-ci-and-testing.md",
      ".github/workflows/ci.yml",
    ];
    expect(checkTestsWithChanges(files, []).ok).toBe(true);
  });

  it("does not treat a lookalike directory as code", () => {
    expect(checkTestsWithChanges(["application/x.ts"], []).ok).toBe(true);
  });
});
