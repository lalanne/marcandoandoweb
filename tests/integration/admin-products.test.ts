import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  listProducts,
  moveProductImage,
  updateProduct,
  updateProductImage,
  type ProductValues,
} from "@/lib/admin/products";
import { ADMIN, NON_ADMIN, signedInClient, uniqueSlug } from "./helpers";

// Server-side behaviour behind /panel/productos (spec 002, criteria 6 to 8),
// against the real local database and storage, with the admin's own session.
// Fake data only; a 1x1 PNG.
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

let admin: SupabaseClient;
const created: string[] = [];

function values(overrides: Partial<ProductValues> = {}): ProductValues {
  return {
    name: "Producto de prueba",
    slug: uniqueSlug("prod"),
    description: null,
    price_from_clp: 7000,
    kind: "producto",
    is_featured: false,
    is_available: true,
    is_published: false,
    colors: [],
    sizes: [],
    characteristics: "",
    ...overrides,
  };
}

function file(type = "image/png", body: Uint8Array = PNG) {
  return { type, size: body.byteLength, body };
}

async function make(overrides: Partial<ProductValues> = {}): Promise<string> {
  const r = await createProduct(admin, values(overrides));
  if (!r.ok) throw new Error(r.error);
  created.push(r.id);
  return r.id;
}

beforeAll(async () => {
  admin = await signedInClient(ADMIN);
});

afterAll(async () => {
  for (const id of created) await deleteProduct(admin, id);
});

describe("products as the admin", () => {
  it("creates, reads, updates and deletes a product; an empty price is null", async () => {
    const id = await make({ price_from_clp: null });
    const product = await getProduct(admin, id);
    expect(product?.price_from_clp).toBeNull();
    expect(product?.images).toEqual([]);

    const up = await updateProduct(admin, id, values({ name: "Otro nombre", price_from_clp: 9900 }));
    expect(up.ok).toBe(true);
    expect((await getProduct(admin, id))?.price_from_clp).toBe(9900);

    expect((await deleteProduct(admin, id)).ok).toBe(true);
    expect(await getProduct(admin, id)).toBeNull();
  });

  it("saves the type, changes it, and lists it without a category", async () => {
    const id = await make({ kind: "pack" });
    expect((await getProduct(admin, id))?.kind).toBe("pack");

    expect((await updateProduct(admin, id, values({ kind: "producto" }))).ok).toBe(true);
    expect((await getProduct(admin, id))?.kind).toBe("producto");

    const row = (await listProducts(admin)).find((p) => p.id === id);
    expect(row?.kind).toBe("producto");
    expect(row).not.toHaveProperty("category");
  });

  it("refuses a repeated slug with a Spanish message on the slug field", async () => {
    const slug = uniqueSlug("dup");
    await make({ slug });
    const again = await createProduct(admin, values({ slug }));
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.field).toBe("slug");
      expect(again.error).toMatch(/dirección/i);
    }
  });

  it("refuses to change a product to another product's slug", async () => {
    const slug = uniqueSlug("taken");
    await make({ slug });
    const id = await make();
    const r = await updateProduct(admin, id, values({ slug }));
    expect(r.ok).toBe(false);
  });
});

describe("product images as the admin", () => {
  it("uploads to product/<id>/<uuid>.<ext>, appends by position and reads it back", async () => {
    const id = await make();
    const a = await addProductImage(admin, {
      productId: id,
      file: file(),
      altText: "Primera foto",
      kind: "photo",
    });
    const b = await addProductImage(admin, {
      productId: id,
      file: file(),
      altText: "Segundo gráfico",
      kind: "graphic",
    });
    expect(a.ok && b.ok).toBe(true);

    const product = await getProduct(admin, id);
    expect(product?.images.map((i) => i.alt_text)).toEqual([
      "Primera foto",
      "Segundo gráfico",
    ]);
    expect(product?.images[0].storage_path).toMatch(
      new RegExp(`^product/${id}/[0-9a-f-]{36}\\.webp$`),
    );
    expect(product?.images[1].kind).toBe("graphic");
    expect(product!.images[1].position).toBeGreaterThan(product!.images[0].position);

    const down = await admin.storage
      .from("images")
      .download(product!.images[0].storage_path);
    expect(down.error).toBeNull();
  });

  it("[002-AC49] stores a wide photo resized to at most 1000 px as WebP, and refuses bytes that are not an image", async () => {
    const id = await make();
    const wide = await sharp({
      create: { width: 1448, height: 1086, channels: 3, background: "#9565C4" },
    })
      .png()
      .toBuffer();
    const added = await addProductImage(admin, {
      productId: id,
      file: { type: "image/png", size: wide.byteLength, body: wide },
      altText: "Foto ancha",
      kind: "photo",
    });
    expect(added.ok).toBe(true);
    const product = await getProduct(admin, id);
    const path = product!.images[0].storage_path;
    expect(path).toMatch(/\.webp$/);
    const down = await admin.storage.from("images").download(path);
    expect(down.data?.type).toBe("image/webp");
    const meta = await sharp(Buffer.from(await down.data!.arrayBuffer())).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1000);

    const junk = new TextEncoder().encode("no soy una foto");
    const refused = await addProductImage(admin, {
      productId: id,
      file: { type: "image/png", size: junk.byteLength, body: junk },
      altText: "No es una foto",
      kind: "photo",
    });
    expect(refused.ok).toBe(false);
    expect((await getProduct(admin, id))!.images).toHaveLength(1);
  });

  it("refuses a missing alt text, a wrong type and a file above 5 MiB, storing nothing", async () => {
    const id = await make();
    const noAlt = await addProductImage(admin, {
      productId: id,
      file: file(),
      altText: "  ",
      kind: "photo",
    });
    const gif = await addProductImage(admin, {
      productId: id,
      file: file("image/gif"),
      altText: "Un gif",
      kind: "photo",
    });
    const big = await addProductImage(admin, {
      productId: id,
      file: { type: "image/png", size: 5 * 1024 * 1024 + 1, body: PNG },
      altText: "Muy grande",
      kind: "photo",
    });
    expect(noAlt.ok).toBe(false);
    expect(gif.ok).toBe(false);
    expect(big.ok).toBe(false);
    if (!noAlt.ok) expect(noAlt.error).toMatch(/texto alternativo/i);
    if (!big.ok) expect(big.error).toMatch(/5 MB/);
    expect((await getProduct(admin, id))?.images).toEqual([]);
    const listed = await admin.storage.from("images").list(`product/${id}`);
    expect(listed.data ?? []).toEqual([]);
  });

  it("edits alt text and kind, and refuses an empty alt text", async () => {
    const id = await make();
    await addProductImage(admin, { productId: id, file: file(), altText: "Antes", kind: "photo" });
    const [image] = (await getProduct(admin, id))!.images;

    expect((await updateProductImage(admin, image.id, { altText: "Después", kind: "graphic" })).ok).toBe(true);
    const after = (await getProduct(admin, id))!.images[0];
    expect([after.alt_text, after.kind]).toEqual(["Después", "graphic"]);

    expect((await updateProductImage(admin, image.id, { altText: " ", kind: "photo" })).ok).toBe(false);
  });

  it("moves an image up and down by swapping positions", async () => {
    const id = await make();
    for (const alt of ["Uno", "Dos", "Tres"]) {
      await addProductImage(admin, { productId: id, file: file(), altText: alt, kind: "photo" });
    }
    const order = async () => (await getProduct(admin, id))!.images.map((i) => i.alt_text);
    const imgs = (await getProduct(admin, id))!.images;

    await moveProductImage(admin, imgs[2].id, "up");
    expect(await order()).toEqual(["Uno", "Tres", "Dos"]);
    await moveProductImage(admin, imgs[0].id, "down");
    expect(await order()).toEqual(["Tres", "Uno", "Dos"]);
    // The ends stay where they are.
    await moveProductImage(admin, imgs[1].id, "down");
    expect(await order()).toEqual(["Tres", "Uno", "Dos"]);
  });

  it("deleting one image removes its row and its file", async () => {
    const id = await make();
    await addProductImage(admin, { productId: id, file: file(), altText: "Una", kind: "photo" });
    await addProductImage(admin, { productId: id, file: file(), altText: "Otra", kind: "photo" });
    const [first, second] = (await getProduct(admin, id))!.images;

    expect((await deleteProductImage(admin, first.id)).ok).toBe(true);
    expect((await getProduct(admin, id))!.images.map((i) => i.id)).toEqual([second.id]);
    expect((await admin.storage.from("images").download(first.storage_path)).error).not.toBeNull();
    expect((await admin.storage.from("images").download(second.storage_path)).error).toBeNull();
  });

  it("deleting a product also removes every file of its images", async () => {
    const id = await make();
    await addProductImage(admin, { productId: id, file: file(), altText: "Una", kind: "photo" });
    await addProductImage(admin, { productId: id, file: file("image/webp"), altText: "Otra", kind: "photo" });
    const paths = (await getProduct(admin, id))!.images.map((i) => i.storage_path);
    expect(paths).toHaveLength(2);

    expect((await deleteProduct(admin, id)).ok).toBe(true);
    for (const path of paths) {
      expect((await admin.storage.from("images").download(path)).error).not.toBeNull();
    }
    const listed = await admin.storage.from("images").list(`product/${id}`);
    expect(listed.data ?? []).toEqual([]);
  });
});

describe("products as a signed-in user who is not the admin", () => {
  it("cannot create, upload or delete", async () => {
    const other = await signedInClient(NON_ADMIN);
    const id = await make();

    const c = await createProduct(other, values());
    expect(c.ok).toBe(false);

    const u = await addProductImage(other, {
      productId: id,
      file: file(),
      altText: "Intento",
      kind: "photo",
    });
    expect(u.ok).toBe(false);

    await deleteProduct(other, id);
    expect(await getProduct(admin, id)).not.toBeNull();
  });
});

describe("colors, sizes and characteristics through the admin functions", () => {
  it("[002-AC64] saves and reads back colors, sizes and characteristics in order", async () => {
    const colors = [
      { name: "Rosado", hex: "#E8647F" },
      { name: "Celeste", hex: "#4FB0B0" },
    ];
    const id = await make({ colors, sizes: ["4", "6"], characteristics: "100% algodón\nEstampado con vinilo" });
    const product = await getProduct(admin, id);
    expect(product?.colors).toEqual(colors);
    expect(product?.sizes).toEqual(["4", "6"]);
    expect(product?.characteristics).toBe("100% algodón\nEstampado con vinilo");

    const update = await updateProduct(admin, id, {
      ...values({ slug: product!.slug }),
      colors: [colors[1]],
      sizes: [],
    });
    expect(update.ok).toBe(true);
    const after = await getProduct(admin, id);
    expect(after?.colors).toEqual([colors[1]]);
    expect(after?.sizes).toEqual([]);
  });
});
