import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Supabase client for Server Components and Server Actions, with the session in
// cookies. Uses the public anon key only; the service-role key is never read by
// the app. URL and key come from the environment at run time.
export async function createClient() {
  // The auth client reads the clock (token expiry), so it must run at request
  // time, never while Next prerenders or prefetches a route.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot write cookies. The
            // proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
