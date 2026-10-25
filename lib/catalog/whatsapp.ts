// Contact links. Pure functions: no environment, no network (spec 002, criteria 13 and 14).
export const WHATSAPP_URL = "https://wa.me/56982661835";
export const INSTAGRAM_URL = "https://www.instagram.com/marcando_ando";

const GENERAL_MESSAGE = "Hola, Marcando Ando. Quiero cotizar. Te cuento mi idea:";

function withMessage(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/** WhatsApp link for the general "Cotizar" buttons. */
export function generalWhatsappUrl(): string {
  return withMessage(GENERAL_MESSAGE);
}

/** WhatsApp link whose pre-filled message names the product. */
export function productWhatsappUrl(productName: string): string {
  return withMessage(
    `Hola, Marcando Ando. Quiero cotizar: ${productName}. Te cuento mi idea:`,
  );
}
