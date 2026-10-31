import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "../supabase";

// Spec 002, criterion 34: a type with no published product has no section and
// no header link. This hides every published product of one type for a moment,
// so it would break the tests that read the seeded catalog at the same time.
// That is why it lives in tests/e2e/isolated/: playwright.config.ts runs it
// after every other test, one viewport after the other. Every product it
// unpublishes is published again at the end.

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("empty-type");
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

async function hideKind(kind: "producto" | "pack"): Promise<() => Promise<void>> {
  const { data, error } = await admin
    .from("product")
    .update({ is_published: false })
    .eq("kind", kind)
    .eq("is_published", true)
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

const headerLink = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name, exact: true });

async function openHome(page: Page) {
  await page.goto("/");
  // The catalog streams in after the shell; the static links are always there.
  await expect(headerLink(page, "Cómo pedir")).toBeVisible();
}

test("[002-AC34] with no published pack, the Packs section and link are not shown, and Productos is", async ({
  page,
}) => {
  const restore = await hideKind("pack");
  try {
    await openHome(page);
    await expect(page.locator("#productos article").first()).toBeVisible({ timeout: 20_000 });
    await expect(headerLink(page, "Productos")).toBeVisible();
    await expect(page.locator("#packs")).toHaveCount(0);
    await expect(headerLink(page, "Packs")).toHaveCount(0);
  } finally {
    await restore();
  }
});

test("[002-AC34] with no published producto, the Productos section and link are not shown, and Packs is", async ({
  page,
}) => {
  const restore = await hideKind("producto");
  try {
    await openHome(page);
    await expect(page.locator("#packs article").first()).toBeVisible({ timeout: 20_000 });
    await expect(headerLink(page, "Packs")).toBeVisible();
    await expect(page.locator("#productos")).toHaveCount(0);
    await expect(headerLink(page, "Productos")).toHaveCount(0);
  } finally {
    await restore();
  }
});
