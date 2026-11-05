import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "../supabase";

// Spec 002, criterion 84: with no published Personas item in either collection the
// row of tabs is not shown, and `?coleccion=escolar` with no item in that
// collection shows Todos. This unpublishes every published item that has a
// collection for a moment, so it would break the tests that read the seeded
// catalog at the same time. That is why it lives in tests/e2e/isolated/ (see
// playwright.config.ts). Everything it unpublishes is published again at the end.

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("collection-tabs-empty");
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

async function hide(collections: string[]): Promise<() => Promise<void>> {
  const { data, error } = await admin
    .from("product")
    .update({ is_published: false })
    .eq("audience", "personas")
    .eq("is_published", true)
    .overlaps("collections", collections)
    .select("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  expect(ids.length).toBeGreaterThan(0);
  return async () => {
    const { error: restore } = await admin
      .from("product")
      .update({ is_published: true })
      .in("id", ids);
    if (restore) throw new Error(restore.message);
  };
}

const productos = (page: Page) => page.locator("#productos");

test("[002-AC84] with no Personas item in either collection there is no row of tabs and the page is as before", async ({
  page,
}) => {
  const restore = await hide(["navidad", "escolar"]);
  try {
    for (const path of ["/", "/?coleccion=navidad", "/?coleccion=escolar"]) {
      await page.goto(path);
      await expect(productos(page).locator("article").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("navigation", { name: "Colecciones" }), path).toHaveCount(0);
      await expect(page.locator("#colecciones")).toHaveCount(0);
      await expect(
        productos(page).getByRole("heading", { level: 3, name: "Botella de ejemplo", exact: true }),
        path,
      ).toBeVisible();
      await expect(page.locator("#packs article").first()).toBeVisible();
    }
  } finally {
    await restore();
  }
});

test("[002-AC84] with no item in Especial escolar, its tab is not shown and ?coleccion=escolar shows Todos", async ({
  page,
}) => {
  const restore = await hide(["escolar"]);
  try {
    await page.goto("/?coleccion=escolar");
    const tabs = page.getByRole("navigation", { name: "Colecciones" });
    await expect(tabs).toBeVisible({ timeout: 20_000 });
    await expect(tabs.getByRole("link", { name: "Especial escolar" })).toHaveCount(0);
    await expect(tabs.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "page");
    await expect(
      productos(page).getByRole("heading", { level: 3, name: "Botella de ejemplo", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
  } finally {
    await restore();
  }
});
