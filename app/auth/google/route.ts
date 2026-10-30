import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_ERROR_PATH,
  providerAnswers,
  siteOrigin,
} from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/server";

// Starts the Google sign-in (spec 005). A plain form POST from /entrar, so it is
// a full-page navigation that works without JavaScript. Supabase builds the
// authorize URL and keeps the PKCE verifier in a cookie; the browser is then sent
// to the provider and comes back to /auth/callback.
export async function POST(request: NextRequest) {
  const origin = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL, request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  // A disabled or misconfigured provider answers JSON on the Supabase domain:
  // check before sending the visitor there.
  const ready = !error && !!data.url && (await providerAnswers(data.url));
  const target = ready ? data.url : new URL(GOOGLE_ERROR_PATH, origin).toString();
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
