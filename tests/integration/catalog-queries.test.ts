import { describe, expect, it } from "vitest";
import { getCatalog } from "@/lib/catalog/queries";
import { anonClient } from "./helpers";

// The public page reads through getCatalog as the anonymous role, against the
// real local database seeded by supabase/seed.sql (fake data).
describe("getCatalog (anonymous, real database)", () => {
  it("[002-AC12] returns published products grouped by category, with no drafts", async () => {
    const { sections } = await getCatalog(anonClient());
    const slugs = sections.flatMap((s) => s.products.map((p) => p.slug));
    expect(slugs).toContain("demo-botella-ejemplo");
    expect(slugs).toContain("demo-polera-ejemplo");
    expect(slugs).not.toContain("demo-estuche-borrador");
    expect(sections.every((s) => s.products.length > 0)).toBe(true);
    expect(sections.map((s) => s.category.slug)).not.toContain("estuches");
  });

  it("[002-AC12] keeps unavailable products, flagged as unavailable", async () => {
    const { sections } = await getCatalog(anonClient());
    const all = sections.flatMap((s) => s.products);
    const sold = all.find((p) => p.slug === "demo-calcetines-agotados");
    expect(sold?.isAvailable).toBe(false);
    expect(all.find((p) => p.slug === "demo-botella-ejemplo")?.isAvailable).toBe(
      true,
    );
  });

  it("[002-AC12] returns only published designs", async () => {
    const { designs } = await getCatalog(anonClient());
    const slugs = designs.map((d) => d.slug);
    expect(slugs).toContain("demo-diseno-estrellas");
    expect(slugs).not.toContain("demo-diseno-borrador");
  });

  it("[002-AC16] gives the cover image of a product with its Spanish alt text", async () => {
    const { sections } = await getCatalog(anonClient());
    const botella = sections
      .flatMap((s) => s.products)
      .find((p) => p.slug === "demo-botella-ejemplo");
    expect(botella?.coverImage?.storagePath).toBe("demo/botella.webp");
    expect(botella?.coverImage?.altText).toBe(
      "Botella de ejemplo con un dibujo de estrellas",
    );
  });
});
