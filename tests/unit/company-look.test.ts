import { readFileSync, statSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  COMPANY_CATEGORIES,
  COMPANY_CTA_TITLE,
  COMPANY_DESCRIPTION,
  COMPANY_EMPTY,
  COMPANY_EYEBROW,
  COMPANY_INTRO,
  COMPANY_STEPS,
  COMPANY_TITLE,
} from "@/lib/catalog/company-copy";
import { empresasMetadata, productMetadata } from "@/lib/catalog/details";
import { COMPANY_PRICE_NOTE } from "@/lib/catalog/format";
import type { CatalogProduct } from "@/lib/catalog/types";

// Spec 002, 2026-11-12 amendment (issue #141): the company pages' copy in
// "usted" (criterion 107), the company logo file (criterion 111) and the
// --corp- variables (criterion 108).

const company: CatalogProduct = {
  id: "e1",
  slug: "polera-corporativa",
  name: "Polera corporativa",
  description: "",
  priceFromClp: 7000,
  kind: "producto",
  audience: "empresas",
  collections: [],
  isFeatured: false,
  isAvailable: true,
  images: [],
  colors: [],
  sizes: [],
  characteristics: "",
};

const FORBIDDEN = ["tú", "tu", "tus", "te", "cotiza", "escríbenos", "cuéntanos"];

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, "iu").test(text);
}

describe("company copy", () => {
  it("[002-AC107] has the approved lines, in usted", () => {
    expect(COMPANY_EYEBROW).toBe("Catálogo empresa");
    expect(COMPANY_TITLE).toBe("Productos personalizados con el logo de su empresa");
    expect(COMPANY_INTRO).toBe(
      "Poleras, polerones, tazones, botellas y regalos corporativos. Cotice por volumen por WhatsApp.",
    );
    expect(COMPANY_PRICE_NOTE).toBe("Precios según cantidad: cotice por WhatsApp.");
    expect(COMPANY_EMPTY).toBe(
      "Estamos preparando el catálogo para empresas. Escríbanos y le contamos.",
    );
    expect(COMPANY_DESCRIPTION).toBe(
      "Poleras, polerones, tazones, botellas y regalos corporativos con el logo de su empresa. Cotice por volumen por WhatsApp.",
    );
    expect(COMPANY_CATEGORIES).toEqual([
      "Poleras",
      "Polerones",
      "Tazones",
      "Botellas",
      "Regalos corporativos",
    ]);
    expect(COMPANY_STEPS).toEqual([
      {
        number: "01",
        title: "Escríbanos",
        text: "Cuéntenos por WhatsApp qué productos necesita y cuántas unidades.",
      },
      {
        number: "02",
        title: "Envíe su logo",
        text: "Revisamos el diseño con usted antes de producir.",
      },
      {
        number: "03",
        title: "Reciba su cotización",
        text: "Le respondemos con el precio según la cantidad.",
      },
    ]);
    expect(COMPANY_CTA_TITLE).toBe("¿Necesita productos con el logo de su empresa?");
  });

  it("[002-AC107] uses none of the people's words", () => {
    const all = [
      COMPANY_EYEBROW,
      COMPANY_TITLE,
      COMPANY_INTRO,
      COMPANY_PRICE_NOTE,
      COMPANY_EMPTY,
      COMPANY_DESCRIPTION,
      COMPANY_CTA_TITLE,
      ...COMPANY_CATEGORIES,
      ...COMPANY_STEPS.flatMap((s) => [s.title, s.text]),
    ];
    for (const text of all) {
      for (const word of FORBIDDEN) {
        expect(hasWord(text, word), `"${word}" in "${text}"`).toBe(false);
      }
    }
  });

  it("[002-AC107] the /empresas description and og:description are the approved text", () => {
    const meta = empresasMetadata("https://marcandoando.cl");
    expect(meta.description).toBe(COMPANY_DESCRIPTION);
    expect(meta.openGraph?.description).toBe(COMPANY_DESCRIPTION);
  });

  it("[002-AC107] the description of an Empresas product page says \"cotice\", and the people's keeps \"cotiza\"", () => {
    const meta = productMetadata(company, "https://marcandoando.cl");
    expect(meta.description).toContain("Cotice por WhatsApp.");
    expect(meta.description).not.toContain("Cotiza");
    expect(meta.openGraph?.description).toBe(meta.description);
    const people = productMetadata({ ...company, audience: "personas" }, "https://marcandoando.cl");
    expect(people.description).toContain("Cotiza por WhatsApp.");
  });
});

describe("company logo file", () => {
  const path = "public/img/logo-empresas.webp";

  it("[002-AC111] is at most 40 KB", () => {
    expect(statSync(path).size).toBeLessThanOrEqual(40 * 1024);
  });

  it("[002-AC111] is a WebP with at least twice the pixels of its largest display (192 by 64 px)", async () => {
    const meta = await sharp(readFileSync(path)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBeGreaterThanOrEqual(384);
    expect(meta.height).toBeGreaterThanOrEqual(128);
  });
});

describe("--corp- variables", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const root = css.match(/:root\s*{([^}]*)}/)![1];

  it("[002-AC108] are defined on :root with the approved values", () => {
    const wanted: Record<string, string> = {
      "--corp-navy": "#0b1b3f",
      "--corp-navy-deep": "#07122b",
      "--corp-gold": "#b8862b",
      "--corp-gold-text": "#8a6417",
      "--corp-gold-light": "#e2c07a",
      "--corp-gray": "#f5f6f9",
      "--corp-line": "#e4e7ee",
      "--corp-body": "#3b4559",
      "--corp-muted": "#5a6478",
    };
    for (const [name, value] of Object.entries(wanted)) {
      const found = root.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
      expect(found?.[1].toLowerCase(), name).toBe(value);
    }
  });
});
