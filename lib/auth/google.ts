import { isAdminUser } from "./admin";

// Pure helpers for the Google sign-in flow (spec 005). No I/O, so they are unit
// tested; the route handlers in app/auth/ do the talking to Supabase.

const DEFAULT_NEXT = "/panel";

// A "next" path is accepted only when it is a relative path on this site.
// Anything else (absolute URLs, //host, /\host, encoded or control-character
// variants) is ignored, which prevents open redirects (spec 005, criterion 8).
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  if (!isPlainSitePath(next)) return DEFAULT_NEXT;
  // Reject encoded tricks too: look at the value after one and two decodings,
  // since a proxy or a framework may decode it again before it is used.
  let decoded = next;
  for (let i = 0; i < 2; i += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return DEFAULT_NEXT;
    }
    if (!isPlainSitePath(decoded)) return DEFAULT_NEXT;
  }
  return next;
}

function isPlainSitePath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  // Control characters and whitespace are stripped by browsers inside URLs,
  // which can turn "/\t/evil.com" into "//evil.com".
  if (/[\u0000- \u007f-\u009f]/.test(value)) return false;
  try {
    return new URL(value, "http://site.invalid").origin === "http://site.invalid";
  } catch {
    return false;
  }
}

export type AfterSignIn = { path: string; signOut: boolean };

// The decision after Supabase has returned a user: the admin (same rule as
// public.is_admin()) goes on, anyone else is signed out and refused.
export function decideAfterSignIn(
  user:
    | { app_metadata?: object | null; user_metadata?: object | null }
    | null
    | undefined,
  next: string | null | undefined,
): AfterSignIn {
  if (isAdminUser(user)) return { path: safeNextPath(next), signOut: false };
  return { path: "/entrar?error=sin-acceso", signOut: true };
}

// The callback failed before any exchange when Google or Supabase reported an
// error (including the user cancelling) or when there is no code.
export function callbackFailed(params: URLSearchParams): boolean {
  if (params.has("error") || params.has("error_code")) return true;
  if (params.has("error_description")) return true;
  return !params.get("code");
}

// The address Google should bring the browser back to. NEXT_PUBLIC_SITE_URL
// wins when it is a valid http(s) address; otherwise the request's own origin.
// Supabase's redirect allowlist is the second line of defence.
export function siteOrigin(
  configured: string | undefined,
  requestUrl: string,
): string {
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Not a URL: fall back to the request.
    }
  }
  return new URL(requestUrl).origin;
}

export const GOOGLE_ERROR_PATH = "/entrar?error=google";

// signInWithOAuth builds the authorize URL without asking whether the provider is
// enabled, and a disabled provider answers raw JSON on the Supabase domain. So the
// server asks first, without following the redirect (it never reaches Google):
// a redirect means the provider is on; a 4xx or 5xx, or a failed request, means
// it is not (spec 005, criterion 7).
export async function providerAnswers(
  authorizeUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(authorizeUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    return response.status >= 300 && response.status < 400;
  } catch {
    return false;
  }
}
