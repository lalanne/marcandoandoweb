import type { Audience } from "./audience";

/** Chilean pesos with a dot as thousands separator: 7000 becomes "$7.000". */
export function formatClp(amount: number): string {
  return `$${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/**
 * A card's price: "$7.000 c/u" (spec 002, criterion 52); none when unset, and
 * none for a company item, whose price is never shown (criterion 73).
 */
export function priceLabel(
  amount: number | null,
  audience: Audience = "personas",
): string | null {
  if (audience === "empresas") return null;
  return amount === null ? null : `${formatClp(amount)} c/u`;
}

/** Shown once under the Productos and Packs headings (spec 002, criterion 53). */
export const WHOLESALE_NOTE =
  "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.";

/** Shown once under each heading of /empresas instead of prices (spec 002, criterion 73). */
export const COMPANY_PRICE_NOTE = "Precios según cantidad: cotice por WhatsApp.";
