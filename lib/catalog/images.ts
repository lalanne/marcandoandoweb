/**
 * Same-origin URL of an image: `/img/<storage_path>`. The bucket is private, so
 * the browser never gets a storage URL; the route reads the file with the
 * anonymous client and row-level security decides (spec 002, criterion 26).
 */
export function imageUrl(storagePath: string): string {
  return `/img/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Storage path from the segments of an `/img/[...path]` route, or null when it
 * is empty or tries to leave the folder (`.`, `..`, empty segment, backslash).
 */
export function imagePathFromSegments(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === ".." || segment.includes("\\")) {
      return null;
    }
  }
  return segments.join("/");
}
