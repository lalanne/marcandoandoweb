import { updateTag } from "next/cache";

// The catalog is served from Next's cache (spec 002, 2026-11-06 amendment, issues
// #136 and #138): built at deploy time, refreshed when the admin saves, and
// rebuilt by itself within an hour for changes made outside the panel. Product
// pages (issue #139) use the same tag and lifetime.

/** The tag on everything read from the public catalog. */
export const CATALOG_TAG = "catalog";

/**
 * How long a cached catalog read lives (criterion 99). `revalidate` is the longest
 * a change made outside the panel waits to show: the next request after it gets the
 * old page while a new one is built. `expire` is longer, so nobody waits for that.
 * `stale` is how long the browser may reuse a page without asking. None of the three
 * may be so short that Next takes the read out of the prerender (docs, cacheLife,
 * "Prerendering behavior"): then every visit would read the database again.
 */
export const CATALOG_CACHE_LIFE = {
  stale: 300,
  revalidate: 3600,
  expire: 7 * 24 * 3600,
} as const;

/**
 * Called by every panel action that changes what the public sees (criterion 98).
 * The next load of each cached page waits once for the database and shows the
 * change. Server Actions only.
 */
export function refreshCatalog(): void {
  updateTag(CATALOG_TAG);
}
