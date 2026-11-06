import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Spec 002, "Illustrated collection tabs" (criteria 93 to 96, issue #126) against
// the seeded fake items of supabase/seed.sql (both collections have items).

const PAGE_TIMEOUT = 20_000;
const tabs = (page: Page) => page.getByRole("navigation", { name: "Colecciones" });

const VIEWS = [
  { path: "/", chosen: "Todos", image: "/img/tab-todos.webp" },
  { path: "/?coleccion=navidad", chosen: "Especial Navidad", image: "/img/tab-navidad.webp" },
  { path: "/?coleccion=escolar", chosen: "Especial Escolar", image: "/img/tab-escolar.webp" },
] as const;
const LABELS = VIEWS.map((v) => v.chosen);

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(tabs(page)).toBeVisible({ timeout: PAGE_TIMEOUT });
}

const link = (page: Page, name: string) => tabs(page).getByRole("link", { name, exact: true });

const style = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      bg: s.backgroundColor,
      borderWidth: parseFloat(s.borderTopWidth),
      borderColor: s.borderTopColor,
      shadow: s.boxShadow,
      radius: parseFloat(s.borderTopLeftRadius),
    };
  });

const WHITE = "rgb(255, 255, 255)";
const NIGHT = "rgb(20, 24, 36)";

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("[002-AC93] each tab is an outlined pill with its own illustration to the left of its label, all the same height, none dark", async ({
  page,
}, testInfo) => {
  await open(page, "/");
  const heights: number[] = [];
  for (const view of VIEWS) {
    const a = link(page, view.chosen);
    const img = a.locator("img");
    await expect(img).toHaveAttribute("src", view.image);
    const imgBox = (await img.boundingBox())!;
    const aBox = (await a.boundingBox())!;
    const label = (await a.locator("span").boundingBox())!;
    expect(imgBox.x + imgBox.width, view.chosen).toBeLessThanOrEqual(label.x + 1);
    expect(imgBox.x).toBeGreaterThanOrEqual(aBox.x);
    heights.push(Math.round(imgBox.height));
    expect(await style(a).then((s) => s.radius), view.chosen).toBeGreaterThanOrEqual(20);
  }
  expect(new Set(heights).size).toBe(1);
  expect(heights[0]).toBe(testInfo.project.name.includes("360") ? 44 : 56);

  // Not chosen: white; no tab, chosen or not, has a dark background.
  for (const view of VIEWS) {
    await open(page, view.path);
    for (const label of LABELS) {
      const s = await style(link(page, label));
      expect(s.borderColor, label).toBe(NIGHT);
      if (label !== view.chosen) expect(s.bg, label).toBe(WHITE);
      expect(luminance(s.bg), `${label} is not dark`).toBeGreaterThan(0.5);
    }
  }
});

test("[002-AC94] only the chosen tab has aria-current, the soft yellow fill, the 3 px outline and the offset shadow", async ({
  page,
}) => {
  for (const view of VIEWS) {
    await open(page, view.path);
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
    for (const label of LABELS) {
      const a = link(page, label);
      const s = await style(a);
      if (label === view.chosen) {
        await expect(a, label).toHaveAttribute("aria-current", "page");
        expect(s.bg, label).toBe("rgb(251, 235, 200)");
        expect(s.borderWidth, label).toBe(3);
        expect(s.shadow, label).toMatch(/rgb\(20, 24, 36\) 3px 3px 0px/);
      } else {
        await expect(a, label).not.toHaveAttribute("aria-current", /.*/);
        expect(s.bg, label).toBe(WHITE);
        expect(s.borderWidth, label).toBe(2);
        expect(s.shadow, label).toBe("none");
      }
    }
  }
});

test("[002-AC95] illustrations have alt empty, the accessible name is the label, and the files are under /img/ with width, height and at most 30 KB", async ({
  page,
}) => {
  await open(page, "/");
  for (const view of VIEWS) {
    const a = link(page, view.chosen);
    const img = a.locator("img");
    await expect(img).toHaveAttribute("alt", "");
    await expect(img).toHaveAttribute("width", /^\d+$/);
    await expect(img).toHaveAttribute("height", /^\d+$/);
    await expect(img).not.toHaveAttribute("loading", "lazy");
    const src = (await img.getAttribute("src"))!;
    expect(src.startsWith("/img/")).toBe(true);
    const res = await page.request.get(src);
    expect(res.status()).toBe(200);
    expect((await res.body()).length, src).toBeLessThanOrEqual(30 * 1024);
    // The loaded image is real, not broken.
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
      true,
    );
  }
  expect(await tabs(page).getByRole("link").count()).toBe(3);
});

test("[002-AC96] keyboard, 44 px, no sideways scroll, contrast, one line at 1280 px, axe", async ({
  page,
}, testInfo) => {
  const wide = !testInfo.project.name.includes("360");
  for (const view of VIEWS) {
    await open(page, view.path);
    const tops = new Set<number>();
    for (const label of LABELS) {
      const a = link(page, label);
      const box = (await a.boundingBox())!;
      expect(box.height, label).toBeGreaterThanOrEqual(44);
      expect(box.width, label).toBeGreaterThanOrEqual(44);
      tops.add(Math.round(box.y));
      const s = await a.evaluate((el) => {
        const c = getComputedStyle(el);
        return { fg: c.color, bg: c.backgroundColor };
      });
      expect(contrast(s.fg, s.bg), label).toBeGreaterThanOrEqual(4.5);
    }
    if (wide) expect(tops.size, "one line at 1280 px").toBe(1);
    else expect(tops.size, "wraps to a second row at 360 px").toBe(2);

    // Outline against the cream page background: at least 3:1.
    expect(contrast(NIGHT, "rgb(251, 245, 233)")).toBeGreaterThanOrEqual(3);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      view.path,
    ).toBe(true);
    expect(await tabs(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    // Keyboard: focus lands on a tab with a visible ring.
    const first = link(page, "Todos");
    await first.focus();
    expect(
      await first.evaluate((el) => {
        const s = getComputedStyle(el);
        return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 3;
      }),
    ).toBe(true);

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
      view.path,
    ).toEqual([]);
  }
});

// Screenshots for the PR (not asserted): set TAB_SCREENSHOTS=<dir> to write them.
test("screenshots of each chosen tab", async ({ page }, testInfo) => {
  const dir = process.env.TAB_SCREENSHOTS;
  if (!dir) return;
  for (const view of VIEWS) {
    await open(page, view.path);
    await tabs(page).screenshot({
      path: `${dir}/tabs-${testInfo.project.name}-${view.chosen.replace(/\s+/g, "-").toLowerCase()}.png`,
    });
  }
});
