import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, criterion 37 (amendment of 2026-10-31, issue #69): the panel has no
// "Diseños". The design table and its rows stay, so the address of an existing
// design must still give nothing away.

const DESIGN_SLUG = "demo-diseno-estrellas";
const DESIGN_TITLE = "Diseño de ejemplo: estrellas";

let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;
let designId: string;

test.beforeAll(async () => {
  const created = await createTestAdmin("no-designs");
  ADMIN = created;
  removeAdmin = created.remove;
  // The seeded published design, read the way the public reads it.
  const { url, anonKey } = supabaseEnv();
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon
    .from("design")
    .select("id")
    .eq("slug", DESIGN_SLUG)
    .single();
  if (error) throw new Error(error.message);
  designId = data.id;
});

test.afterAll(async () => {
  await removeAdmin();
});

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

const designPaths = () => [
  "/panel/disenos",
  "/panel/disenos/nuevo",
  `/panel/disenos/${designId}`,
];

test("[002-AC37] the panel menu and the panel home have no Diseños link", async ({
  page,
}) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Diseños/ })).toHaveCount(0);
  await expect(page.locator('a[href^="/panel/disenos"]')).toHaveCount(0);
  // Productos is still there, in the menu and on the home.
  await expect(
    page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Productos" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Productos" })).toBeVisible();

  await page.goto("/panel/productos");
  await expect(page.getByRole("link", { name: /Diseños/ })).toHaveCount(0);
});

test("[002-AC37] the design addresses answer not found to the admin, with no design data", async ({
  page,
}) => {
  await signIn(page);
  for (const path of designPaths()) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByText(DESIGN_TITLE)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /dise/i })).toHaveCount(0);
  }
});

test("[002-AC37] a visitor who is not signed in is still sent to the sign-in page from the design addresses", async ({
  page,
}) => {
  for (const path of designPaths()) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/entrar/);
  }
});
