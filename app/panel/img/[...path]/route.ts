import { isAdminUser } from "@/lib/auth/admin";
import { serveImage } from "@/lib/catalog/serve-image";
import { createClient } from "@/lib/supabase/server";

// Spec 002, criterion 26: the admin previews any image, published or not. The
// proxy already guards /panel; this checks again and reads with the admin's own
// session, so storage row-level security still decides. Never cached.
const NO_STORE = "private, no-store";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUser(user)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": NO_STORE },
    });
  }
  const { path } = await ctx.params;
  return serveImage(supabase, path, NO_STORE);
}
