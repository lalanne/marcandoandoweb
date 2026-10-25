import { describe, expect, it } from "vitest";
import {
  checkTraceability,
  extractTestIds,
  parseExemptions,
  parseSpec,
} from "../../scripts/traceability.mjs";

const specMarkdown = (status: string, criteria: string[]) =>
  [
    "# 009 - Sample",
    "",
    `**Status:** ${status} (by the owner, 2026-10-25)`,
    "",
    "## Notes",
    "",
    "1. A numbered list outside the criteria is not a criterion.",
    "",
    "## Acceptance criteria",
    "",
    "**Group heading**",
    "",
    ...criteria.map(
      (c, i) => `${i + 1}. Given ${c}, when it runs,\n   then it works.`,
    ),
    "",
    "## Verification plan",
    "",
    "1. Also not a criterion.",
  ].join("\n");

// Built at runtime so this file's own source never contains a test title that
// carries a criterion ID other than the real tests below.
const call = (fn: string, title: string, quote = '"') =>
  `${fn}(${quote}${title}${quote}, () => {});`;
const titled = (title: string) => call("it", title);

describe("parseSpec", () => {
  it("reads the number, status and criteria of an approved spec", () => {
    const spec = parseSpec(
      specMarkdown("approved", ["a", "b", "c"]),
      "009-sample.md",
    );
    expect(spec).toEqual({ id: "009", status: "approved", criteria: [1, 2, 3] });
  });

  it("reads a draft status", () => {
    expect(parseSpec(specMarkdown("draft", ["a"]), "009-x.md").status).toBe(
      "draft",
    );
  });

  it("returns no criteria when the spec has no acceptance section", () => {
    const spec = parseSpec(
      "# 000\n\n**Status:** approved\n\n## Vision\n\n1. x\n",
      "000-o.md",
    );
    expect(spec.criteria).toEqual([]);
  });
});

describe("extractTestIds", () => {
  it("finds the ID in it, test and describe titles", () => {
    const source = [
      titled("[002-AC7] shows the hero"),
      call("test", "[002-AC8] works", "'"),
      call("describe", "[001-AC1] group", "`"),
    ].join("\n");
    expect(extractTestIds(source).sort()).toEqual([
      "001-AC1",
      "002-AC7",
      "002-AC8",
    ]);
  });

  it("finds the ID in it.skip and test.describe titles", () => {
    const source = [
      call("it.skip", "[002-AC1] x"),
      call("test.describe", "[002-AC2] y"),
    ].join("\n");
    expect(extractTestIds(source).sort()).toEqual(["002-AC1", "002-AC2"]);
  });

  it("ignores IDs that are not in a test title (comments, fixtures)", () => {
    const source = [
      "// [002-AC7] in a comment",
      'const fixture = "[002-AC9]";',
      titled("no id here"),
    ].join("\n");
    expect(extractTestIds(source)).toEqual([]);
  });
});

describe("parseExemptions", () => {
  it("reads ID and reason, skipping comments and blank lines", () => {
    const text = "# header\n\n002-AC2 Needs the real production database\n";
    const { exemptions, errors } = parseExemptions(text);
    expect(errors).toEqual([]);
    expect(exemptions.get("002-AC2")).toBe("Needs the real production database");
  });

  it("reports a line with no reason", () => {
    const { errors } = parseExemptions("002-AC2\n");
    expect(errors.length).toBe(1);
  });
});

describe("checkTraceability", () => {
  const implemented = parseSpec(
    specMarkdown("implemented", ["a", "b"]),
    "009-s.md",
  );
  const approved = parseSpec(specMarkdown("approved", ["a", "b"]), "008-s.md");
  const draft = parseSpec(specMarkdown("draft", ["a"]), "007-s.md");
  const none = new Map<string, string>();

  it("[003-AC3] fails and names a criterion of an enforced spec with no test", () => {
    const problems = checkTraceability({
      specs: [implemented],
      testIds: ["009-AC1"],
      exemptions: none,
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("009-AC2");
  });

  it("[003-AC4] fails when a test names an ID absent from every spec", () => {
    const problems = checkTraceability({
      specs: [implemented],
      testIds: ["009-AC1", "009-AC2", "009-AC9", "010-AC1"],
      exemptions: none,
    });
    expect(problems.join("\n")).toContain("009-AC9");
    expect(problems.join("\n")).toContain("010-AC1");
    expect(problems).toHaveLength(2);
  });

  it("[003-AC5] passes for a criterion listed in the exemptions with a reason", () => {
    const problems = checkTraceability({
      specs: [implemented],
      testIds: ["009-AC1"],
      exemptions: new Map([["009-AC2", "Needs a real phone"]]),
    });
    expect(problems).toEqual([]);
  });

  it("passes when every criterion has a test", () => {
    const problems = checkTraceability({
      specs: [implemented],
      testIds: ["009-AC1", "009-AC2"],
      exemptions: none,
    });
    expect(problems).toEqual([]);
  });

  it("first-run rule: an approved spec does not need tests yet", () => {
    const problems = checkTraceability({
      specs: [approved],
      testIds: [],
      exemptions: none,
    });
    expect(problems).toEqual([]);
  });

  it("a verified spec is enforced like an implemented one", () => {
    const verified = parseSpec(specMarkdown("verified", ["a"]), "006-s.md");
    const problems = checkTraceability({
      specs: [verified],
      testIds: [],
      exemptions: none,
    });
    expect(problems.join("\n")).toContain("006-AC1");
  });

  it("ignores a draft spec", () => {
    const problems = checkTraceability({
      specs: [draft],
      testIds: [],
      exemptions: none,
    });
    expect(problems).toEqual([]);
  });

  it("accepts a test that names a criterion of a not-yet-enforced spec", () => {
    const problems = checkTraceability({
      specs: [approved],
      testIds: ["008-AC1"],
      exemptions: none,
    });
    expect(problems).toEqual([]);
  });
});
