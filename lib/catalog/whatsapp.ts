// Contact links. Pure functions: no environment, no network (spec 002, criteria 13, 14, 74 and 75).
import type { Audience } from "./audience";

export const WHATSAPP_URL = "https://wa.me/56982661835";
export const INSTAGRAM_URL = "https://www.instagram.com/marcando_ando";

const GENERAL_MESSAGE = "Hola, Marcando Ando. Quiero cotizar. Te cuento mi idea:";
const COMPANY_GENERAL_MESSAGE =
  "Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar. Te cuento qué necesitamos:";

function withMessage(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/** WhatsApp link for the general "Cotizar" buttons. */
export function generalWhatsappUrl(audience: Audience = "personas"): string {
  return withMessage(audience === "empresas" ? COMPANY_GENERAL_MESSAGE : GENERAL_MESSAGE);
}

/** WhatsApp link whose pre-filled message names the product. */
export function productWhatsappUrl(
  productName: string,
  audience: Audience = "personas",
): string {
  return withMessage(
    audience === "empresas"
      ? `Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar: ${productName}. Te cuento qué necesitamos:`
      : `Hola, Marcando Ando. Quiero cotizar: ${productName}. Te cuento mi idea:`,
  );
}
