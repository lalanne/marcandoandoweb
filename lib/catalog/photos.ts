import type { CatalogImage } from "./types";

// A card's photos (spec 002, criteria 46 to 48). Pure, so the order, the going
// round and the swipe threshold are unit tested.

type ImageRow = { storage_path: string; alt_text: string; position: number };

/** The photos in the admin's order (by position). */
export function photosInOrder(rows: ImageRow[] | null | undefined): CatalogImage[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({ storagePath: row.storage_path, altText: row.alt_text }));
}

/** The next photo; after the last comes the first. */
export function nextPhoto(index: number, count: number): number {
  return count > 0 ? (index + 1) % count : 0;
}

/** The previous photo; before the first comes the last. */
export function previousPhoto(index: number, count: number): number {
  return count > 0 ? (index - 1 + count) % count : 0;
}

const MIN_SWIPE_PX = 40;

/**
 * What a finger movement does: 1 is the next photo (finger to the left), -1 the
 * previous one, 0 nothing (too short, or mostly vertical: the page scrolls).
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * The photos to request once the one on show has loaded (spec 002, criterion 49):
 * the next and the previous, so they are ready when the visitor moves. With two
 * photos the other one is named once; with one or none there is nothing to name.
 */
export function photosToPreload(index: number, count: number): number[] {
  if (count < 2) return [];
  const around = [nextPhoto(index, count), previousPhoto(index, count)];
  return around.filter((n, i) => around.indexOf(n) === i && n !== index);
}
