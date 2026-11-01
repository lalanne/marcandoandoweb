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

// Spec 001, criteria 24 to 28 (amendment of 2026-10-31, issue #87): colors,
// sizes and characteristics.
describe("colors, sizes and characteristics", () => {
  const rosado = { name: "Rosado", hex: "#E8647F" };

  it("[001-AC24] rejects a bad colors list", async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      name: `Color ${i}`,
      hex: "#E8647F",
    }));
    const bad: [string, unknown][] = [
      ["empty name", [{ name: "", hex: "#E8647F" }]],
      ["blank name", [{ name: "   ", hex: "#E8647F" }]],
      ["name over 30", [{ name: "x".repeat(31), hex: "#E8647F" }]],
      ["hex without #", [{ name: "Rosado", hex: "E8647F" }]],
      ["short hex", [{ name: "Rosado", hex: "#E86" }]],
      ["hex not hex", [{ name: "Rosado", hex: "#GGGGGG" }]],
      ["missing hex", [{ name: "Rosado" }]],
      ["not a list", { name: "Rosado", hex: "#E8647F" }],
      ["21 entries", tooMany],
    ];
    for (const [label, colors] of bad) {
      const { error } = await admin
        .from("product")
        .insert({ slug: uniqueSlug("p"), name: "Colores malos", colors });
      expect(error?.code, label).toBe("23514");
    }
  });

  it("[001-AC24] accepts colors, 20 of them, and defaults to an empty list", async () => {
    const p = await newProduct({
      colors: [rosado, { name: "Celeste", hex: "#4FB0B0" }],
    });
    expect(p.colors).toEqual([rosado, { name: "Celeste", hex: "#4FB0B0" }]);
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      name: `Color ${i}`,
      hex: "#4FB0B0",
    }));
    expect((await newProduct({ colors: twenty })).colors).toHaveLength(20);
    expect((await newProduct()).colors).toEqual([]);

    const bad = await admin
      .from("product")
      .update({ colors: [{ name: "", hex: "#E8647F" }] })
      .eq("id", p.id);
    expect(bad.error?.code).toBe("23514");
  });

  it("[001-AC25] rejects a bad sizes list", async () => {
    const bad: [string, unknown][] = [
      ["empty label", ["4", ""]],
      ["blank label", ["  "]],
      ["label over 20", ["x".repeat(21)]],
      ["21 labels", Array.from({ length: 21 }, (_, i) => `T${i}`)],
      ["not text", [4]],
      ["not a list", "4"],
    ];
    for (const [label, sizes] of bad) {
      const { error } = await admin
        .from("product")
        .insert({ slug: uniqueSlug("p"), name: "Tallas malas", sizes });
      expect(error?.code, label).toBe("23514");
    }
  });

  it("[001-AC25] accepts sizes in the order given, and defaults to an empty list", async () => {
    const p = await newProduct({ sizes: ["4", "6", "8", "500 ml"] });
    expect(p.sizes).toEqual(["4", "6", "8", "500 ml"]);
    expect((await newProduct({ sizes: ["x".repeat(20)] })).sizes).toHaveLength(1);
    expect((await newProduct()).sizes).toEqual([]);
  });

  it("[001-AC26] rejects characteristics over 1000 characters; accepts empty and default", async () => {
    const { error } = await admin.from("product").insert({
      slug: uniqueSlug("p"),
      name: "Largo",
      characteristics: "x".repeat(1001),
    });
    expect(error?.code).toBe("23514");

    expect(
      (await newProduct({ characteristics: "x".repeat(1000) })).characteristics,
    ).toHaveLength(1000);
    expect((await newProduct({ characteristics: "" })).characteristics).toBe("");
    expect((await newProduct()).characteristics).toBe("");
  });

  it("[001-AC27] gives the public all three of a published product, in order", async () => {
    const colors = [rosado, { name: "Celeste", hex: "#4FB0B0" }, { name: "Amarillo", hex: "#F0B242" }];
    const p = await newProduct({
      is_published: true,
      colors,
      sizes: ["8", "4", "6"],
      characteristics: "100% algodón\nEstampado con vinilo",
    });
    const row = ok(
      await anon
        .from("product")
        .select("colors, sizes, characteristics")
        .eq("id", p.id)
        .single(),
    );
    expect(row.colors).toEqual(colors);
    expect(row.sizes).toEqual(["8", "4", "6"]);
    expect(row.characteristics).toBe("100% algodón\nEstampado con vinilo");
  });

  it("[001-AC27] gives the public nothing of an unpublished product", async () => {
    const p = await newProduct({
      is_published: false,
      colors: [rosado],
      sizes: ["4"],
      characteristics: "Secreto",
    });
    const rows = ok(
      await anon.from("product").select("colors, sizes, characteristics").eq("id", p.id),
    );
    expect(rows).toEqual([]);
  });

  it("[001-AC28] refuses the anonymous role and a non-admin user, and lets the admin write", async () => {
    const p = await newProduct({ is_published: true });
    const changes = { colors: [rosado], sizes: ["4"], characteristics: "Algodón" };

    for (const client of [anon, nonAdmin]) {
      const res = await client.from("product").update(changes).eq("id", p.id).select();
      expect(res.error !== null || (res.data ?? []).length === 0).toBe(true);
    }
    const untouched = ok(
      await admin.from("product").select("colors, sizes, characteristics").eq("id", p.id).single(),
    );
    expect(untouched).toEqual({ colors: [], sizes: [], characteristics: "" });
    const insert = await nonAdmin.from("product").insert({
      slug: uniqueSlug("p"),
      name: "No admin",
      colors: [rosado],
    });
    expect(insert.error).not.toBeNull();

    const asAdmin = ok(await admin.from("product").update(changes).eq("id", p.id).select());
    expect(asAdmin[0].colors).toEqual([rosado]);
    expect(asAdmin[0].sizes).toEqual(["4"]);
    expect(asAdmin[0].characteristics).toBe("Algodón");
  });

  it("[002-AC66] keeps the slug when the other fields are edited", async () => {
    const p = await newProduct({ is_published: true });
    ok(
      await admin
        .from("product")
        .update({ name: "Otro nombre", price_from_clp: 9900, colors: [rosado], sizes: ["4"], characteristics: "Nuevo" })
        .eq("id", p.id),
    );
    const after = ok(await anon.from("product").select("slug, name").eq("id", p.id).single());
    expect(after).toEqual({ slug: p.slug, name: "Otro nombre" });
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
