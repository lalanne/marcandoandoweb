"use client";

import { cartCount, cartCountLabel } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";
import { CartIcon } from "./icons";

// The header's cart button (spec 006, "The header"): a fixed 48 px round button, so
// the count appearing after the page loads changes nothing around it. The count is
// read in the browser, which keeps the header in the cache (spec 002, criteria 97
// to 102); until it is read there is no badge and the name is just "Carrito".
export function CartLink({ active = false }: { active?: boolean }) {
  const { ready, cart } = useCart();
  const count = ready ? cartCount(cart) : 0;
  return (
    <a
      href="/carrito"
      aria-label={ready ? cartCountLabel(count) : "Carrito"}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-night text-brand-night shadow-[2px_2px_0_var(--brand-night)] hover:bg-brand-yellow/70 ${
        active ? "bg-brand-yellow" : "bg-white"
      }`}
    >
      <CartIcon />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-brand-night bg-brand-pink px-1 text-xs font-bold leading-none text-brand-night"
        >
          {count}
        </span>
      ) : null}
    </a>
  );
}
