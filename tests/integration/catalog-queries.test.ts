import { describe, expect, it } from "vitest";
import { getCatalog } from "@/lib/catalog/queries";
import { ADMIN, anonClient, ok, signedInClient, uniqueSlug } from "./helpers";

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
    expect(botella?.images[0]?.storagePath).toBe("demo/botella.webp");
    expect(botella?.images[0]?.altText).toBe(
      "Botella de ejemplo con un dibujo de estrellas",
    );
  });

  it("[002-AC47] gives every photo of a published product in the admin's order, and none of an unpublished one", async () => {
    const admin = await signedInClient(ADMIN);
    const slug = uniqueSlug("fotos");
    const draftSlug = uniqueSlug("fotos-borrador");
    const p = ok(
      await admin
        .from("product")
        .insert({ slug, name: "Producto con fotos", is_published: true })
        .select()
        .single(),
    );
    const d = ok(
      await admin
        .from("product")
        .insert({ slug: draftSlug, name: "Borrador con fotos", is_published: false })
        .select()
        .single(),
    );
    try {
      ok(
        await admin.from("image").insert([
          { storage_path: `${slug}/3.png`, alt_text: "Tercera", position: 3, product_id: p.id },
          { storage_path: `${slug}/1.png`, alt_text: "Primera", position: 1, product_id: p.id },
          { storage_path: `${slug}/2.png`, alt_text: "Segunda", position: 2, product_id: p.id },
          { storage_path: `${draftSlug}/1.png`, alt_text: "Oculta", position: 1, product_id: d.id },
          { storage_path: `${draftSlug}/2.png`, alt_text: "Oculta", position: 2, product_id: d.id },
        ]),
      );
      const { products } = await getCatalog(anonClient());
      const all = [...products.producto, ...products.pack];
      const found = all.find((x) => x.slug === slug);
      expect(found?.images.map((i) => i.altText)).toEqual(["Primera", "Segunda", "Tercera"]);
      expect(all.find((x) => x.slug === draftSlug)).toBeUndefined();
    } finally {
      await admin.from("product").delete().in("id", [p.id, d.id]);
    }
  });
});
