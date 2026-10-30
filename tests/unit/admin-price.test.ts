import { describe, expect, it } from "vitest";
import { formatPriceInput, parsePriceClp } from "@/lib/admin/price";

describe("parsePriceClp", () => {
  it("treats empty input as no price", () => {
    expect(parsePriceClp("")).toEqual({ ok: true, value: null });
    expect(parsePriceClp("   ")).toEqual({ ok: true, value: null });
  });

  it("reads whole pesos with or without the thousands dot", () => {
    expect(parsePriceClp("7000")).toEqual({ ok: true, value: 7000 });
    expect(parsePriceClp("7.000")).toEqual({ ok: true, value: 7000 });
    expect(parsePriceClp("$ 1.250.000")).toEqual({ ok: true, value: 1250000 });
    expect(parsePriceClp("0")).toEqual({ ok: true, value: 0 });
  });

  it("refuses decimals, negatives, text and misplaced dots with a Spanish message", () => {
    for (const bad of ["7,5", "-100", "abc", "7.00", "7..000", "1.2345", "7.5", "1e3"]) {
      const result = parsePriceClp(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/precio/i);
    }
  });
});

describe("formatPriceInput", () => {
  it("shows the dot as thousands separator, without a currency sign", () => {
    expect(formatPriceInput(7000)).toBe("7.000");
    expect(formatPriceInput(1250000)).toBe("1.250.000");
    expect(formatPriceInput(500)).toBe("500");
    expect(formatPriceInput(0)).toBe("0");
  });

  it("shows nothing for no price", () => {
    expect(formatPriceInput(null)).toBe("");
  });
});
