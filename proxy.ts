import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "./lib/auth/admin";
import { isPublishedSlug } from "./lib/catalog/queries";
import { createPublicClient } from "./lib/supabase/public";

// A product page for a slug that is not published (or does not exist) must answer
// with a real 404 status (spec 002, criterion 60). The page itself streams after
// the shell, so by the time it calls notFound() the status is already 200. This
// check runs first and rewrites to a path that does not exist, which renders the
// site's not-found page with status 404. The page still checks for itself.
async function productPageGuard(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.pathname.slice("/productos/".length);
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // A malformed address is not a product.
  }
  let exists = true;
  try {
    exists = await isPublishedSlug(createPublicClient(), slug);
  } catch {
    // The database could not be read: let the page report it.
  }
  if (exists) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/producto-no-encontrado";
  url.search = "";
  return NextResponse.rewrite(url);
}

// Guards every /panel route: no session goes to the sign-in page, a session that
// is not the admin is refused. Also refreshes the session cookies. The panel
// layout checks again; this is the first line, not the only one.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/productos/")) {
    return productPageGuard(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser asks the auth server, so a forged or revoked token does not pass.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = user ? "?error=sin-acceso" : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  // Never cache panel pages, so the back button after sign-out shows nothing.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/productos/:slug"],
};
