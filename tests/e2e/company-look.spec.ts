import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Spec 002, 2026-11-12 amendment (issue #141, criteria 103 to 111): the corporate
// look of /empresas and of the page of every Empresas item, and the briefcase on
// the people's "Catálogo empresa" link. Reads the seeded fake company items
// (supabase/seed.sql). The cases with no published Empresas item or no pack are in
// isolated/company-look-empty.spec.ts.

const PAGE_TIMEOUT = 20_000;
const WA = "https://wa.me/56982661835";
const COMPANY_GENERAL =
  "Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar. Te cuento qué necesitamos:";
const COMPANY_PAGES = ["/empresas", "/productos/demo-empresa-polera"] as const;
const PEOPLE_PAGES = ["/", "/?coleccion=navidad", "/productos/demo-botella-ejemplo"] as const;

async function openCompanyPage(page: Page, path: string) {
  await page.goto(path);
  if (path === "/empresas") {
    await expect(page.locator("#productos article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(page.locator("#packs article").first()).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: PAGE_TIMEOUT });
  }
  // The header's catalog links stream in with the catalog.
  await expect(page.getByRole("banner").getByRole("link", { name: "Packs" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function openPeoplePage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("banner").getByRole("link", { name: "Cómo pedir" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("banner").getByRole("link", { name: "Packs" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

function messageOf(href: string | null): string {
  return new URL(href ?? "").searchParams.get("text") ?? "";
}

// Criteria 103 and 108: the look of the company pages.

for (const path of COMPANY_PAGES) {
  test(`[002-AC103] ${path} has the company logo, Montserrat and Inter, a white page, no offset shadow and no 2 px dark outline`, async ({
    page,
  }) => {
    await openCompanyPage(page, path);

    // The logo, and not the people's.
    const logo = page.getByRole("banner").getByRole("img", { name: "Marcando Ando, soluciones corporativas" });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", "/img/logo-empresas.webp");
    await expect(page.locator("header a:has(img)")).toHaveAttribute("href", "/empresas");
    await expect(page.locator('img[src*="/img/logo."], img[alt*="polera rosada"]')).toHaveCount(0);

    // Type: headings, header links and buttons in Montserrat, body text in Inter.
    const fonts = await page.evaluate(() => {
      const family = (el: Element | null) => (el ? getComputedStyle(el).fontFamily : "(missing)");
      const nav = document.querySelector("header nav");
      const main = document.querySelector("main")!;
      const button = [...main.querySelectorAll("a")].find((a) =>
        /Cotizar por WhatsApp|Pedir por WhatsApp|Ver/.test(a.textContent ?? ""),
      );
      const text = [...main.querySelectorAll("p")].find((p) => (p.textContent ?? "").length > 20);
      return {
        h1: family(main.querySelector("h1")),
        h2: family(main.querySelector("h2")),
        navLink: family(nav?.querySelector("a") ?? null),
        button: family(button ?? null),
        text: family(text ?? null),
        body: family(document.body),
      };
    });
    expect(fonts.h1).toMatch(/Montserrat/i);
    if (path === "/empresas") expect(fonts.h2).toMatch(/Montserrat/i);
    expect(fonts.navLink).toMatch(/Montserrat/i);
    expect(fonts.button).toMatch(/Montserrat/i);
    expect(fonts.text).toMatch(/Inter/i);
    // The body element keeps the layout's font; nothing on the page uses it.
    for (const family of [fonts.h1, fonts.h2, fonts.navLink, fonts.button, fonts.text]) {
      expect(family).not.toMatch(/Fredoka/i);
    }

    // The page background is white.
    const background = await page.evaluate(() => {
      const bg = (el: Element) => getComputedStyle(el).backgroundColor;
      return { body: bg(document.body), main: bg(document.querySelector("main")!) };
    });
    expect(background.body).toBe("rgb(255, 255, 255)");
    expect(["rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"]).toContain(background.main);

    // No offset shadow and no 2 px dark outline on any element.
    const offenders = await page.evaluate(() => {
      const luminance = (css: string) => {
        const m = css.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
        const [r, g, b] = m.slice(0, 3).map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const found: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        const label = `${el.tagName.toLowerCase()}.${String(el.getAttribute("class")).slice(0, 40)}`;
        if (s.boxShadow !== "none") {
          // "rgb(...) 3px 3px 0px 0px": any non-zero x or y offset.
          for (const shadow of s.boxShadow.split(/,(?![^(]*\))/)) {
            const lengths = (shadow.match(/-?\d+(\.\d+)?px/g) ?? []).map(parseFloat);
            if (lengths.length >= 2 && (lengths[0] !== 0 || lengths[1] !== 0)) {
              found.push(`${label} shadow ${shadow.trim()}`);
            }
          }
        }
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          const width = parseFloat(s[`border${side}Width` as "borderTopWidth"]);
          const color = s[`border${side}Color` as "borderTopColor"];
          if (width >= 2 && s[`border${side}Style` as "borderTopStyle"] !== "none" && luminance(color) < 0.15) {
            found.push(`${label} border ${side} ${width}px ${color}`);
          }
        }
        if (parseFloat(s.outlineWidth) >= 2 && s.outlineStyle !== "none" && luminance(s.outlineColor) < 0.15) {
          found.push(`${label} outline`);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
    await noHorizontalScroll(page);
  });
}

test("[002-AC104] the people's pages keep their logo, Fredoka, cream, header and footer, and load no Montserrat or Inter", async ({
  page,
}) => {
  for (const path of PEOPLE_PAGES) {
    const fontRequests: string[] = [];
    const onRequest = (r: { resourceType(): string; url(): string }) => {
      if (r.resourceType() === "font") fontRequests.push(r.url());
    };
    page.on("request", onRequest);
    await openPeoplePage(page, path);
    await page.evaluate(() => document.fonts.ready);
    page.off("request", onRequest);

    const header = page.getByRole("banner");
    await expect(
      header.getByRole("img", { name: "Marcando Ando, logo con una polera rosada con una M y un tazón morado" }),
    ).toBeVisible();
    await expect(header.getByRole("img", { name: /soluciones corporativas/ })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Colegios y grupos" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("Marcamos tus ideas.");

    const look = await page.evaluate(() => {
      const faces = [...document.fonts];
      return {
        bodyFont: getComputedStyle(document.body).fontFamily,
        h1Font: getComputedStyle(document.querySelector("h1")!).fontFamily,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        families: faces.map((f) => f.family),
        loaded: faces.filter((f) => f.status === "loaded").map((f) => f.family),
      };
    });
    expect(look.bodyFont, path).toMatch(/Fredoka/i);
    expect(look.h1Font, path).toMatch(/Fredoka/i);
    expect(look.bodyBg, path).toBe("rgb(251, 245, 233)");
    // No @font-face of the company fonts is even declared, and the only font
    // files requested are Fredoka's.
    expect(look.families.filter((f) => /montserrat|inter/i.test(f)), path).toEqual([]);
    expect(look.families.length, path).toBeGreaterThan(0);
    expect(fontRequests.length, path).toBeLessThanOrEqual(look.loaded.length);
  }
});

test("[002-AC108] the --corp- variables are on :root, gold is never small text, contrast holds and no people's color is used", async ({
  page,
}) => {
  for (const path of COMPANY_PAGES) {
    await openCompanyPage(page, path);
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const names = [
        "--corp-navy",
        "--corp-navy-deep",
        "--corp-gold",
        "--corp-gold-text",
        "--corp-gold-light",
        "--corp-gray",
        "--corp-line",
        "--corp-body",
        "--corp-muted",
      ];
      return Object.fromEntries(names.map((n) => [n, s.getPropertyValue(n).trim().toLowerCase()]));
    });
    expect(vars, path).toEqual({
      "--corp-navy": "#0b1b3f",
      "--corp-navy-deep": "#07122b",
      "--corp-gold": "#b8862b",
      "--corp-gold-text": "#8a6417",
      "--corp-gold-light": "#e2c07a",
      "--corp-gray": "#f5f6f9",
      "--corp-line": "#e4e7ee",
      "--corp-body": "#3b4559",
      "--corp-muted": "#5a6478",
    });

    const found = await page.evaluate(() => {
      const gold = "rgb(184, 134, 43)";
      const people = [
        "rgb(232, 100, 127)", // pink
        "rgb(240, 178, 66)", // yellow
        "rgb(79, 176, 176)", // teal
        "rgb(149, 101, 196)", // purple
        "rgb(122, 75, 174)", // purple deep
        "rgb(251, 235, 200)", // yellow soft
        "rgb(251, 245, 233)", // cream
      ];
      const smallGold: string[] = [];
      const peopleColors: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        const hasText = [...el.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
        );
        if (hasText && s.color === gold && parseFloat(s.fontSize) < 24) {
          smallGold.push(`${el.tagName} ${el.textContent?.trim().slice(0, 30)} ${s.fontSize}`);
        }
        const used = [s.color, s.backgroundColor];
        if (parseFloat(s.borderTopWidth) > 0) used.push(s.borderTopColor);
        for (const color of used) {
          if (people.includes(color)) peopleColors.push(`${el.tagName} ${color}`);
        }
      }
      return { smallGold, peopleColors };
    });
    expect(found.smallGold, path).toEqual([]);
    expect(found.peopleColors, path).toEqual([]);
    // Contrast (4.5:1, 3:1 from 24 px) is axe's color-contrast rule.
    expect(await seriousViolations(page), path).toEqual([]);
  }
});

// Criterion 105: the header of the company pages.

for (const path of COMPANY_PAGES) {
  test(`[002-AC105] the company header of ${path} has exactly its links, in order, and fits`, async ({
    page,
  }) => {
    await openCompanyPage(page, path);
    const links = await page
      .getByRole("banner")
      .getByRole("navigation", { name: "Secciones" })
      .locator("a")
      .evaluateAll((els) =>
        els.map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") ?? "" })),
      );
    expect(links.map((l) => l.text).slice(0, 5)).toEqual([
      "Productos",
      "Packs",
      "Cómo cotizar",
      "Web para personas",
      "Cotizar por WhatsApp",
    ]);
    expect(links[5].text).toMatch(/^(Admin|Mi panel)$/);
    expect(links).toHaveLength(6);
    expect(links.slice(0, 4).map((l) => l.href)).toEqual([
      "/empresas#productos",
      "/empresas#packs",
      "/empresas#cotizar",
      "/",
    ]);
    expect(links[4].href.startsWith(`${WA}?text=`)).toBe(true);
    expect(messageOf(links[4].href)).toBe(COMPANY_GENERAL);
    await noHorizontalScroll(page);
  });
}

// Criterion 106: the order of /empresas.

test("[002-AC106] /empresas shows eyebrow, one h1, intro, buttons, categories, sections, steps, band and footer in order, with no hero image", async ({
  page,
}) => {
  await openCompanyPage(page, "/empresas");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Productos personalizados con el logo de su empresa",
  );
  const order = await page.evaluate(() => {
    const top = (el: Element | null | undefined) =>
      el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
    const main = document.querySelector("main")!;
    const byText = (selector: string, text: string) =>
      [...main.querySelectorAll(selector)].find((el) => el.textContent?.trim() === text);
    const categories = [...main.querySelectorAll("p, ul")].find((el) =>
      (el.textContent ?? "").replace(/\s+/g, " ").trim() === "Poleras · Polerones · Tazones · Botellas · Regalos corporativos",
    );
    const cta = byText("h2", "¿Necesita productos con el logo de su empresa?");
    return {
      names: [
        "eyebrow",
        "h1",
        "intro",
        "cotizar button",
        "ver productos",
        "categories",
        "productos",
        "packs",
        "como cotizar",
        "band",
        "footer",
      ],
      tops: [
        top(byText("p", "Catálogo empresa")),
        top(main.querySelector("h1")),
        top(byText("p", "Poleras, polerones, tazones, botellas y regalos corporativos. Cotice por volumen por WhatsApp.")),
        top(byText("a", "Cotizar por WhatsApp")),
        top(byText("a", "Ver productos")),
        top(categories),
        top(document.getElementById("productos")),
        top(document.getElementById("packs")),
        top(document.getElementById("cotizar")),
        top(cta),
        top(document.querySelector("footer")),
      ],
      verHref: byText("a", "Ver productos")?.getAttribute("href"),
      categoryLinks: categories?.querySelectorAll("a").length,
      heroImages: main.querySelector("h1")?.closest("section")?.querySelectorAll("img").length,
      heroBackground: main.querySelector("h1")?.closest("section")
        ? getComputedStyle(main.querySelector("h1")!.closest("section")!).backgroundImage
        : "(none)",
    };
  });
  order.tops.forEach((t, i) => expect(t, order.names[i]).not.toBeNull());
  const tops = order.tops as number[];
  expect(tops, order.names.join(" < ")).toEqual([...tops].sort((a, b) => a - b));
  expect(order.verHref).toBe("#productos");
  expect(order.categoryLinks).toBe(0);
  expect(order.heroImages).toBe(0);
  expect(order.heroBackground).toBe("none");

  const steps = page.locator("#cotizar li");
  await expect(page.locator("#cotizar").getByRole("heading", { level: 2 })).toHaveText("Cómo cotizar");
  await expect(steps).toHaveCount(3);
  const expected = [
    ["01", "Escríbanos", "Cuéntenos por WhatsApp qué productos necesita y cuántas unidades."],
    ["02", "Envíe su logo", "Revisamos el diseño con usted antes de producir."],
    ["03", "Reciba su cotización", "Le respondemos con el precio según la cantidad."],
  ];
  for (const [i, parts] of expected.entries()) {
    const text = ((await steps.nth(i).textContent()) ?? "").replace(/\s+/g, " ");
    for (const part of parts) expect(text).toContain(part);
  }
  // The band's button carries the company message.
  const band = page.locator("section", {
    has: page.getByRole("heading", { name: "¿Necesita productos con el logo de su empresa?" }),
  });
  expect(messageOf(await band.getByRole("link", { name: "Cotizar por WhatsApp" }).getAttribute("href"))).toBe(
    COMPANY_GENERAL,
  );
  // The band is navy and its button gold with navy text.
  const colors = await band.evaluate((el) => {
    const button = el.querySelector("a")!;
    return {
      heading: getComputedStyle(el.querySelector("h2")!).color,
      band: getComputedStyle(el).backgroundColor,
      button: getComputedStyle(button).backgroundColor,
      text: getComputedStyle(button).color,
    };
  });
  expect(colors).toEqual({
    heading: "rgb(255, 255, 255)",
    band: "rgb(11, 27, 63)",
    button: "rgb(184, 134, 43)",
    text: "rgb(11, 27, 63)",
  });
});

// Criterion 107: usted.

test("[002-AC107] the visible text of /empresas and of an Empresas page has none of the people's words, and the lines are the approved ones", async ({
  page,
}) => {
  const forbidden = /(^|[^\p{L}])(tú|tu|tus|te|cotiza|escríbenos|cuéntanos)($|[^\p{L}])/iu;
  await openCompanyPage(page, "/empresas");
  const text = await page.locator("body").innerText();
  expect(text.match(forbidden)?.[0]).toBeUndefined();
  await expect(
    page.getByText("Poleras, polerones, tazones, botellas y regalos corporativos. Cotice por volumen por WhatsApp.", {
      exact: true,
    }),
  ).toBeVisible();
  for (const id of ["productos", "packs"]) {
    await expect(
      page.locator(`#${id}`).getByText("Precios según cantidad: cotice por WhatsApp.", { exact: true }),
    ).toHaveCount(1);
  }
  const description =
    "Poleras, polerones, tazones, botellas y regalos corporativos con el logo de su empresa. Cotice por volumen por WhatsApp.";
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toBe(description);
  expect(await page.locator('meta[property="og:description"]').getAttribute("content")).toBe(description);

  await openCompanyPage(page, "/productos/demo-empresa-polera");
  const productText = await page.locator("body").innerText();
  expect(productText.match(forbidden)?.[0]).toBeUndefined();
  const productDescription = await page.locator('meta[name="description"]').getAttribute("content");
  expect(productDescription).toContain("Cotice por WhatsApp.");
  expect(productDescription?.match(forbidden)?.[0]).toBeUndefined();
});

test("[002-AC107] the people's pages keep their texts", async ({ page }) => {
  await openPeoplePage(page, "/");
  await expect(
    page.getByText("Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.").first(),
  ).toBeVisible();
  await expect(page.getByText("Personalizamos poleras, polerones, botellas, calcetines, estuches y más", { exact: false })).toBeVisible();
  await expect(page.getByText("con tu diseño, tu nombre o tu idea.", { exact: false })).toBeVisible();
});

// Criterion 109: footer and floating button.

for (const path of COMPANY_PAGES) {
  test(`[002-AC109] the footer and the floating button of ${path} are the company's`, async ({ page }) => {
    await openCompanyPage(page, path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Marcando Ando · Soluciones corporativas");
    await expect(footer).not.toContainText("Marcamos tus ideas.");
    expect(await footer.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(7, 18, 43)");
    const whatsapp = footer.getByRole("link", { name: /WhatsApp/ });
    const href = await whatsapp.getAttribute("href");
    expect(href?.startsWith(`${WA}?text=`)).toBe(true);
    expect(messageOf(href)).toBe(COMPANY_GENERAL);
    await expect(footer.getByRole("link", { name: /Instagram/ })).toHaveAttribute(
      "href",
      "https://www.instagram.com/marcando_ando",
    );
    const linkColor = await whatsapp.evaluate((el) => getComputedStyle(el).color);
    expect(linkColor).toBe("rgb(226, 192, 122)");

    const floating = page.getByRole("link", { name: "WhatsApp", exact: true });
    expect(messageOf(await floating.getAttribute("href"))).toBe(COMPANY_GENERAL);
    const look = await floating.evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        bg: s.backgroundColor,
        shadow: s.boxShadow,
        radius: s.borderTopLeftRadius,
        width: Math.round(box.width),
        height: Math.round(box.height),
        border: `${s.borderTopWidth} ${s.borderTopColor}`,
        icon: getComputedStyle(el.querySelector("svg")!).color,
        position: s.position,
      };
    });
    expect(look.bg).toBe("rgb(11, 27, 63)");
    expect(look.shadow).toBe("none");
    expect(look.width).toBe(look.height);
    expect(parseFloat(look.radius)).toBeGreaterThanOrEqual(look.width / 2);
    expect(look.border).toBe("1px rgb(255, 255, 255)");
    expect(look.icon).toBe("rgb(255, 255, 255)");
    expect(look.position).toBe("fixed");
  });
}

// Criterion 77 in the new look: the header and the footer are controls too.

test("[002-AC77] the company header, footer and floating button have 44 px controls and a visible focus", async ({
  page,
}) => {
  await openCompanyPage(page, "/empresas");
  const controls = page.locator("header a, footer a, a[aria-label='WhatsApp']");
  const count = await controls.count();
  expect(count).toBeGreaterThan(6);
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    expect(box!.height, `control ${i}`).toBeGreaterThanOrEqual(44);
    expect(box!.width, `control ${i}`).toBeGreaterThanOrEqual(44);
  }
  for (const link of [
    page.getByRole("banner").getByRole("link", { name: "Cómo cotizar" }),
    page.getByRole("contentinfo").getByRole("link", { name: /Instagram/ }),
    page.getByRole("link", { name: "WhatsApp", exact: true }),
  ]) {
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
  }
});

// Criterion 110: the link on the people's pages.

for (const path of ["/", "/productos/demo-botella-ejemplo"]) {
  test(`[002-AC110] on ${path} the "Catálogo empresa" link has a navy outline and a briefcase`, async ({
    page,
  }) => {
    await openPeoplePage(page, path);
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Secciones" });
    const link = nav.getByRole("link", { name: "Catálogo empresa", exact: true });
    await expect(link).toBeVisible();
    const look = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      const svg = el.querySelector("svg");
      const box = svg?.getBoundingClientRect();
      return {
        borderWidth: s.borderTopWidth,
        borderColor: s.borderTopColor,
        borderStyle: s.borderTopStyle,
        color: s.color,
        radius: s.borderTopLeftRadius,
        svgHidden: svg?.getAttribute("aria-hidden"),
        svgSize: box ? [Math.round(box.width), Math.round(box.height)] : null,
        svgFirst: el.firstElementChild === svg && svg !== null,
        svgBeforeText: svg
          ? Boolean(svg.compareDocumentPosition(el.lastChild!) & Node.DOCUMENT_POSITION_FOLLOWING) ||
            el.lastChild === svg
          : false,
        text: el.textContent?.trim(),
        hasSvgTitle: Boolean(svg?.querySelector("title")),
      };
    });
    expect(look.borderWidth).toBe("2px");
    expect(look.borderStyle).toBe("solid");
    expect(look.borderColor).toBe("rgb(11, 27, 63)");
    expect(look.color).toBe("rgb(11, 27, 63)");
    expect(parseFloat(look.radius)).toBeGreaterThan(8);
    expect(look.svgHidden).toBe("true");
    expect(look.svgSize).toEqual([16, 16]);
    expect(look.svgFirst).toBe(true);
    expect(look.hasSvgTitle).toBe(false);
    expect(look.text).toBe("Catálogo empresa");

    // The other links look as before: no outline, no icon.
    for (const name of ["Productos", "Packs", "Cómo pedir", "Colegios y grupos"]) {
      const other = nav.getByRole("link", { name, exact: true });
      const s = await other.evaluate((el) => ({
        border: getComputedStyle(el).borderTopWidth,
        svgs: el.querySelectorAll("svg").length,
      }));
      expect(s, name).toEqual({ border: "0px", svgs: 0 });
    }
    await noHorizontalScroll(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

// Criterion 111: the logo as the page serves it.

for (const path of COMPANY_PAGES) {
  test(`[002-AC111] the company logo on ${path} has width and height, loads eagerly and is sharp`, async ({
    page,
  }) => {
    await openCompanyPage(page, path);
    const logo = page.getByRole("banner").getByRole("img", { name: "Marcando Ando, soluciones corporativas" });
    await expect(logo).toBeVisible();
    const attrs = await logo.evaluate((img: HTMLImageElement) => ({
      width: img.getAttribute("width"),
      height: img.getAttribute("height"),
      loading: img.getAttribute("loading"),
      natural: [img.naturalWidth, img.naturalHeight],
    }));
    expect(Number(attrs.width)).toBeGreaterThan(0);
    expect(Number(attrs.height)).toBeGreaterThan(0);
    expect(attrs.loading).not.toBe("lazy");
    const box = (await logo.boundingBox())!;
    const wide = page.viewportSize()!.width >= 768;
    expect(Math.round(box.height)).toBe(wide ? 64 : 44);
    expect(attrs.natural[0]).toBeGreaterThanOrEqual(Math.ceil(box.width) * 2 - 2);
    expect(attrs.natural[1]).toBeGreaterThanOrEqual(Math.ceil(box.height) * 2 - 2);
  });
}
