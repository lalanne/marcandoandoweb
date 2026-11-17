"use client";

import { MAX_QUANTITY, MIN_QUANTITY, parseQuantity } from "@/lib/cart/cart";

const round =
  "flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-night bg-white text-xl font-bold text-brand-night enabled:hover:bg-brand-yellow/60 disabled:opacity-40";

// "−", the number and "+" (spec 006): the number can be typed. `text` is what is in
// the field; "−" and "+" start from it when it is a valid quantity and do nothing
// otherwise, where the error under the field says what to type. `name` tells the
// buttons apart on the cart page, where there is one control per line.
export function QuantityControl({
  id,
  text,
  label,
  name,
  error,
  onText,
}: {
  id: string;
  text: string;
  label: string;
  name: string;
  error: string | null;
  onText: (text: string) => void;
}) {
  const quantity = parseQuantity(text);
  const suffix = name ? `: ${name}` : "";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Una menos${suffix}`}
          disabled={quantity !== null && quantity <= MIN_QUANTITY}
          onClick={() => quantity !== null && onText(String(quantity - 1))}
          className={round}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          aria-label={name ? `${label}${suffix}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={text}
          onChange={(e) => onText(e.target.value)}
          className="h-11 w-16 rounded-xl border-2 border-brand-night bg-white px-1 text-center text-lg font-semibold"
        />
        <button
          type="button"
          aria-label={`Una más${suffix}`}
          disabled={quantity !== null && quantity >= MAX_QUANTITY}
          onClick={() => quantity !== null && onText(String(quantity + 1))}
          className={round}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="font-semibold text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
