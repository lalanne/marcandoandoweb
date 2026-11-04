// test-integrity check (spec 003, "Test integrity").
//
// Reads `git diff -U0 origin/main...HEAD` and fails when an existing test was
// weakened or removed: a deleted or renamed test file, a removed assertion or
// test declaration (an edit counts: it is a removal plus an addition), or an
// added .skip/.only/.fixme/.todo/xit/xdescribe/xtest. Added tests pass. The
// owner waives the check with a label.
//
// Usage (CI): LABELS='["a"]' git diff -U0 origin/main...HEAD | node scripts/test-integrity.mjs
//             (or DIFF_FILE=path instead of stdin)

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const WAIVER_LABEL = "test-change-reviewed";

const isTest = (file) =>
  file.startsWith("tests/") || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

const ASSERTION_OR_DECLARATION =
  /\b(?:expect|assert|it|test|describe)\b(?:\.\w+)*\(|\bassert\b/;
const DISABLER = /\.(?:skip|only|fixme|todo)\b|\b(?:xit|xdescribe|xtest)\b/;

/**
 * @param {string} diff unified diff text from `git diff -U0`
 * @param {string[]} labels labels on the PR
 * @returns {{ ok: boolean, reason: string }}
 */
export function checkTestIntegrity(diff, labels) {
  const problems = [];
  let file = null; // current (new) path
  let oldFile = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of diff.split("\n")) {
    let m;
    if ((m = line.match(/^diff --git a\/(.+) b\/(.+)$/))) {
      oldFile = m[1];
      file = m[2];
    } else if (line.startsWith("deleted file mode")) {
      if (isTest(oldFile)) problems.push(`${oldFile}: test file deleted`);
      file = null;
    } else if ((m = line.match(/^rename from (.+)$/))) {
      if (isTest(m[1])) problems.push(`${m[1]}: test file renamed`);
    } else if ((m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/))) {
      oldLine = Number(m[1]);
      newLine = Number(m[2]);
    } else if (file && isTest(file) && line.startsWith("--- ")) {
      // header, not content
    } else if (file && isTest(file) && line.startsWith("+++ ")) {
      // header, not content
    } else if (file && isTest(file) && line.startsWith("-")) {
      if (ASSERTION_OR_DECLARATION.test(line.slice(1))) {
        problems.push(`${file}:${oldLine}: removed ${line.slice(1).trim()}`);
      }
      oldLine++;
    } else if (file && isTest(file) && line.startsWith("+")) {
      if (DISABLER.test(line.slice(1))) {
        problems.push(`${file}:${newLine}: added ${line.slice(1).trim()}`);
      }
      newLine++;
    }
  }

  if (problems.length === 0) {
    return { ok: true, reason: "No existing test was weakened or removed." };
  }
  if (labels.includes(WAIVER_LABEL)) {
    return { ok: true, reason: `Waived by the "${WAIVER_LABEL}" label.` };
  }
  return {
    ok: false,
    reason:
      `Existing tests were weakened or removed:\n  ${problems.join("\n  ")}\n` +
      `If this is deliberate (for example the spec changed), explain it in the PR ` +
      `and ask the owner to add the "${WAIVER_LABEL}" label.`,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const diff = readFileSync(process.env.DIFF_FILE || 0, "utf8");
  const labels = JSON.parse(process.env.LABELS || "[]");
  const result = checkTestIntegrity(diff, labels);
  (result.ok ? console.log : console.error)(result.reason);
  process.exit(result.ok ? 0 : 1);
}
