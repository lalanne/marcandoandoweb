import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG_CACHE_LIFE, CATALOG_TAG } from "@/lib/catalog/cache";

// Spec 002, 2026-11-06 amendment (issues #136 and #138): the catalog is served
// from a cache that the panel refreshes and that rebuilds on its own within 1 hour.

describe("catalog cache lifetime", () => {
  it("[002-AC99] rebuilds within 1 hour, serving the old page while it does, and stays in the prerender", () => {
    // Changes made outside the panel show within 1 hour: the page is rebuilt at
    // most 3600 s after it was built...
    expect(CATALOG_CACHE_LIFE.revalidate).toBeGreaterThan(0);
    expect(CATALOG_CACHE_LIFE.revalidate).toBeLessThanOrEqual(3600);
    // ...and no visitor waits for the rebuild: the entry outlives `revalidate`, so
    // the old page is served while the new one is built (stale-while-revalidate).
    expect(CATALOG_CACHE_LIFE.expire).toBeGreaterThan(CATALOG_CACHE_LIFE.revalidate);
    // Next excludes a cache from the prerendered shell when revalidate is 0, expire
    // is under 5 minutes or stale is under 30 seconds (bundled docs, cacheLife,
    // "Prerendering behavior"); then every visit would read the database again.
    expect(CATALOG_CACHE_LIFE.expire).toBeGreaterThanOrEqual(300);
    expect(CATALOG_CACHE_LIFE.stale).toBeGreaterThanOrEqual(30);
  });

  it("uses one tag, which every panel action refreshes", () => {
    expect(CATALOG_TAG).toBe("catalog");
  });
});

describe("CI proves that a build without the database fails", () => {
  const ci = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
  const job = (name: string) => {
    const start = ci.indexOf(`\n  ${name}:\n`);
    expect(start, `job ${name}`).toBeGreaterThanOrEqual(0);
    const rest = ci.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
  };

  it("[002-AC102] the static job builds against a local database and has a step that expects a build with an unreachable one to fail", () => {
    const statik = job("static");
    // The real build needs a database to read the catalog from.
    expect(statik).toContain("npx supabase start");
    expect(statik).toContain("NEXT_PUBLIC_SUPABASE_URL=${LOCAL_API_URL}");
    // The proof: a build with an address nothing listens on must not succeed.
    expect(statik).toMatch(/NEXT_PUBLIC_SUPABASE_URL=http:\/\/127\.0\.0\.1:1 npm run build/);
    expect(statik).toMatch(/if [^\n]*npm run build[^\n]*; then/);
  });
});

describe("panel actions refresh the cache", () => {
  const source = readFileSync(join(process.cwd(), "app/panel/productos/actions.ts"), "utf8");
  const actions = source.split(/\nexport async function /).slice(1);

  it("[002-AC98] every exported action of the product panel calls refreshCatalog (a new one must too)", () => {
    // saveProduct, deleteProductAction, uploadPhoto, savePhoto, movePhoto, deletePhoto.
    expect(actions.length).toBe(6);
    for (const action of actions) {
      expect(action.slice(0, action.indexOf("(")), "action").toBeTruthy();
      expect(action, action.slice(0, action.indexOf("("))).toContain("refreshCatalog()");
    }
  });
});
