// Spec-to-test traceability check (spec 003, "Traceability").
//
// A test that proves a spec criterion carries its ID in its title, for example
// "[002-AC7] shows the hero" for criterion 7 of spec 002. This script fails when
//   1. a criterion of an ENFORCED spec has no test carrying its ID (and is not
//      listed in specs/traceability-exemptions.txt with a reason), or
//   2. a test title names an ID that exists in no spec.
//
// First-run rule (proposed in issue #30, for the owner to confirm): only specs
// whose status is `implemented` or `verified` are enforced for rule 1. Specs that
// are still `approved` have criteria with no tests yet, and requiring them today
// would make CI red from the first run. A spec becomes enforced the moment it is
// marked `implemented`, which matches specs/README.md ("moving the spec to
// `implemented` once every criterion's test passes"). Draft specs never
// require tests. Rule 2 looks at every spec (draft included), so a typo in an ID
// is always caught.
//
// Only test titles are scanned: the first string argument of it(), test() or
// describe() (also `.skip`, `.only`, `.describe`, etc.). IDs in comments or
// fixtures do not count. `it.each([...])("title")` titles are not scanned.
//
// Usage: node scripts/traceability.mjs   (run from the repository root)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ENFORCED_STATUSES = ["implemented", "verified"];
export const EXEMPTIONS_FILE = "specs/traceability-exemptions.txt";

/**
 * @param {string} markdown
 * @param {string} fileName e.g. "003-ci-and-testing.md"
 * @returns {{ id: string, status: string, criteria: number[] }}
 */
export function parseSpec(markdown, fileName) {
  const id = fileName.match(/^(\d{3})-/)?.[1] ?? "";
  const status =
    markdown.match(/^\*\*Status:\*\*\s*([A-Za-z]+)/m)?.[1].toLowerCase() ?? "";
  const criteria = [];
  let inSection = false;
  for (const line of markdown.split("\n")) {
    if (/^##\s/.test(line)) {
      inSection = /^##\s+Acceptance criteria\b/i.test(line);
      continue;
    }
    if (!inSection) continue;
    const n = line.match(/^(\d+)\.\s/)?.[1];
    if (n && !criteria.includes(Number(n))) criteria.push(Number(n));
  }
  return { id, status, criteria };
}

const TITLE_CALL =
  /\b(?:it|test|describe)(?:\.[A-Za-z]+)*\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
const ID_IN_TITLE = /\[(\d{3}-AC\d+)\]/g;

/**
 * @param {string} source contents of a test file
 * @returns {string[]} IDs such as "002-AC7"
 */
export function extractTestIds(source) {
  const ids = [];
  for (const call of source.matchAll(TITLE_CALL)) {
    for (const m of call[2].matchAll(ID_IN_TITLE)) ids.push(m[1]);
  }
  return ids;
}

/**
 * Each non-comment line is "<ID> <reason>".
 * @param {string} text
 * @returns {{ exemptions: Map<string, string>, errors: string[] }}
 */
export function parseExemptions(text) {
  const exemptions = new Map();
  const errors = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(\d{3}-AC\d+)\s+(\S.*)$/);
    if (m) exemptions.set(m[1], m[2]);
    else errors.push(`${EXEMPTIONS_FILE}: "${line}" needs an ID and a reason`);
  }
  return { exemptions, errors };
}

/**
 * @param {{
 *   specs: { id: string, status: string, criteria: number[] }[],
 *   testIds: Iterable<string>,
 *   exemptions: Map<string, string>,
 * }} input
 * @returns {string[]} problems; empty when the check passes
 */
export function checkTraceability({ specs, testIds, exemptions }) {
  const problems = [];
  const tested = new Set(testIds);
  const known = new Set(
    specs.flatMap((s) => s.criteria.map((n) => `${s.id}-AC${n}`)),
  );

  for (const spec of specs) {
    if (!ENFORCED_STATUSES.includes(spec.status)) continue;
    for (const n of spec.criteria) {
      const id = `${spec.id}-AC${n}`;
      if (!tested.has(id) && !exemptions.has(id)) {
        problems.push(
          `Criterion ${id} (spec ${spec.id}, criterion ${n}) has no test whose title carries [${id}]`,
        );
      }
    }
  }
  for (const id of [...tested].sort()) {
    if (!known.has(id)) {
      problems.push(`A test names [${id}], which exists in no spec`);
    }
  }
  return problems;
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(name)) files.push(path);
  }
  return files;
}

export function main(root = ".") {
  const specDir = join(root, "specs");
  const specs = readdirSync(specDir)
    .filter((f) => /^\d{3}-.*\.md$/.test(f))
    .map((f) => parseSpec(readFileSync(join(specDir, f), "utf8"), f));

  let exemptionText = "";
  try {
    exemptionText = readFileSync(join(root, EXEMPTIONS_FILE), "utf8");
  } catch {
    // No exemptions file is the same as an empty one.
  }
  const { exemptions, errors } = parseExemptions(exemptionText);

  const testIds = walk(join(root, "tests")).flatMap((f) =>
    extractTestIds(readFileSync(f, "utf8")),
  );

  const problems = [...errors, ...checkTraceability({ specs, testIds, exemptions })];
  if (problems.length > 0) {
    console.error(`Traceability check failed (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }
  const enforced = specs.filter((s) => ENFORCED_STATUSES.includes(s.status));
  console.log(
    `Traceability OK: ${enforced.length} enforced spec(s), ${new Set(testIds).size} criterion ID(s) in tests.`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
