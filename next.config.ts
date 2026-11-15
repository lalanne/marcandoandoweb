import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Photos go through a Server Action. The limit is 5 MiB per photo (checked
    // in lib/admin/image-upload.ts and by the bucket); the rest is form overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // The home page cannot read `?coleccion=` inside the cache (spec 002, 2026-11-06
  // amendment), so each collection tab is a prerendered page of its own and its
  // address, which stays `/?coleccion=...` (criteria 83 and 86), is rewritten to
  // it. Any other value of `coleccion` is "Todos" (criterion 84): it matches no
  // rule and gets `/`. Not in the sitemap, and the page has the home page's tags.
  async rewrites() {
    return {
      beforeFiles: ["navidad", "escolar"].map((collection) => ({
        source: "/",
        has: [{ type: "query" as const, key: "coleccion", value: collection }],
        destination: `/colecciones/${collection}`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
