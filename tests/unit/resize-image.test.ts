import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PHOTO_MAX_WIDTH, resizePhoto } from "@/lib/admin/resize-image";

// Noisy pixels so the PNG is as heavy as a real photo.
async function photo(width: number, height: number, format: "png" | "jpeg" = "png") {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 12345;
  for (let i = 0; i < raw.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    raw[i] = seed >>> 24;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    [format]()
    .toBuffer();
}

describe("resizePhoto", () => {
  it("[002-AC49] makes a wide photo a WebP of 1000 px wide that keeps its proportions and weighs less", async () => {
    const original = await photo(1448, 1086);
    const out = await resizePhoto(original);
    expect(out).not.toBeNull();
    const meta = await sharp(out!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(PHOTO_MAX_WIDTH);
    expect(meta.height).toBe(750);
    expect(out!.byteLength).toBeLessThan(original.byteLength / 3);
  });

  it("[002-AC49] never enlarges a small photo", async () => {
    const out = await resizePhoto(await photo(400, 300, "jpeg"));
    const meta = await sharp(out!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(400);
  });

  it("[002-AC49] turns a photo upright by its EXIF orientation and drops the metadata", async () => {
    const sideways = await sharp(await photo(1200, 600, "jpeg"))
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await resizePhoto(sideways);
    const meta = await sharp(out!).metadata();
    expect(meta.width).toBe(600); // rotated: it was 1200 wide, now 600 wide and 1200 tall
    expect(meta.height).toBe(1200);
    expect(meta.exif).toBeUndefined();
  });

  it("[002-AC49] answers null when the bytes are not an image", async () => {
    expect(await resizePhoto(new TextEncoder().encode("no soy una foto"))).toBeNull();
  });
});
