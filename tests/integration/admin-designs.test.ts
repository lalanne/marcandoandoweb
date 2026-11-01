import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDesign,
  deleteDesign,
  getDesign,
  listDesigns,
  updateDesign,
  type DesignValues,
} from "@/lib/admin/designs";
import { addImage, deleteImage, moveImage, updateImage } from "@/lib/admin/images";
import { ADMIN, NON_ADMIN, anonClient, signedInClient, uniqueSlug } from "./helpers";

// Server-side behaviour behind /panel/disenos (spec 002, criterion 9, and the
// photo rules of criterion 8), against the real local database and storage,
// with the admin's own session. Fake data only; a 1x1 PNG.
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

let admin: SupabaseClient;
const created: string[] = [];

function values(overrides: Partial<DesignValues> = {}): DesignValues {
  return {
    title: "Diseño de prueba",
    slug: uniqueSlug("dis"),
    description: null,
    is_featured: false,
    is_published: false,
    ...overrides,
  };
}

function file(type = "image/png", body: Uint8Array = PNG) {
  return { type, size: body.byteLength, body };
}

async function make(overrides: Partial<DesignValues> = {}): Promise<string> {
  const r = await createDesign(admin, values(overrides));
  if (!r.ok) throw new Error(r.error);
  created.push(r.id);
  return r.id;
}

function add(id: string, altText: string, kind: "photo" | "graphic" = "photo", f = file()) {
  return addImage(admin, { owner: { kind: "design", id }, file: f, altText, kind });
}

beforeAll(async () => {
  admin = await signedInClient(ADMIN);
});

afterAll(async () => {
  for (const id of created) await deleteDesign(admin, id);
});

describe("designs as the admin", () => {
  it("creates, lists, reads, updates and deletes a design", async () => {
    const id = await make({ title: "Zeta de prueba" });
    const design = await getDesign(admin, id);
    expect(design?.title).toBe("Zeta de prueba");
    expect(design?.is_published).toBe(false);
    expect(design?.images).toEqual([]);
    expect((await listDesigns(admin)).some((d) => d.id === id)).toBe(true);

    const up = await updateDesign(
      admin,
      id,
      values({ title: "Otro título", description: "Algo", is_featured: true, is_published: true }),
    );
    expect(up.ok).toBe(true);
    const after = await getDesign(admin, id);
    expect([after?.title, after?.description, after?.is_featured, after?.is_published]).toEqual([
      "Otro título",
      "Algo",
      true,
      true,
    ]);

    expect((await deleteDesign(admin, id)).ok).toBe(true);
    expect(await getDesign(admin, id)).toBeNull();
  });

  it("lists unpublished designs too, and returns null for a malformed id", async () => {
    const id = await make({ is_published: false });
    expect((await listDesigns(admin)).find((d) => d.id === id)?.is_published).toBe(false);
    expect(await getDesign(admin, "no-es-un-uuid")).toBeNull();
  });

  it("refuses a repeated slug with a Spanish message on the slug field", async () => {
    const slug = uniqueSlug("dup");
    await make({ slug });
    const again = await createDesign(admin, values({ slug }));
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.field).toBe("slug");
      expect(again.error).toMatch(/dirección/i);
    }
    const other = await make();
    const r = await updateDesign(admin, other, values({ slug }));
    expect(r.ok).toBe(false);
  });

  it("a published design is public with its photos; an unpublished one is not", async () => {
    const id = await make({ is_published: true });
    await add(id, "Visible");
    const anon = anonClient();
    const visible = await anon.from("design").select("id, image(alt_text)").eq("id", id);
    expect(visible.data).toHaveLength(1);

    await updateDesign(admin, id, values({ is_published: false }));
    const hidden = await anon.from("design").select("id").eq("id", id);
    expect(hidden.data).toEqual([]);
  });
});

describe("design images as the admin", () => {
  it("uploads to design/<id>/<uuid>.<ext>, appends by position and reads it back", async () => {
    const id = await make();
    const a = await add(id, "Primera foto");
    const b = await add(id, "Segundo gráfico", "graphic");
    expect(a.ok && b.ok).toBe(true);

    const design = await getDesign(admin, id);
    expect(design?.images.map((i) => i.alt_text)).toEqual(["Primera foto", "Segundo gráfico"]);
    expect(design?.images[0].storage_path).toMatch(
      new RegExp(`^design/${id}/[0-9a-f-]{36}\\.webp$`),
    );
    expect(design?.images[1].kind).toBe("graphic");
    expect(design!.images[1].position).toBeGreaterThan(design!.images[0].position);
    const down = await admin.storage.from("images").download(design!.images[0].storage_path);
    expect(down.error).toBeNull();
  });

  it("[002-AC8] refuses a missing alt text, a wrong type and a file above 5 MiB, storing nothing", async () => {
    const id = await make();
    const noAlt = await add(id, "  ");
    const gif = await add(id, "Un gif", "photo", file("image/gif"));
    const big = await add(id, "Muy grande", "photo", {
      type: "image/png",
      size: 5 * 1024 * 1024 + 1,
      body: PNG,
    });
    expect([noAlt.ok, gif.ok, big.ok]).toEqual([false, false, false]);
    if (!noAlt.ok) expect(noAlt.error).toMatch(/texto alternativo/i);
    if (!big.ok) expect(big.error).toMatch(/5 MB/);
    expect((await getDesign(admin, id))?.images).toEqual([]);
    const listed = await admin.storage.from("images").list(`design/${id}`);
    expect(listed.data ?? []).toEqual([]);
  });

  it("edits alt text and kind, and refuses an empty alt text", async () => {
    const id = await make();
    await add(id, "Antes");
    const [image] = (await getDesign(admin, id))!.images;
    expect((await updateImage(admin, image.id, { altText: "Después", kind: "graphic" })).ok).toBe(true);
    const after = (await getDesign(admin, id))!.images[0];
    expect([after.alt_text, after.kind]).toEqual(["Después", "graphic"]);
    expect((await updateImage(admin, image.id, { altText: " ", kind: "photo" })).ok).toBe(false);
  });

  it("moves an image up and down inside its design only", async () => {
    const id = await make();
    const otherId = await make();
    await add(otherId, "Ajena");
    for (const alt of ["Uno", "Dos", "Tres"]) await add(id, alt);
    const order = async () => (await getDesign(admin, id))!.images.map((i) => i.alt_text);
    const imgs = (await getDesign(admin, id))!.images;

    await moveImage(admin, imgs[2].id, "up");
    expect(await order()).toEqual(["Uno", "Tres", "Dos"]);
    await moveImage(admin, imgs[0].id, "down");
    expect(await order()).toEqual(["Tres", "Uno", "Dos"]);
    await moveImage(admin, imgs[1].id, "down");
    expect(await order()).toEqual(["Tres", "Uno", "Dos"]);
    expect((await getDesign(admin, otherId))!.images.map((i) => i.alt_text)).toEqual(["Ajena"]);
  });

  it("deleting one image removes its row and its file", async () => {
    const id = await make();
    await add(id, "Una");
    await add(id, "Otra");
    const [first, second] = (await getDesign(admin, id))!.images;
    expect((await deleteImage(admin, first.id)).ok).toBe(true);
    expect((await getDesign(admin, id))!.images.map((i) => i.id)).toEqual([second.id]);
    expect((await admin.storage.from("images").download(first.storage_path)).error).not.toBeNull();
    expect((await admin.storage.from("images").download(second.storage_path)).error).toBeNull();
  });

  it("deleting a design also removes every file of its images", async () => {
    const id = await make();
    await add(id, "Una");
    await add(id, "Otra", "photo", file("image/webp"));
    const paths = (await getDesign(admin, id))!.images.map((i) => i.storage_path);
    expect(paths).toHaveLength(2);

    expect((await deleteDesign(admin, id)).ok).toBe(true);
    for (const path of paths) {
      expect((await admin.storage.from("images").download(path)).error).not.toBeNull();
    }
    const listed = await admin.storage.from("images").list(`design/${id}`);
    expect(listed.data ?? []).toEqual([]);
  });
});

describe("designs as a signed-in user who is not the admin", () => {
  it("cannot create, upload or delete", async () => {
    const other = await signedInClient(NON_ADMIN);
    const id = await make();

    expect((await createDesign(other, values())).ok).toBe(false);
    const u = await addImage(other, {
      owner: { kind: "design", id },
      file: file(),
      altText: "Intento",
      kind: "photo",
    });
    expect(u.ok).toBe(false);
    await deleteDesign(other, id);
    expect(await getDesign(admin, id)).not.toBeNull();
  });
});
