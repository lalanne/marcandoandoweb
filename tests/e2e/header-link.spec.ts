import { AxeBuilder } from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createTestAdmin, NON_ADMIN, supabaseEnv } from "./supabase";

// Spec 002, "Sign-in link in the header" (criteria 27 to 31). Runs at 360 and
// 1280 px through the two Playwright projects.

const PANEL_HEADING = /panel de administración/i;

// Each test that signs in has its own throwaway admin: signing out revokes every
// session of a user, so a shared admin would break tests running at once.
async function withAdmin(
  label: string,
  run: (admin: { email: string; password: string }) => Promise<void>,
) {
  const admin = await createTestAdmin(label);
  try {
    await run(admin);
  } finally {
    await admin.remove();
  }
}

function headerLink(page: Page) {
  return page
    .locator("header")
    .getByRole("link", { name: /^(Entrar|Mi panel)$/ });
}

async function signIn(
  page: Page,
  user: { email: string; password: string },
) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

// Puts a session in the browser as the cookie @supabase/ssr reads (the sign-in
// form refuses non-admins, so this is the way to have one).
async function addSessionCookie(
  context: BrowserContext,
  baseURL: string,
  value: string,
) {
  const { url } = supabaseEnv();
  const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const chunks = value.match(/.{1,3180}/g) ?? [value];
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name: chunks.length === 1 ? name : `${name}.${i}`,
      value: chunk,
      url: baseURL,
    })),
  );
}

async function addUserSession(
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
  await addSessionCookie(
    context,
    baseURL,
    "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url"),
  );
}

test("[002-AC27] a visitor sees Entrar in the header without scrolling and it goes to /entrar", async ({
  page,
}) => {
  await page.goto("/");
  const link = headerLink(page);
  await expect(link).toHaveText("Entrar");
  await expect(link).toBeInViewport();
  await expect(link).toHaveAttribute("href", "/entrar");
  // The section links stay visible next to it.
  await expect(
    page.locator("header").getByRole("link", { name: "Cómo pedir" }),
  ).toBeInViewport();
  await expect(
    page.locator("header").getByRole("link", { name: "Colegios y grupos" }),
  ).toBeInViewport();
  await link.click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("[002-AC27] the header link is reachable with the keyboard with a visible focus", async ({
  page,
}) => {
  await page.goto("/");
  // Wait for the streamed parts, which replace the fallback link and would
  // drop the focus.
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
  const link = headerLink(page);
  await expect(link).toHaveText("Entrar");
  await page.keyboard.press("Tab");
  await link.focus();
  await expect(link).toBeFocused();
  const outline = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThan(0);
});

test("[002-AC27] the home page with the link has no horizontal scroll and no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(headerLink(page)).toBeVisible();
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
});

test("[002-AC28] the admin sees Mi panel in the header and it reaches the panel", async ({
  page,
}) => {
  await withAdmin("hdr28", async (admin) => {
    await signIn(page, admin);
    await page.goto("/");
    const link = headerLink(page);
    await expect(link).toHaveText("Mi panel");
    await expect(link).toHaveAttribute("href", "/panel");
    await expect(link).toBeInViewport();
    await link.click();
    await expect(page).toHaveURL(/\/panel$/);
    await expect(
      page.getByRole("heading", { name: PANEL_HEADING }),
    ).toBeVisible();
  });
});

test("[002-AC29] a signed-in user who is not the admin sees Entrar and no sign of who they are", async ({
  page,
  context,
  baseURL,
}) => {
  await addUserSession(context, baseURL!, NON_ADMIN);
  await page.goto("/");
  const link = headerLink(page);
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(link).toHaveText("Entrar");
  await expect(link).toHaveAttribute("href", "/entrar");
  await expect(page.getByText(NON_ADMIN.email)).toHaveCount(0);
  await expect(page.locator("header")).not.toContainText(NON_ADMIN.email);
});

test("[002-AC30] after signing out through /salir the link reads Entrar again", async ({
  page,
}) => {
  await withAdmin("hdr30", async (admin) => {
    await signIn(page, admin);
    await page.goto("/");
    await expect(headerLink(page)).toHaveText("Mi panel");
    await page.goto("/panel");
    await page.getByRole("button", { name: "Salir" }).click();
    // Sign-out ends on the home page (criterion 43).
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/");
    await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(headerLink(page)).toHaveText("Entrar");
    await expect(headerLink(page)).toHaveAttribute("href", "/entrar");
  });
});

test("[002-AC31] an unreadable session falls back to Entrar and the page still loads", async ({
  page,
  context,
  baseURL,
}) => {
  await addSessionCookie(context, baseURL!, "base64-bm90LWEtc2Vzc2lvbg");
  await page.goto("/");
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(headerLink(page)).toHaveText("Entrar");
  await expect(page.getByText("Marcamos tus ideas").first()).toBeVisible();
});

test("[002-AC31] the header does not shift when the label changes to Mi panel", async ({
  page,
  browser,
  baseURL,
}) => {
  // Measured once the catalog links (Productos, Packs) have streamed in, so
  // only the account link can account for a difference.
  const box = async (p: Page) => {
    await expect(
      p.locator("header").getByRole("link", { name: "Packs" }),
    ).toBeVisible({ timeout: 20_000 });
    return p.evaluate(() => {
      const header = document.querySelector("header")!.getBoundingClientRect();
      const link = [...document.querySelectorAll("header a")]
        .find((a) => /^(Entrar|Mi panel)$/.test(a.textContent ?? ""))!
        .getBoundingClientRect();
      return {
        x: link.x,
        y: link.y,
        width: link.width,
        height: link.height,
        header: header.height,
      };
    });
  };
  await page.goto("/");
  await expect(headerLink(page)).toHaveText("Entrar");
  const visitor = await box(page);

  await withAdmin("hdr31", async (admin) => {
    const adminContext = await browser.newContext({
      ...test.info().project.use,
      baseURL: baseURL!,
    });
    try {
      const adminPage = await adminContext.newPage();
      await signIn(adminPage, admin);
      await adminPage.goto("/");
      await expect(headerLink(adminPage)).toHaveText("Mi panel");
      expect(await box(adminPage)).toEqual(visitor);
    } finally {
      await adminContext.close();
    }
  });
});
