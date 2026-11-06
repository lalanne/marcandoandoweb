import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Issue #131: the production Supabase project is in us-west-2 (Oregon), so the
// functions run in Portland (pdx1), next to it, not in Vercel's default iad1.
const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));

describe("vercel.json", () => {
  it("runs the functions in pdx1, next to the Supabase project (us-west-2)", () => {
    expect(config.regions).toEqual(["pdx1"]);
  });

  it("keeps Vercel's own production deploys of main off", () => {
    expect(config.git.deploymentEnabled.main).toBe(false);
  });
});
