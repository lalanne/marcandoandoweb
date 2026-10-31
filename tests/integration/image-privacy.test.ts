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

// Spec 002, "Image privacy" (criteria 25 and 26): files of unpublished products
// and designs are not readable or listable by the public; the admin reads all.

// 1x1 transparent PNG.
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

let admin: SupabaseClient;
let anon: SupabaseClient;
let nonAdmin: SupabaseClient;
const folder = `test-${Date.now().toString(36)}`;
const files = {
  publishedProduct: `${folder}/published-product.png`,
  draftProduct: `${folder}/draft-product.png`,
  publishedDesign: `${folder}/published-design.png`,
  draftDesign: `${folder}/draft-design.png`,
  orphan: `${folder}/orphan.png`,
};
const created = { product: [] as string[], design: [] as string[] };

const unpublished = () => [files.draftProduct, files.draftDesign, files.orphan];
const published = () => [files.publishedProduct, files.publishedDesign];

beforeAll(async () => {
  anon = anonClient();
  admin = await signedInClient(ADMIN);
  nonAdmin = await signedInClient(NON_ADMIN);

  for (const [key, isPublished] of [
    ["publishedProduct", true],
    ["draftProduct", false],
  ] as const) {
    const p = ok(
      await admin
        .from("product")
        .insert({
          slug: uniqueSlug("p"),
          name: "Producto de prueba",
          is_published: isPublished,
        })
        .select()
        .single(),
    );
    created.product.push(p.id);
    ok(
      await admin
        .from("image")
        .insert({ storage_path: files[key], alt_text: "Prueba", product_id: p.id }),
    );
  }
  for (const [key, isPublished] of [
    ["publishedDesign", true],
    ["draftDesign", false],
  ] as const) {
    const d = ok(
      await admin
        .from("design")
        .insert({
          slug: uniqueSlug("d"),
          title: "Diseño de prueba",
          is_published: isPublished,
        })
        .select()
        .single(),
    );
    created.design.push(d.id);
    ok(
      await admin
        .from("image")
        .insert({ storage_path: files[key], alt_text: "Prueba", design_id: d.id }),
    );
  }
  for (const path of Object.values(files)) {
    const up = await admin.storage
      .from("images")
      .upload(path, PNG, { contentType: "image/png" });
    expect(up.error).toBeNull();
  }
});

afterAll(async () => {
  await admin.storage.from("images").remove(Object.values(files));
  for (const id of created.product) await admin.from("product").delete().eq("id", id);
  for (const id of created.design) await admin.from("design").delete().eq("id", id);
});

describe("[002-AC25] unpublished images are private", () => {
  it("[002-AC25] the public and a non-admin cannot download unpublished images, but can download published ones", async () => {
    for (const client of [anon, nonAdmin]) {
      for (const path of unpublished()) {
        const res = await client.storage.from("images").download(path);
        expect(res.error, path).not.toBeNull();
      }
      for (const path of published()) {
        const res = await client.storage.from("images").download(path);
        expect(res.error, path).toBeNull();
      }
    }
  });

  it("[002-AC25] listing the bucket shows the public only published images", async () => {
    for (const client of [anon, nonAdmin]) {
      const res = await client.storage.from("images").list(folder);
      expect(res.error).toBeNull();
      expect((res.data ?? []).map((f) => f.name).sort()).toEqual(
        published()
          .map((p) => p.split("/")[1])
          .sort(),
      );
    }
  });

  it("[002-AC25] the direct storage URL of an unpublished image is refused", async () => {
    for (const path of unpublished()) {
      const url = anon.storage.from("images").getPublicUrl(path).data.publicUrl;
      const res = await fetch(url);
      expect(res.ok, `public URL of ${path}`).toBe(false);
    }
  });

  it("[002-AC25] the public cannot sign a URL for an unpublished image", async () => {
    const res = await anon.storage
      .from("images")
      .createSignedUrl(files.draftProduct, 60);
    expect(res.error).not.toBeNull();
  });

  it("[002-AC25] the public storage endpoint refuses even a published image", async () => {
    // The bucket is private: only the site's routes serve files, never the
    // public object endpoint.
    for (const path of published()) {
      const url = anon.storage.from("images").getPublicUrl(path).data.publicUrl;
      expect((await fetch(url)).ok, path).toBe(false);
    }
  });
});

describe("[002-AC26] the admin reads everything", () => {
  it("[002-AC26] the admin downloads and lists published and unpublished images", async () => {
    for (const path of [...unpublished(), ...published()]) {
      const res = await admin.storage.from("images").download(path);
      expect(res.error, path).toBeNull();
    }
    const list = await admin.storage.from("images").list(folder);
    expect((list.data ?? []).length).toBe(5);
  });

  it("[002-AC26] publishing an owner makes its image readable by the public, and unpublishing hides it again", async () => {
    const id = created.product[1];
    ok(await admin.from("product").update({ is_published: true }).eq("id", id));
    const res = await anon.storage.from("images").download(files.draftProduct);
    expect(res.error).toBeNull();
    ok(await admin.from("product").update({ is_published: false }).eq("id", id));
    const again = await anon.storage.from("images").download(files.draftProduct);
    expect(again.error).not.toBeNull();
  });
});
