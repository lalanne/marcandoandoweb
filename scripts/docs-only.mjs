// The one rule for "is this file documentation?" (spec 003, amendment of
// 2026-11-13, issue #146; spec 004). Used by the deploy check
// (scripts/deploy-needed.mjs) and by the CI `changes` job.
//
// Usage (CI workflow): CHANGED_FILES="$(git diff --name-only ...)" \
//   node scripts/docs-only.mjs
// Prints the reason, and appends `docs_only=true|false` to $GITHUB_OUTPUT when set.
// An empty list is NOT docs only here (fail safe: the full pipeline runs).

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DOCS_PREFIXES = ["docs/", "specs/", "assets/", ".github/ISSUE_TEMPLATE/"];

/** @param {string} file */
export const isDocsFile = (file) =>
  file.endsWith(".md") || DOCS_PREFIXES.some((prefix) => file.startsWith(prefix));

/**
 * @param {string[]} files
 * @returns {boolean} true only for a non-empty list of docs files
 */
export function isDocsOnly(files) {
  return files.length > 0 && files.every(isDocsFile);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = (process.env.CHANGED_FILES ?? "").split("\n").filter(Boolean);
  const docsOnly = isDocsOnly(files);
  console.log(
    files.length === 0
      ? "No changed files listed: running the full pipeline."
      : docsOnly
        ? `Docs only (${files.length} file(s)): the heavy jobs are skipped.`
        : `Not docs only: ${files.filter((f) => !isDocsFile(f)).join(", ")}. Running the full pipeline.`,
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${docsOnly}\n`);
  }
}
