import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin } from "./supabase";

// Spec 002, criteria 43 to 45 (amendment of 2026-10-31, issue #79): getting
// back to the public site from the panel and from the sign-in page. Signing
// out ends every session of a user, so each test uses its own throwaway admin.

const PANEL_HEADING = /panel de administración/i;

async function signIn(page: Page, admin: { email: string; password: string }) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(admin.email);
  await page.getByLabel("Contraseña").fill(admin.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: PANEL_HEADING })).toBeVisible();
}

const headerAccountLink = (page: Page) =>
  page.locator("header").getByRole("link", { name: /^(Entrar|Mi panel)$/ });

test("[002-AC43] Salir ends on the home page, signed out", async ({ page }, testInfo) => {
  const admin = await createTestAdmin(`salir-${testInfo.project.name}`);
  try {
    await signIn(page, admin);
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/salir") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Salir" }).click();
    // A full page load: the POST answers with a redirect, not a client update.
    expect((await response).status()).toBe(303);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Marcamos tus ideas").first()).toBeVisible();
    await expect(headerAccountLink(page)).toHaveText("Entrar");
    await expect(headerAccountLink(page)).toHaveAttribute("href", "/entrar");

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/entrar/);
  } finally {
    await admin.remove();
  }
});

test("[002-AC44] the panel header has Ver sitio, which keeps the admin signed in", async ({
  page,
}, testInfo) => {
  const admin = await createTestAdmin(`ver-sitio-${testInfo.project.name}`);
  try {
    await signIn(page, admin);
    const link = page.getByRole("navigation", { name: "Panel" }).getByRole("link", {
      name: "Ver sitio",
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");
    // Reachable with the keyboard.
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/$/);
    await expect(headerAccountLink(page)).toHaveText("Mi panel");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await admin.remove();
  }
});

test("[002-AC45] the sign-in page has Volver al sitio above the form", async ({ page }) => {
  await page.goto("/entrar");
  const link = page.getByRole("link", { name: "Volver al sitio" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/");
  // Above the sign-in form.
  const linkBox = await link.boundingBox();
  const formBox = await page.getByLabel("Correo").boundingBox();
  expect(linkBox!.y).toBeLessThan(formBox!.y);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Marcamos tus ideas").first()).toBeVisible();
});
