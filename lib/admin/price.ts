export type PriceResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

const PRICE_ERROR =
  "El precio debe ser un número entero, con punto para los miles (por ejemplo 7.000), o quedar vacío.";

/**
 * Whole Chilean pesos typed by a person: "7000", "7.000" or "$ 7.000". Empty
 * means no price (null). Decimals, negatives and misplaced dots are refused.
 */
export function parsePriceClp(input: string): PriceResult {
  const text = input.replace(/^\s*\$?\s*/, "").trim();
  if (text === "") return { ok: true, value: null };
  if (/^\d+$/.test(text) || /^\d{1,3}(\.\d{3})+$/.test(text)) {
    const value = Number(text.replaceAll(".", ""));
    if (Number.isSafeInteger(value) && value <= 2_000_000_000) {
      return { ok: true, value };
    }
  }
  return { ok: false, error: PRICE_ERROR };
}

/** A price as it is typed in the form: dot as thousands separator, no `$`. */
export function formatPriceInput(price: number | null): string {
  if (price === null) return "";
  return String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
