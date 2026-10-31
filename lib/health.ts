import { createClient } from "@supabase/supabase-js";

export type HealthSettings = {
  url: string | undefined;
  anonKey: string | undefined;
};

const READ_TIMEOUT_MS = 8_000;

function reply(status: 200 | 503, body: "ok" | "error"): Response {
  return new Response(JSON.stringify({ status: body }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Spec 004, criterion 15. Reads the products with the anonymous public client
 * and answers `ok` (200) or `error` (503). Nothing else leaves this function: a
 * missing or wrong URL or key and a failed read all look the same from outside,
 * so the public route reveals no setting, key or error message. The settings are
 * passed in so tests can break them one at a time.
 */
export async function healthResponse({
  url,
  anonKey,
}: HealthSettings): Promise<Response> {
  if (!url || !anonKey) return reply(503, "error");
  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(READ_TIMEOUT_MS) }),
      },
    });
    // Row-level security returns only published products; none is still "ok".
    const { error } = await client.from("product").select("id").limit(1);
    return error ? reply(503, "error") : reply(200, "ok");
  } catch {
    return reply(503, "error");
  }
}
