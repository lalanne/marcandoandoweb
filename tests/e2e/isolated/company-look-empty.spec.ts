import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-12 amendment (issue #141): the company pages when `/empresas`
// has no pack (criterion 105) and when it has no published Empresas item at all
// (criteria 70, 72, 105, 106, 107). Like empresas-empty.spec.ts, this unpublishes
// seeded items for a moment, so it lives in tests/e2e/isolated/ and publishes
// every one of them again at the end.

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("company-look-empty");
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

async function hide(kind?: "pack" | "producto"): Promise<() => Promise<void>> {
  let query = admin
    .from("product")
    .update({ is_published: false })
    .eq("audience", "empresas")
    .eq("is_published", true);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query.select("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  expect(ids.length).toBeGreaterThan(0);
  return async () => {
    const { error: restore } = await admin.from("product").update({ is_published: true }).in("id", ids);
    if (restore) throw new Error(restore.message);
  };
}

const nav = (page: Page) =>
  page.getByRole("banner").getByRole("navigation", { name: "Secciones" });

async function headerTexts(page: Page): Promise<string[]> {
  await expect(nav(page).getByRole("link", { name: "Cómo cotizar" })).toBeVisible({ timeout: 20_000 });
  return nav(page)
    .locator("a")
    .allInnerTexts()
    .then((all) => all.map((t) => t.trim()).filter((t) => !/^(Admin|Mi panel)$/.test(t)));
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("[002-AC105] with no Empresas pack, the company header has no Packs link, on /empresas and on a product page", async ({
  page,
}) => {
  const restore = await hide("pack");
  try {
    for (const path of ["/empresas", "/productos/demo-empresa-polera"]) {
      await page.goto(path);
      await expect(nav(page).getByRole("link", { name: "Productos", exact: true })).toBeVisible({
        timeout: 20_000,
      });
      expect(await headerTexts(page), path).toEqual([
        "Productos",
        "Cómo cotizar",
        "Web para personas",
        "Cotizar por WhatsApp",
      ]);
      await noHorizontalScroll(page);
    }
    await page.goto("/empresas");
    await expect(page.locator("#packs")).toHaveCount(0);
    await expect(page.locator("#productos article").first()).toBeVisible({ timeout: 20_000 });
  } finally {
    await restore();
  }
});

test("[002-AC105] with no Empresas item, the company header has no Productos and no Packs link and fits", async ({
  page,
}) => {
  const restore = await hide();
  try {
    await page.goto("/empresas");
    expect(await headerTexts(page)).toEqual(["Cómo cotizar", "Web para personas", "Cotizar por WhatsApp"]);
    await expect(nav(page).getByRole("link", { name: "Catálogo empresa" })).toHaveCount(0);
    await noHorizontalScroll(page);
  } finally {
    await restore();
  }
});

test("[002-AC106] with no Empresas item, /empresas has the hero, the preparing line, Cómo cotizar and the band, and no Ver productos", async ({
  page,
}) => {
  const restore = await hide();
  try {
    const response = await page.goto("/empresas");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Productos personalizados con el logo de su empresa",
    );
    await expect(page.getByText("Catálogo empresa", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Ver productos" })).toHaveCount(0);
    await expect(
      page.getByText("Estamos preparando el catálogo para empresas. Escríbanos y le contamos."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#productos")).toHaveCount(0);
    await expect(page.locator("#packs")).toHaveCount(0);
    await expect(page.locator("#cotizar").getByRole("heading", { level: 2 })).toHaveText("Cómo cotizar");
    await expect(
      page.getByRole("heading", { name: "¿Necesita productos con el logo de su empresa?" }),
    ).toBeVisible();
    // The page text is in usted.
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/(^|[^\p{L}])(tú|tu|tus|te|cotiza|escríbenos|cuéntanos)($|[^\p{L}])/iu);
  } finally {
    await restore();
  }
});
