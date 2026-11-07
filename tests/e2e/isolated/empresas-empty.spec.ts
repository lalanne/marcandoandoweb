import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 002, criteria 70 and 72: with no published Empresas item the header has no
// "Catálogo empresa" link and /empresas still answers with its empty state.
// This hides every published Empresas item for a moment, so it would break the
// tests that read the seeded catalog at the same time. That is why it lives in
// tests/e2e/isolated/ (see playwright.config.ts). Every item it unpublishes is
// published again at the end.

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;
// The public pages are cached (spec 002, criteria 97 and 98): after each direct
// change the cache is refreshed the way the admin does, with a save in the panel.
let refresh: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("empresas-empty");
  removeAdmin = created.remove;
  refresh = () => refreshCatalog(created);
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

async function hideEmpresas(): Promise<() => Promise<void>> {
  const { data, error } = await admin
    .from("product")
    .update({ is_published: false })
    .eq("audience", "empresas")
    .eq("is_published", true)
    .select("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  expect(ids.length).toBeGreaterThan(0);
  await refresh();
  return async () => {
    const { error: restore } = await admin
      .from("product")
      .update({ is_published: true })
      .in("id", ids);
    if (restore) throw new Error(restore.message);
    await refresh();
  };
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Secciones" });

test("[002-AC70] with no published Empresas item, no page has the Catálogo empresa link, and the others follow criteria 34 and 35", async ({
  page,
}) => {
  const restore = await hideEmpresas();
  try {
    for (const path of ["/", "/productos/demo-botella-ejemplo", "/empresas"]) {
      await page.goto(path);
      await expect(nav(page).getByRole("link", { name: "Cómo pedir" })).toBeVisible();
      // The catalog links stream in; wait for the Personas ones.
      await expect(nav(page).getByRole("link", { name: "Packs", exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(nav(page).getByRole("link", { name: "Catálogo empresa" })).toHaveCount(0);
      const texts = await nav(page)
        .locator("a")
        .allInnerTexts()
        .then((all) => all.map((t) => t.trim()).filter((t) => !/^(Admin|Mi panel)$/.test(t)));
      expect(texts, path).toEqual(["Productos", "Packs", "Cómo pedir", "Colegios y grupos"]);
    }
  } finally {
    await restore();
  }
});

test("[002-AC72] with no published Empresas item, /empresas answers 200 with the heading, intro, button and the preparing line, and no sections", async ({
  page,
}) => {
  const restore = await hideEmpresas();
  try {
    const response = await page.goto("/empresas");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Catálogo empresa" })).toBeVisible();
    await expect(
      page.getByText(
        "Poleras, polerones, tazones, botellas y regalos con el logo de tu empresa. Cotiza por volumen por WhatsApp.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Cotizar por WhatsApp" }),
    ).toBeVisible();
    await expect(
      page.getByText("Estamos preparando el catálogo para empresas. Escríbenos y te contamos."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#productos")).toHaveCount(0);
    await expect(page.locator("#packs")).toHaveCount(0);
  } finally {
    await restore();
  }
});
