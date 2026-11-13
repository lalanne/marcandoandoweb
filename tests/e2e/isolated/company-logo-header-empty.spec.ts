import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-12 amendment (issue #148), criterion 114: with no published
// Empresas item the people's header has neither the company logo nor the line.
// Like empresas-empty.spec.ts, this unpublishes the seeded Empresas items for a
// moment, so it lives in tests/e2e/isolated/ and publishes them again at the end.

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("company-logo-header-empty");
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.signInWithPassword(created);
  if (error) throw new Error(error.message);
});

test.afterAll(async () => {
  await removeAdmin();
});

test("[002-AC114] with no published Empresas item, the header has neither the company logo nor the line", async ({
  page,
}) => {
  const { data, error } = await admin
    .from("product")
    .update({ is_published: false })
    .eq("audience", "empresas")
    .eq("is_published", true)
    .select("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  expect(ids.length).toBeGreaterThan(0);
  try {
    for (const path of ["/", "/productos/demo-botella-ejemplo"]) {
      await page.goto(path);
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "Cómo pedir" })).toBeVisible({
        timeout: 20_000,
      });
      // The catalog links have streamed in once "Productos" shows.
      await expect(header.getByRole("link", { name: "Productos", exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(header.getByRole("link", { name: "Catálogo empresa" })).toHaveCount(0);
      await expect(header.getByRole("img", { name: /soluciones corporativas/ })).toHaveCount(0);
      await expect(header.locator("a[href='/empresas']")).toHaveCount(0);
      await expect(header.locator(".logo-divider")).toHaveCount(0);
      await expect(header.locator("[aria-hidden='true']:not(svg)")).toHaveCount(0);
      // The people's logo is the only image in the header, with its own link.
      await expect(header.getByRole("img")).toHaveCount(1);
      await expect(header.getByRole("link", { name: /polera rosada/ })).toHaveAttribute(
        "href",
        /#inicio$/,
      );
    }
  } finally {
    const { error: restore } = await admin.from("product").update({ is_published: true }).in("id", ids);
    if (restore) throw new Error(restore.message);
  }
});
