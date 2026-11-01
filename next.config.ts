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
  // Product photos are the stored 1.5 to 3 MB PNGs; the optimizer serves them
  // resized as WebP (issue #98). The source stays the `/img/...` route, which
  // refuses unpublished photos (spec 002, criteria 25 and 51), and the optimized copy
  // is kept no longer than that route's 5-minute window (`minimumCacheTTL`; the
  // optimizer uses the larger of this and the route's own max-age, also 300).
  images: {
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 828, 1080],
    imageSizes: [320, 480],
    minimumCacheTTL: 300,
    localPatterns: [{ pathname: "/img/**" }, { pathname: "/_next/static/media/**" }],
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
