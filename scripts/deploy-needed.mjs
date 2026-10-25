// Decides whether a commit on main needs a production deployment (spec 004,
// flow step 3 and open question 2).
//
// Docs-only, spec-only, markdown-only, asset-only and issue-template-only changes
// skip the deployment. Anything else is a runtime file and deploys.
//
// Usage (deploy workflow): CHANGED_FILES="$(git diff --name-only ...)" \
//   node scripts/deploy-needed.mjs
// Prints the reason, and appends `needed=true|false` to $GITHUB_OUTPUT when set.

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const NON_RUNTIME_PREFIXES = [
  "docs/",
  "specs/",
  "assets/",
  ".github/ISSUE_TEMPLATE/",
];

const isRuntime = (file) =>
  !file.endsWith(".md") &&
  !NON_RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix));

/**
 * @param {string[]} files paths changed since the last deployed commit
 * @returns {{ needed: boolean, reason: string }}
 */
export function isDeployNeeded(files) {
  const runtime = files.filter(isRuntime);
  if (runtime.length > 0) {
    return { needed: true, reason: `Runtime files changed: ${runtime.join(", ")}.` };
  }
  return {
    needed: false,
    reason: "Only docs, specs, assets, markdown or issue templates changed (or nothing).",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = (process.env.CHANGED_FILES ?? "").split("\n").filter(Boolean);
  const result = isDeployNeeded(files);
  console.log(result.reason);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `needed=${result.needed}\n`);
  }
}
