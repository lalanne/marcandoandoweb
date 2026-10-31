import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-out is a plain form POST followed by a full page load (303). A full load
// drops everything the browser kept in memory, including the panel pages that
// Next keeps hidden for the back button, so none of the panel stays around.
// It ends on the home page (spec 002, criterion 43), where the header then
// offers "Entrar" again.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
