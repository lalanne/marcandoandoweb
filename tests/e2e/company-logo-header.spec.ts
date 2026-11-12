import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Spec 002, 2026-11-12 amendment (issue #148, criteria 112, 113, 115 and 117): the
// company logo next to the people's logo in the people's header, and the cropped
// logo in the company header. Reads the seeded fake company items
// (supabase/seed.sql). The case with no published Empresas item (criterion 114)
// is in isolated/company-logo-header-empty.spec.ts.

const PAGE_TIMEOUT = 20_000;
const PEOPLE_PAGES = ["/", "/?coleccion=navidad", "/productos/demo-botella-ejemplo"] as const;
const COMPANY_ALT = "Marcando Ando, soluciones corporativas";
const PEOPLE_ALT = "Marcando Ando, logo con una polera rosada con una M y un tazón morado";

const wide = (page: Page) => page.viewportSize()!.width >= 768;

async function openPeoplePage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("banner").getByRole("link", { name: "Cómo pedir" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("banner").getByRole("link", { name: COMPANY_ALT })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const path of PEOPLE_PAGES) {
  test(`[002-AC112] on ${path} the company logo sits after the people's logo and a line, on one row`, async ({
    page,
  }) => {
    await openPeoplePage(page, path);
    const header = page.getByRole("banner");
    const peopleLink = header.getByRole("link", { name: PEOPLE_ALT });
    const companyLink = header.getByRole("link", { name: COMPANY_ALT });
    await expect(peopleLink).toHaveAttribute("href", /#inicio$/);
    await expect(companyLink).toHaveAttribute("href", "/empresas");
    const companyImg = companyLink.getByRole("img", { name: COMPANY_ALT });
    await expect(companyImg).toHaveAttribute("src", "/img/logo-empresas.webp");

    // In order: people's logo, a decorative line, company logo.
    const line = header.locator("[aria-hidden='true'].logo-divider");
    await expect(line).toHaveCount(1);
    const order = await page.evaluate(() => {
      const h = document.querySelector("header")!;
      const people = h.querySelector("a[href$='#inicio']")!;
      const company = h.querySelector("a[href='/empresas']:has(img)")!;
      const divider = h.querySelector(".logo-divider")!;
      const before = (a: Element, b: Element) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return before(people, divider) && before(divider, company);
    });
    expect(order).toBe(true);
    const lineStyle = await line.evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        width: Math.round(box.width),
        height: box.height,
        color: s.backgroundColor,
        text: el.textContent,
      };
    });
    expect(lineStyle.width).toBe(1);
    expect(lineStyle.text).toBe("");
    // --brand-night at 35% opacity (the browser reports the colour as rgba or oklab).
    expect(lineStyle.color).toMatch(/0\.35\)$/);

    // Sizes: the people's logo as before (64 and 80 px), the company logo 32 and 40 px.
    const peopleBox = (await peopleLink.getByRole("img").boundingBox())!;
    const companyBox = (await companyImg.boundingBox())!;
    expect(Math.round(peopleBox.height)).toBe(wide(page) ? 80 : 64);
    expect(Math.round(companyBox.height)).toBe(wide(page) ? 40 : 32);
    // Same row: the two logos are centred on the same line.
    const centre = (b: { y: number; height: number }) => b.y + b.height / 2;
    expect(Math.abs(centre(peopleBox) - centre(companyBox))).toBeLessThanOrEqual(2);
    expect(companyBox.x).toBeGreaterThan(peopleBox.x + peopleBox.width);
    await noHorizontalScroll(page);
  });
}

test("[002-AC113] the company logo link opens /empresas and shows a focus ring from the keyboard", async ({
  page,
}) => {
  await openPeoplePage(page, "/");
  const link = page.getByRole("banner").getByRole("link", { name: COMPANY_ALT });
  await link.focus();
  await expect(link).toBeFocused();
  const outline = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(2);
  await link.click();
  await expect(page).toHaveURL(/\/empresas$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: PAGE_TIMEOUT });
});

for (const path of ["/", "/productos/demo-botella-ejemplo"]) {
  test(`[002-AC115] on ${path} the header keeps its height when the company logo appears, has no horizontal scroll and passes axe`, async ({
    page,
  }) => {
    // Record the header's height on every frame from the first one, so the frames
    // before the catalog streams in are compared with the last.
    await page.addInitScript(() => {
      const heights: number[] = [];
      (window as unknown as { __heights: number[] }).__heights = heights;
      const tick = () => {
        const h = document.querySelector("header");
        if (h) heights.push(Math.round(h.getBoundingClientRect().height));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await openPeoplePage(page, path);
    await page.waitForTimeout(500);
    const heights = await page.evaluate(
      () => (window as unknown as { __heights: number[] }).__heights,
    );
    expect(heights.length).toBeGreaterThan(0);
    expect([...new Set(heights)], `heights seen: ${heights.join(",")}`).toHaveLength(1);

    await noHorizontalScroll(page);
    // Every link keeps its 44 px target where criterion 18 requires it: the logo
    // links are as tall as their logos or taller.
    const logoLink = page.getByRole("banner").getByRole("link", { name: COMPANY_ALT });
    const box = (await logoLink.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(wide(page) ? 40 : 32);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
    ).toEqual([]);
  });
}

for (const path of ["/empresas", "/productos/demo-empresa-polera"]) {
  test(`[002-AC117] the company header logo on ${path} is 28 px tall at 360 px and 40 px at 1280 px`, async ({
    page,
  }) => {
    await page.goto(path);
    const logo = page.getByRole("banner").getByRole("img", { name: COMPANY_ALT });
    await expect(logo).toBeVisible({ timeout: PAGE_TIMEOUT });
    const box = (await logo.boundingBox())!;
    expect(Math.round(box.height)).toBe(wide(page) ? 40 : 28);
    await expect(page.getByRole("banner").getByRole("link", { name: "Cómo cotizar" })).toBeVisible();
    await noHorizontalScroll(page);
  });
}
