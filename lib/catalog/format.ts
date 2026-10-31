/** Chilean pesos with a dot as thousands separator: 7000 becomes "$7.000". */
export function formatClp(amount: number): string {
  return `$${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** A card's price: "$7.000 c/u" (spec 002, criterion 52); none when unset. */
export function priceLabel(amount: number | null): string | null {
  return amount === null ? null : `${formatClp(amount)} c/u`;
}

/** Shown once under the Productos and Packs headings (spec 002, criterion 53). */
export const WHOLESALE_NOTE =
  "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.";
