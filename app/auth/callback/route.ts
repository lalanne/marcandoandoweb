import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_ERROR_PATH,
  callbackFailed,
  decideAfterSignIn,
  siteOrigin,
} from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/server";

// Where Supabase brings the browser back after Google (spec 005). Not guarded by
// the proxy: the visitor has no session yet. Every outcome is a redirect, never a
// blank page or an error screen.
export async function GET(request: NextRequest) {
  const origin = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL, request.url);
  const params = request.nextUrl.searchParams;

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (callbackFailed(params)) return go(GOOGLE_ERROR_PATH);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(params.get("code")!);
  if (error) return go(GOOGLE_ERROR_PATH);

  // getUser asks the auth server; the session cookie alone is not trusted.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const decision = decideAfterSignIn(user, params.get("next"));
  if (decision.signOut) await supabase.auth.signOut();
  return go(decision.path);
}
