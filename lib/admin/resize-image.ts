import sharp from "sharp";

// Photos are stored resized (issue #98): about 1000 px wide is a retina photo for
// the 350 to 480 px box they are shown in, and WebP at this quality is 30 to 60 KB
// where the phone's original is 1.5 to 3 MB. Server only (it uses sharp).

export const PHOTO_MAX_WIDTH = 1000;
export const PHOTO_QUALITY = 80;
export const PHOTO_CONTENT_TYPE = "image/webp";

/**
 * The photo as WebP, at most `PHOTO_MAX_WIDTH` wide (never enlarged), turned upright
 * by its EXIF orientation, with no metadata (so no GPS position is published).
 * Null when the bytes are not an image.
 */
export async function resizePhoto(body: Uint8Array): Promise<Buffer | null> {
  try {
    return await sharp(body)
      .rotate()
      .resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: PHOTO_QUALITY })
      .toBuffer();
  } catch {
    return null;
  }
}
