// Absolute base of the site, for Open Graph images and shared links.
// NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is provided;
// locally it falls back to localhost.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
