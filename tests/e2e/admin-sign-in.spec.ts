import { AxeBuilder } from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ADMIN, NON_ADMIN, supabaseEnv } from "./supabase";

const PANEL_HEADING = /panel de administración/i;

async function signIn(
  page: Page,
  user: { email: string; password: string },
) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// Puts a real non-admin session in the browser as the cookie @supabase/ssr
// reads, to prove the panel refuses a signed-in non-admin who did not go
// through our sign-in form.
async function addSessionCookie(
  context: BrowserContext,
  baseURL: string,
  user: { email: string; password: string },
) {
  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword(user);
  if (error) throw new Error(error.message);
  const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const chunks = value.match(/.{1,3180}/g) ?? [value];
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name: chunks.length === 1 ? name : `${name}.${i}`,
      value: chunk,
      url: baseURL,
    })),
  );
}

test("[002-AC3] a visitor who is not signed in is sent to sign-in and sees no data", async ({
  page,
}) => {
  for (const path of ["/panel", "/panel/productos", "/panel/a/b"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  }
});

test("[002-AC4] the admin signs in with the right password and reaches the panel", async ({
  page,
}) => {
  await signIn(page, ADMIN);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
  await expect(page.getByText(ADMIN.email)).toBeVisible();
});

test("[002-AC4] a wrong password shows a Spanish error and stays signed out", async ({
  page,
}) => {
  await signIn(page, { email: ADMIN.email, password: "clave-incorrecta" });
  await expect(page.locator("main [role=alert]")).toHaveText(
    "El correo o la contraseña no son correctos.",
  );
  await expect(page).toHaveURL(/\/entrar/);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
});

test("[002-AC5] a signed-in user who is not the admin is refused at sign-in", async ({
  page,
}) => {
  await signIn(page, NON_ADMIN);
  await expect(page.locator("main [role=alert]")).toHaveText(
    "Esta cuenta no tiene acceso al panel.",
  );
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
});

test("[002-AC5] a non-admin session opening the panel is refused", async ({
  page,
  context,
  baseURL,
}) => {
  await addSessionCookie(context, baseURL!, NON_ADMIN);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.locator("main [role=alert]")).toHaveText(
    "Esta cuenta no tiene acceso al panel.",
  );
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
});

test("[002-AC10] after signing out, the back button does not show the panel", async ({
  page,
}) => {
  await signIn(page, ADMIN);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.goBack();
  // Back lands on the panel's history entry; the guard must send it to sign-in.
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  // Not even a hidden copy of the panel may stay in the page.
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
  await expect(page.getByText(ADMIN.email)).toHaveCount(0);
});

test("sign-in and panel have no serious or critical accessibility violations", async ({
  page,
}) => {
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  };
  await page.goto("/entrar");
  expect(await check()).toEqual([]);
  await signIn(page, ADMIN);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
  expect(await check()).toEqual([]);
});
