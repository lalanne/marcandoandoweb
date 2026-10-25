import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { serveImage } from "@/lib/catalog/serve-image";

// Spec 002, criteria 25 and 26. Published images only: the anonymous client
// reads the private bucket, so storage row-level security refuses anything of
// an unpublished product or design (404). Never the service role.
// The cache window is also how long a CDN may keep serving an image after the
// owner unpublishes it.
const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=60";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  await connection();
  const { path } = await ctx.params;
  return serveImage(createPublicClient(), path, CACHE);
}
