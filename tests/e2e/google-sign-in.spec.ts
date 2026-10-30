import { AxeBuilder } from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ADMIN, ADMIN_TWO, createTestAdmin, supabaseEnv } from "./supabase";

// Spec 005. CI never talks to Google: the redirect to the Supabase authorize URL
// is intercepted and never followed. The real round trip is checked by hand by
// the owner (specs/traceability-exemptions.txt, 005-AC3).

const PANEL_HEADING = /panel de administración/i;
const GOOGLE_ERROR = "No pudimos entrar con Google. Inténtalo de nuevo o usa tu correo y contraseña.";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

// A real session in the cookie @supabase/ssr reads. A session is the same
// whichever way the user signed in, so this stands in for a Google session.
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

test("[005-AC1] /entrar shows a Continuar con Google button next to the email form", async ({
  page,
}) => {
  await page.goto("/entrar");
  const google = page.getByRole("button", { name: "Continuar con Google" });
  await expect(google).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  // Same card as the email form, and fully inside the viewport.
  const box = await google.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  await expectNoHorizontalScroll(page);
});

test("[005-AC2] the button posts to the app, which answers with a redirect to the Supabase authorize URL with this site's callback", async ({
  page,
  baseURL,
}) => {
  // Safety net: nothing in CI may ever reach Google.
  await page.route(/^https:\/\/accounts\.google\.com\//, (route) => route.abort());
  // Intercept the app's answer and read where it points, without following it:
  // the browser never goes on to Supabase's redirect to Google.
  let location: string | undefined;
  let method: string | undefined;
  await page.route("**/auth/google", async (route) => {
    method = route.request().method();
    const response = await route.fetch({ maxRedirects: 0 });
    expect(response.status()).toBe(303);
    location = response.headers()["location"];
    await route.fulfill({ status: 200, contentType: "text/plain", body: "intercepted" });
  });
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect.poll(() => location).toBeTruthy();

  const authorize = new URL(location!);
  expect(method).toBe("POST");
  expect(authorize.origin).toBe(new URL(supabaseEnv().url).origin);
  expect(authorize.pathname).toBe("/auth/v1/authorize");
  expect(authorize.searchParams.get("provider")).toBe("google");
  expect(authorize.searchParams.get("redirect_to")).toBe(`${baseURL}/auth/callback`);
  expect(authorize.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorize.searchParams.get("code_challenge_method")?.toLowerCase()).toBe("s256");
});

test("[005-AC2] the PKCE verifier waits in a cookie for the callback", async ({
  context,
}) => {
  // The request context shares the browser's cookies and does not follow redirects.
  const response = await context.request.post("/auth/google", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toContain("/auth/v1/authorize?provider=google");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name.endsWith("-code-verifier"))).toBe(true);
});

test("[005-AC6] a callback without a code lands on /entrar with a Spanish error", async ({
  page,
}) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/entrar\?error=google$/);
  await expect(page.locator("main [role=alert]")).toHaveText(GOOGLE_ERROR);
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
});

test("[005-AC6] the user cancelling at Google lands on /entrar with a Spanish error", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_code=bad_oauth_callback&error_description=Access+denied",
  );
  await expect(page).toHaveURL(/\/entrar\?error=google$/);
  await expect(page.locator("main [role=alert]")).toHaveText(GOOGLE_ERROR);
});

test("[005-AC6] a code that cannot be exchanged lands on /entrar with a Spanish error", async ({
  page,
}) => {
  await page.goto("/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/entrar\?error=google$/);
  await expect(page.locator("main [role=alert]")).toHaveText(GOOGLE_ERROR);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar/);
});

test("[005-AC8] a next parameter that leaves the site is ignored", async ({ page }) => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
    await page.goto(`/auth/callback?next=${encodeURIComponent(next)}`);
    await expect(page).toHaveURL(/localhost:3000\/entrar\?error=google$/);
  }
});

test("[005-AC9] after signing out a session ends and /panel redirects to /entrar", async ({
  page,
  context,
  baseURL,
}) => {
  const admin = await createTestAdmin("google-signout");
  try {
    await addSessionCookie(context, baseURL!, admin);
    await page.goto("/panel");
    await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByRole("heading", { name: PANEL_HEADING })).toHaveCount(0);
  } finally {
    await admin.remove();
  }
});

test("[005-AC10] email and password sign-in still works next to the Google button", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
});

test("[005-AC12] the second admin reaches /panel as well", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN_TWO.email);
  await page.getByLabel("Contraseña").fill(ADMIN_TWO.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
  await expect(page.getByText(ADMIN_TWO.email)).toBeVisible();
});

test("[005-AC11] /entrar and its Google error state have no serious or critical axe violations and no horizontal scroll", async ({
  page,
}) => {
  for (const path of ["/entrar", "/entrar?error=google", "/entrar?error=sin-acceso"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
      path,
    ).toEqual([]);
    await expectNoHorizontalScroll(page);
  }
});
