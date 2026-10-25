import type { SupabaseClient } from "@supabase/supabase-js";
import { imagePathFromSegments } from "./images";

/**
 * Reads one file of the private `images` bucket with the given client and
 * answers with its bytes. Row-level security on storage decides what the client
 * may read: a refusal and a missing file are both a plain 404, so nothing
 * reveals whether an unpublished file exists.
 */
export async function serveImage(
  client: SupabaseClient,
  segments: string[],
  cacheControl: string,
): Promise<Response> {
  const path = imagePathFromSegments(segments);
  if (!path) return new Response("Not found", { status: 404 });

  const { data, error } = await client.storage.from("images").download(path);
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
