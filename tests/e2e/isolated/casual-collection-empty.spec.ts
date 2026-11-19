import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-19 amendment (issue #174), criterion 123: with no published
// Personas item in "Casual" (an unpublished one and an Empresas one are in it) there
// is no Casual tab, ?coleccion=casual shows Todos and neither item is listed. The
// seeded catalog has no Casual item, so this inserts its two and removes them. It
// lives in tests/e2e/isolated/ because the cache refresh and the extra items must
// not be seen by the tests that read the seeded catalog (see playwright.config.ts).

const PAGE_TIMEOUT = 20_000;
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("casual-empty");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.signInWithPassword(ADMIN);
  if (error) throw new Error(error.message);
});

test.afterAll(async () => {
  await admin.from("product").delete().like("name", `%casual vacio e2e ${run}%`);
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

const tabs = (page: Page) => page.getByRole("navigation", { name: "Colecciones" });

test("[002-AC123] with no published Personas item in Casual there is no Casual tab, ?coleccion=casual shows Todos and neither item is listed", async ({
  page,
}, testInfo) => {
  const tag = `${testInfo.project.name} casual vacio e2e ${run}`;
  const draft = `Borrador ${tag}`;
  const company = `Empresa ${tag}`;
  const base = { kind: "producto", is_available: true, collections: ["casual"] };
  for (const row of [
    { ...base, slug: `e2e-casual-d-${testInfo.project.name}-${run}`, name: draft, audience: "personas", is_published: false },
    { ...base, slug: `e2e-casual-e-${testInfo.project.name}-${run}`, name: company, audience: "empresas", is_published: true },
  ]) {
    const { error } = await admin.from("product").insert(row);
    if (error) throw new Error(error.message);
  }
  await refreshCatalog(ADMIN);

  for (const path of ["/", "/?coleccion=casual"]) {
    await page.goto(path);
    await expect(tabs(page)).toBeVisible({ timeout: PAGE_TIMEOUT });
    expect((await tabs(page).getByRole("link").allInnerTexts()).map((t) => t.trim()), path).toEqual([
      "Todos",
      "Especial Navidad",
      "Escolar",
    ]);
    await expect(tabs(page).getByRole("link", { name: "Casual" }), path).toHaveCount(0);
    await expect(tabs(page).getByRole("link", { name: "Todos" }), path).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.locator("#productos").getByRole("heading", { level: 3, name: "Botella de ejemplo", exact: true }),
      path,
    ).toBeVisible();
    for (const name of [draft, company]) {
      await expect(page.getByRole("heading", { level: 3, name }), `${path} ${name}`).toHaveCount(0);
    }
  }
});
