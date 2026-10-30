import { connection } from "next/server";
import { healthResponse } from "@/lib/health";

// Spec 004, criterion 15. Public, read-only, answers only ok or error.
// connection() makes the handler dynamic: with Cache Components a handler that
// reads nothing from the request could be prerendered at build time and serve a
// frozen answer. The settings are read at request time on purpose.
export async function GET() {
  await connection();
  return healthResponse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
