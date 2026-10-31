import { describe, expect, it } from "vitest";
import { getCatalog } from "@/lib/catalog/queries";
import { anonClient } from "./helpers";

// The public page reads through getCatalog as the anonymous role, against the
// real local database seeded by supabase/seed.sql (fake data).
describe("getCatalog (anonymous, real database)", () => {
  it("[002-AC12] returns published products, with no drafts", async () => {
    const { products } = await getCatalog(anonClient());
    const slugs = [...products.producto, ...products.pack].map((p) => p.slug);
    expect(slugs).toContain("demo-botella-ejemplo");
    expect(slugs).toContain("demo-polera-ejemplo");
    expect(slugs).toContain("demo-pack-regalo");
    expect(slugs).not.toContain("demo-estuche-borrador");
    expect(slugs).not.toContain("demo-pack-borrador");
  });

  it("[002-AC33] splits the published products by type, highlighted first", async () => {
    const { products } = await getCatalog(anonClient());
    expect(products.producto.every((p) => p.kind === "producto")).toBe(true);
    expect(products.pack.every((p) => p.kind === "pack")).toBe(true);
    expect(products.producto.map((p) => p.slug)).toContain("demo-botella-ejemplo");
    // Other test files may add packs at the same time: check the seeded ones.
    const packs = products.pack.map((p) => p.slug);
    expect(packs).toContain("demo-pack-curso");
    // "Pack regalo" is highlighted, so it comes first though it sorts later.
    expect(packs[0]).toBe("demo-pack-regalo");
    expect(products.producto[0].slug).toBe("demo-botella-ejemplo");
  });

  it("[002-AC12] keeps unavailable products, flagged as unavailable", async () => {
    const { products } = await getCatalog(anonClient());
    const all = [...products.producto, ...products.pack];
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
    const { products } = await getCatalog(anonClient());
    const botella = products.producto.find((p) => p.slug === "demo-botella-ejemplo");
    expect(botella?.coverImage?.storagePath).toBe("demo/botella.webp");
    expect(botella?.coverImage?.altText).toBe(
      "Botella de ejemplo con un dibujo de estrellas",
    );
  });
});
