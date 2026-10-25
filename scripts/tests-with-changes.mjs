// tests-with-changes check (spec 003, "CI checks").
//
// Fails when app/, src/ or supabase/migrations/ changed in a PR and no test file
// did, unless the PR carries the owner's waiver label.
//
// Usage (CI): CHANGED_FILES="$(git diff --name-only ...)" LABELS='["a","b"]' \
//             node scripts/tests-with-changes.mjs

import { pathToFileURL } from "node:url";

export const WAIVER_LABEL = "no-test-needed";
const CODE_PREFIXES = ["app/", "src/", "supabase/migrations/"];

const isCode = (file) => CODE_PREFIXES.some((p) => file.startsWith(p));
const isTest = (file) =>
  file.startsWith("tests/") || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

/**
 * @param {string[]} files paths changed by the PR
 * @param {string[]} labels labels on the PR
 * @returns {{ ok: boolean, reason: string }}
 */
export function checkTestsWithChanges(files, labels) {
  const code = files.filter(isCode);
  if (code.length === 0) {
    return { ok: true, reason: "No app/, src/ or migration files changed." };
  }
  if (files.some(isTest)) {
    return { ok: true, reason: "Code changed together with a test file." };
  }
  if (labels.includes(WAIVER_LABEL)) {
    return { ok: true, reason: `Waived by the "${WAIVER_LABEL}" label.` };
  }
  return {
    ok: false,
    reason:
      `These files changed but no test file did: ${code.join(", ")}. ` +
      `Add a test, or ask the owner to add the "${WAIVER_LABEL}" label.`,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = (process.env.CHANGED_FILES ?? "").split("\n").filter(Boolean);
  const labels = JSON.parse(process.env.LABELS || "[]");
  const result = checkTestsWithChanges(files, labels);
  (result.ok ? console.log : console.error)(result.reason);
  process.exit(result.ok ? 0 : 1);
}
