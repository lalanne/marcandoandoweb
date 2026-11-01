import { describe, expect, it } from "vitest";
import {
  INSTAGRAM_URL,
  WHATSAPP_URL,
  generalWhatsappUrl,
  productWhatsappUrl,
} from "@/lib/catalog/whatsapp";

function messageOf(url: string): string {
  return new URL(url).searchParams.get("text") ?? "";
}

describe("WhatsApp links", () => {
  it("[002-AC13] opens the business number on wa.me with a Spanish message", () => {
    const url = generalWhatsappUrl();
    expect(WHATSAPP_URL).toBe("https://wa.me/56982661835");
    expect(url.startsWith("https://wa.me/56982661835?text=")).toBe(true);
    expect(messageOf(url)).toBe(
      "Hola, Marcando Ando. Quiero cotizar. Te cuento mi idea:",
    );
  });

  it("[002-AC13] names the product in a product's message", () => {
    const url = productWhatsappUrl("Botella de ejemplo");
    expect(url.startsWith("https://wa.me/56982661835?text=")).toBe(true);
    expect(messageOf(url)).toBe(
      "Hola, Marcando Ando. Quiero cotizar: Botella de ejemplo. Te cuento mi idea:",
    );
  });

  it("[002-AC13] encodes accents, ampersands and spaces so the message survives", () => {
    const url = productWhatsappUrl("Polerón & Gorro ñandú");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&");
    expect(messageOf(url)).toContain("Polerón & Gorro ñandú");
  });

  it("[002-AC14] points the Instagram link to the business profile", () => {
    expect(INSTAGRAM_URL).toBe("https://www.instagram.com/marcando_ando");
  });

  it("[002-AC55] the product and general messages are the same as before the price amendment", () => {
    expect(messageOf(generalWhatsappUrl())).toBe(
      "Hola, Marcando Ando. Quiero cotizar. Te cuento mi idea:",
    );
    expect(messageOf(productWhatsappUrl("Botella de ejemplo"))).toBe(
      "Hola, Marcando Ando. Quiero cotizar: Botella de ejemplo. Te cuento mi idea:",
    );
    expect(messageOf(productWhatsappUrl("Botella de ejemplo"))).not.toMatch(/desde|c\/u|mayor/);
  });
});
