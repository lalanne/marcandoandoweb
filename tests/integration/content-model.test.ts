import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN,
  NON_ADMIN,
  anonClient,
  ok,
  signedInClient,
  uniqueSlug,
} from "./helpers";

// Spec 001 (content model), restricted to the launch 0 tables: product, design,
// image (spec 002, Data). Variants, themes, join tables and offers come with
// later specs, so their halves of a criterion are not tested.
//
// Categories were removed from the model on 2026-10-31 (spec 001 amendment,
// issue #63): a product has a `kind` instead. Issue #65 dropped the `category`
// table and `product.category_id`; the "categories are gone" block checks it.

let admin: SupabaseClient;
let nonAdmin: SupabaseClient;
let anon: SupabaseClient;

// Rows created by the tests, removed at the end.
const created = {
  product: [] as string[],
  design: [] as string[],
};

async function newProduct(overrides: Record<string, unknown> = {}) {
  const row = ok(
    await admin
      .from("product")
      .insert({
        slug: uniqueSlug("p"),
        name: "Producto de prueba",
        price_from_clp: 7000,
        ...overrides,
      })
      .select()
      .single(),
  );
  created.product.push(row.id);
  return row;
}

async function newDesign(overrides: Record<string, unknown> = {}) {
  const row = ok(
    await admin
      .from("design")
      .insert({ slug: uniqueSlug("d"), title: "Diseño de prueba", ...overrides })
      .select()
      .single(),
  );
  created.design.push(row.id);
  return row;
}

beforeAll(async () => {
  anon = anonClient();
  admin = await signedInClient(ADMIN);
  nonAdmin = await signedInClient(NON_ADMIN);
});

afterAll(async () => {
  if (created.product.length)
    await admin.from("product").delete().in("id", created.product);
  if (created.design.length)
    await admin.from("design").delete().in("id", created.design);
});

describe("constraints", () => {
  it("[001-AC1] rejects a negative or fractional price_from_clp", async () => {
    for (const price of [-1, 7000.5]) {
      const { error } = await admin.from("product").insert({
        slug: uniqueSlug("p"),
        name: "Precio malo",
        price_from_clp: price,
      });
      expect(error, `price ${price}`).not.toBeNull();
    }
    const zero = await newProduct({ price_from_clp: 0 });
    expect(zero.price_from_clp).toBe(0);
  });

  it("[001-AC1] allows a product with no price, and still rejects a negative one", async () => {
    const noPrice = await newProduct({ price_from_clp: null, is_published: true });
    expect(noPrice.price_from_clp).toBeNull();
    const seen = ok(await anon.from("product").select("id, price_from_clp").eq("id", noPrice.id));
    expect(seen).toEqual([{ id: noPrice.id, price_from_clp: null }]);

    const { error } = await admin
      .from("product")
      .update({ price_from_clp: -5 })
      .eq("id", noPrice.id);
    expect(error).not.toBeNull();
  });

  it("[001-AC3] rejects a second row with the same slug in product and design", async () => {
    const p = await newProduct();
    const dupProduct = await admin.from("product").insert({
      slug: p.slug,
      name: "Otro",
      price_from_clp: 1,
    });
    expect(dupProduct.error?.code).toBe("23505");

    const d = await newDesign();
    const dupDesign = await admin
      .from("design")
      .insert({ slug: d.slug, title: "Otro" });
    expect(dupDesign.error?.code).toBe("23505");
  });

  it("[001-AC5] rejects an image with no owner or with more than one owner", async () => {
    const p = await newProduct();
    const d = await newDesign();
    const base = {
      storage_path: "test/x.webp",
      alt_text: "Una botella de prueba",
      kind: "photo",
    };

    const none = await admin.from("image").insert(base);
    expect(none.error?.code).toBe("23514");

    const both = await admin
      .from("image")
      .insert({ ...base, product_id: p.id, design_id: d.id });
    expect(both.error?.code).toBe("23514");

    const one = await admin.from("image").insert({ ...base, product_id: p.id });
    expect(one.error).toBeNull();
  });

  it("[001-AC6] rejects an image with empty alt_text", async () => {
    const p = await newProduct();
    for (const alt of ["", "   "]) {
      const { error } = await admin.from("image").insert({
        storage_path: "test/x.webp",
        alt_text: alt,
        kind: "photo",
        product_id: p.id,
      });
      expect(error?.code, `alt "${alt}"`).toBe("23514");
    }
  });

  it("[001-AC8] deletes a product's image rows when the product is deleted", async () => {
    const p = await newProduct();
    ok(
      await admin.from("image").insert({
        storage_path: "test/y.webp",
        alt_text: "Foto de prueba",
        kind: "photo",
        product_id: p.id,
      }),
    );
    expect(
      ok(await admin.from("image").select("id").eq("product_id", p.id)),
    ).toHaveLength(1);

    ok(await admin.from("product").delete().eq("id", p.id));
    expect(
      ok(await admin.from("image").select("id").eq("product_id", p.id)),
    ).toHaveLength(0);
  });
});

describe("public visibility (anonymous)", () => {
  it("[001-AC13] does not return an unpublished product or its images", async () => {
    const hidden = await newProduct({ is_published: false });
    ok(
      await admin.from("image").insert({
        storage_path: "test/hidden.webp",
        alt_text: "Foto oculta",
        kind: "photo",
        product_id: hidden.id,
      }),
    );

    const byId = ok(await anon.from("product").select("id").eq("id", hidden.id));
    expect(byId).toEqual([]);
    const list = ok(await anon.from("product").select("id"));
    expect(list.map((r: { id: string }) => r.id)).not.toContain(hidden.id);
    const images = ok(
      await anon.from("image").select("id").eq("product_id", hidden.id),
    );
    expect(images).toEqual([]);
  });

  it("[001-AC13] returns the images of a published product", async () => {
    const shown = await newProduct({ is_published: true });
    ok(
      await admin.from("image").insert({
        storage_path: "test/shown.webp",
        alt_text: "Foto visible",
        kind: "photo",
        product_id: shown.id,
      }),
    );
    expect(
      ok(await anon.from("image").select("id").eq("product_id", shown.id)),
    ).toHaveLength(1);
  });

  it("[001-AC15] lists only the published product of a kind", async () => {
    for (const kind of ["producto", "pack"]) {
      const shown = await newProduct({ kind, is_published: true });
      const hidden = await newProduct({ kind, is_published: false });

      const rows = ok(
        await anon
          .from("product")
          .select("id")
          .eq("kind", kind)
          .in("id", [shown.id, hidden.id]),
      );
      expect(rows.map((r: { id: string }) => r.id), kind).toEqual([shown.id]);
    }
  });

  it("[001-AC23] returns each published product with its kind, and filters by kind", async () => {
    const producto = await newProduct({ kind: "producto", is_published: true });
    const pack = await newProduct({ kind: "pack", is_published: true });
    const draftPack = await newProduct({ kind: "pack", is_published: false });
    const ids = [producto.id, pack.id, draftPack.id];

    const all = ok(
      await anon.from("product").select("id, kind").in("id", ids).order("kind"),
    );
    expect(all).toEqual([
      { id: pack.id, kind: "pack" },
      { id: producto.id, kind: "producto" },
    ]);

    const packs = ok(
      await anon.from("product").select("id").eq("kind", "pack").in("id", ids),
    );
    expect(packs).toEqual([{ id: pack.id }]);
  });

  it("[001-AC16] does not return an unpublished design", async () => {
    const hidden = await newDesign({ is_published: false });
    const shown = await newDesign({ is_published: true });
    const ids = ok(await anon.from("design").select("id")).map(
      (r: { id: string }) => r.id,
    );
    expect(ids).toContain(shown.id);
    expect(ids).not.toContain(hidden.id);
    expect(
      ok(await anon.from("design").select("id").eq("id", hidden.id)),
    ).toEqual([]);
  });

});

// The same attempts, as the public and as a signed-in non-admin.
function rejectsWrites(
  label: string,
  id: string,
  getClient: () => SupabaseClient,
) {
  it(`${id} rejects create, change and delete of every table as ${label}`, async () => {
    const client = getClient();
    const p = await newProduct({ is_published: true });
    const d = await newDesign({ is_published: true });
    const img = ok(
      await admin
        .from("image")
        .insert({
          storage_path: "test/w.webp",
          alt_text: "Foto",
          kind: "photo",
          product_id: p.id,
        })
        .select()
        .single(),
    );

    // Create: refused outright.
    const inserts = await Promise.all([
      client.from("product").insert({
        slug: uniqueSlug("p"),
        name: "X",
        price_from_clp: 1,
        kind: "pack",
      }),
      client.from("design").insert({ slug: uniqueSlug("d"), title: "X" }),
      client.from("image").insert({
        storage_path: "test/n.webp",
        alt_text: "X",
        kind: "photo",
        product_id: p.id,
      }),
    ]);
    for (const r of inserts) expect(r.error?.code).toBe("42501");

    // Change and delete: the write touches no row, so nothing is returned.
    const changes = await Promise.all([
      client.from("product").update({ name: "Hackeado" }).eq("id", p.id).select(),
      client.from("product").update({ kind: "pack" }).eq("id", p.id).select(),
      client.from("design").update({ title: "Hackeado" }).eq("id", d.id).select(),
      client.from("image").update({ alt_text: "Hackeada" }).eq("id", img.id).select(),
    ]);
    for (const r of changes) expect(r.data ?? []).toEqual([]);

    const deletes = await Promise.all([
      client.from("product").delete().eq("id", p.id).select(),
      client.from("design").delete().eq("id", d.id).select(),
      client.from("image").delete().eq("id", img.id).select(),
    ]);
    for (const r of deletes) expect(r.data ?? []).toEqual([]);

    // Nothing changed, checked as the admin.
    expect(
      ok(await admin.from("product").select("name, kind").eq("id", p.id).single()),
    ).toEqual({ name: "Producto de prueba", kind: "producto" });
    expect(
      ok(await admin.from("design").select("title").eq("id", d.id).single()).title,
    ).toBe("Diseño de prueba");
    expect(
      ok(await admin.from("image").select("alt_text").eq("id", img.id).single())
        .alt_text,
    ).toBe("Foto");
  });
}

describe("writes", () => {
  rejectsWrites("the public (not signed in)", "[001-AC18]", () => anon);
  rejectsWrites(
    "a signed-in user who is not the admin",
    "[001-AC19]",
    () => nonAdmin,
  );

  it("[001-AC20] lets the admin create, change and delete every table and read unpublished rows", async () => {
    const p = await newProduct({ is_published: false });
    ok(
      await admin
        .from("product")
        .update({ price_from_clp: 5500, kind: "pack" })
        .eq("id", p.id),
    );
    expect(
      ok(
        await admin.from("product").select("price_from_clp, kind").eq("id", p.id).single(),
      ),
    ).toEqual({ price_from_clp: 5500, kind: "pack" });

    const d = await newDesign({ is_published: false });
    ok(await admin.from("design").update({ title: "Nuevo título" }).eq("id", d.id));

    const img = ok(
      await admin
        .from("image")
        .insert({
          storage_path: "test/a.webp",
          alt_text: "Foto",
          kind: "graphic",
          design_id: d.id,
        })
        .select()
        .single(),
    );
    ok(await admin.from("image").update({ alt_text: "Foto nueva" }).eq("id", img.id));

    // The admin reads unpublished rows, and an unpublished design's image.
    expect(ok(await admin.from("product").select("id").eq("id", p.id))).toHaveLength(1);
    expect(ok(await admin.from("design").select("id").eq("id", d.id))).toHaveLength(1);
    expect(ok(await admin.from("image").select("id").eq("id", img.id))).toHaveLength(1);

    // Delete.
    expect(ok(await admin.from("image").delete().eq("id", img.id).select())).toHaveLength(1);
    expect(ok(await admin.from("design").delete().eq("id", d.id).select())).toHaveLength(1);
    expect(ok(await admin.from("product").delete().eq("id", p.id).select())).toHaveLength(1);
  });
});

describe("product kind", () => {
  it("[001-AC22] saves a product with no kind as producto", async () => {
    const p = await newProduct();
    expect(p.kind).toBe("producto");
  });

  it("[001-AC22] accepts producto and pack", async () => {
    expect((await newProduct({ kind: "producto" })).kind).toBe("producto");
    expect((await newProduct({ kind: "pack" })).kind).toBe("pack");
  });

  it("[001-AC22] rejects any other kind, and null, on insert and on update", async () => {
    for (const kind of ["Pack", "bundle", "botellas", ""]) {
      const { error } = await admin
        .from("product")
        .insert({ slug: uniqueSlug("p"), name: "Tipo malo", kind });
      expect(error?.code, `kind "${kind}"`).toBe("23514");
    }
    const nullKind = await admin
      .from("product")
      .insert({ slug: uniqueSlug("p"), name: "Sin tipo", kind: null });
    expect(nullKind.error?.code).toBe("23502");

    const p = await newProduct({ kind: "pack" });
    const bad = await admin.from("product").update({ kind: "otro" }).eq("id", p.id);
    expect(bad.error?.code).toBe("23514");
    expect(
      ok(await admin.from("product").select("kind").eq("id", p.id).single()).kind,
    ).toBe("pack");
  });
});

// Issue #65 (contract step of the 2026-10-31 amendment): nothing of the
// categories is left in the database.
describe("categories are gone", () => {
  it("has no category table, for the public or the admin", async () => {
    for (const client of [anon, admin]) {
      const { data, error } = await client.from("category").select("id").limit(1);
      expect(data).toBeNull();
      // PostgREST answers "not in the schema cache" (PGRST205) for a missing
      // table; older versions passed Postgres's 42P01 through.
      expect(["PGRST205", "42P01"]).toContain(error?.code);
    }
  });

  it("has no category_id column on product", async () => {
    const { error } = await admin.from("product").select("category_id").limit(1);
    expect(error?.code).toBe("42703");
  });
});
