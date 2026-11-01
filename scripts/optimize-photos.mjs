// One-time job (issue #98): resizes the photos that were uploaded before the admin
// started resizing on upload. Each stored original (PNG or JPG of 1.5 to 3 MB) gets a
// WebP copy of at most 1000 px wide next to it, the `image` row is pointed at the
// copy, and the original stays where it is until you run it again with --delete-old.
// Run by the owner or the developer, never by the app: it needs the service-role key.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/optimize-photos.mjs
//     (no flag: only lists what it would do)
//   ... node scripts/optimize-photos.mjs --apply        (creates the copies, updates rows)
//   ... node scripts/optimize-photos.mjs --delete-old   (later: removes the originals
//     that no row points at; wait a few minutes after --apply, pages cache for 5 min)
//
// The size and quality match lib/admin/resize-image.ts.
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MAX_WIDTH = 1000;
const QUALITY = 80;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const apply = process.argv.includes("--apply");
const deleteOld = process.argv.includes("--delete-old");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = client.storage.from("images");

const { data: rows, error } = await client.from("image").select("id, storage_path");
if (error) {
  console.error(error.message);
  process.exit(1);
}

if (deleteOld) {
  // Originals: every object next to a .webp copy that no row points at any more.
  const used = new Set(rows.map((r) => r.storage_path));
  let removed = 0;
  for (const row of rows.filter((r) => r.storage_path.endsWith(".webp"))) {
    const stem = row.storage_path.slice(0, -".webp".length);
    for (const ext of ["png", "jpg", "jpeg", "avif"]) {
      const old = `${stem}.${ext}`;
      if (used.has(old)) continue;
      const res = await bucket.remove([old]);
      if (!res.error && res.data?.length) {
        removed += 1;
        console.log(`borrada ${old}`);
      }
    }
  }
  console.log(`${removed} original(es) borrado(s).`);
  process.exit(0);
}

let done = 0;
let before = 0;
let after = 0;
for (const row of rows.filter((r) => !r.storage_path.endsWith(".webp"))) {
  const target = row.storage_path.replace(/\.[^./]+$/, "") + ".webp";
  const download = await bucket.download(row.storage_path);
  if (download.error || !download.data) {
    console.warn(`omitida ${row.storage_path}: ${download.error?.message ?? "sin datos"}`);
    continue;
  }
  const original = Buffer.from(await download.data.arrayBuffer());
  let resized;
  try {
    resized = await sharp(original)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch (e) {
    console.warn(`omitida ${row.storage_path}: no es una imagen (${e.message})`);
    continue;
  }
  console.log(
    `${apply ? "" : "[simulacro] "}${row.storage_path} (${Math.round(original.length / 1024)} KB) -> ${target} (${Math.round(resized.length / 1024)} KB)`,
  );
  before += original.length;
  after += resized.length;
  if (!apply) continue;

  const up = await bucket.upload(target, resized, {
    contentType: "image/webp",
    upsert: true,
  });
  if (up.error) {
    console.warn(`omitida ${row.storage_path}: ${up.error.message}`);
    continue;
  }
  const update = await client.from("image").update({ storage_path: target }).eq("id", row.id);
  if (update.error) {
    console.warn(`no se actualizó la fila de ${row.storage_path}: ${update.error.message}`);
    continue;
  }
  done += 1;
}
console.log(
  `${apply ? done : "0 (simulacro)"} foto(s) convertida(s). Antes ${Math.round(before / 1024)} KB, después ${Math.round(after / 1024)} KB.`,
);
