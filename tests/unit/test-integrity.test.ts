import { describe, expect, it } from "vitest";
import {
  checkTestIntegrity,
  WAIVER_LABEL,
} from "../../scripts/test-integrity.mjs";

// Builds the text of `git diff -U0` for one existing file.
const edit = (file: string, hunks: string) =>
  `diff --git a/${file} b/${file}\nindex 111..222 100644\n--- a/${file}\n+++ b/${file}\n${hunks}`;

describe("test-integrity", () => {
  it("[003-AC13] fails and names a deleted test file", () => {
    const diff =
      "diff --git a/tests/unit/a.test.ts b/tests/unit/a.test.ts\n" +
      "deleted file mode 100644\nindex 111..000\n--- a/tests/unit/a.test.ts\n+++ /dev/null\n" +
      '@@ -1,2 +0,0 @@\n-import "x";\n-it("a", () => {});\n';
    const result = checkTestIntegrity(diff, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tests/unit/a.test.ts");
  });

  it("[003-AC13] fails and names a renamed test file", () => {
    const diff =
      "diff --git a/tests/unit/a.test.ts b/tests/unit/b.test.ts\n" +
      "similarity index 100%\nrename from tests/unit/a.test.ts\nrename to tests/unit/b.test.ts\n";
    const result = checkTestIntegrity(diff, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tests/unit/a.test.ts");
  });

  it("[003-AC14] fails and names the file and line of a removed expect", () => {
    const diff = edit(
      "tests/unit/a.test.ts",
      "@@ -10,1 +9,0 @@ describe\n-    expect(total).toBe(3);\n",
    );
    const result = checkTestIntegrity(diff, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tests/unit/a.test.ts:10");
  });

  it("[003-AC14] fails on an edited assertion (removal plus addition)", () => {
    const diff = edit(
      "tests/e2e/home.spec.ts",
      "@@ -4 +4 @@\n-  expect(count).toBe(3);\n+  expect(count).toBeGreaterThan(0);\n",
    );
    const result = checkTestIntegrity(diff, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tests/e2e/home.spec.ts:4");
  });

  it.each([
    ['  it("shows the hero", () => {'],
    ['  test("shows the hero", async () => {'],
    ['describe("home", () => {'],
    ["  assert.equal(a, b);"],
  ])("[003-AC14] fails on a removed declaration or assertion: %s", (line) => {
    const diff = edit("tests/unit/a.test.ts", `@@ -7 +6,0 @@\n-${line}\n`);
    expect(checkTestIntegrity(diff, []).ok).toBe(false);
  });

  // Built from parts so this file does not itself contain a disabled test.
  it.each([
    ["it", ".sk" + "ip"],
    ["test", ".on" + "ly"],
    ["test", ".fix" + "me"],
    ["it", ".to" + "do"],
    ["x", "it"],
    ["x", "describe"],
    ["x", "test"],
  ])("[003-AC15] fails on an added %s%s", (a, b) => {
    const word = a + b;
    const diff = edit(
      "tests/unit/a.test.ts",
      `@@ -5,0 +6 @@\n+${word}("later", () => {});\n`,
    );
    const result = checkTestIntegrity(diff, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tests/unit/a.test.ts:6");
  });

  it("[003-AC16] passes when a PR only adds tests to an existing file", () => {
    const diff = edit(
      "tests/unit/a.test.ts",
      '@@ -20,0 +21,3 @@\n+it("new", () => {\n+  expect(1).toBe(1);\n+});\n',
    );
    expect(checkTestIntegrity(diff, []).ok).toBe(true);
  });

  it("[003-AC16] passes for a new test file", () => {
    const diff =
      "diff --git a/tests/unit/new.test.ts b/tests/unit/new.test.ts\nnew file mode 100644\nindex 000..111\n--- /dev/null\n+++ b/tests/unit/new.test.ts\n" +
      '@@ -0,0 +1,2 @@\n+it("n", () => {});\n+expect(1).toBe(1);\n';
    expect(checkTestIntegrity(diff, []).ok).toBe(true);
  });

  it("[003-AC16] passes when only imports and helpers are edited", () => {
    const diff = edit(
      "tests/unit/a.test.ts",
      '@@ -1 +1 @@\n-import { a } from "../a";\n+import { a, b } from "../a";\n@@ -3 +3 @@\n-const helper = () => 1;\n+const helper = () => 2;\n',
    );
    expect(checkTestIntegrity(diff, []).ok).toBe(true);
  });

  it("[003-AC16] ignores removed assertions outside test files", () => {
    const diff = edit("lib/x.ts", "@@ -1 +0,0 @@\n-expect(x);\n");
    expect(checkTestIntegrity(diff, []).ok).toBe(true);
  });

  it("[003-AC17] passes a failing PR that carries the waiver label", () => {
    const diff = edit("tests/unit/a.test.ts", "@@ -7 +6,0 @@\n-  expect(a).toBe(1);\n");
    expect(checkTestIntegrity(diff, []).ok).toBe(false);
    expect(checkTestIntegrity(diff, [WAIVER_LABEL]).ok).toBe(true);
    expect(WAIVER_LABEL).toBe("test-change-reviewed");
  });

  it("[003-AC18] does nothing on a push (the job runs only for pull requests)", async () => {
    const { readFileSync } = await import("node:fs");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const job = ci.split(/\n {2}test-integrity:\n/)[1]?.split(/\n {2}\S/)[0] ?? "";
    expect(job).toContain("if: github.event_name == 'pull_request'");
  });
});
