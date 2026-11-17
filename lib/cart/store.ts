"use client";

// The cart in the visitor's browser (spec 006, "Where the cart lives"): localStorage
// only, never sent anywhere. Reading is safe when storage is blocked or the stored
// text is damaged (an empty cart); the `storage` event keeps other tabs in step.
import { useMemo, useSyncExternalStore } from "react";
import {
  addToCart,
  parseStoredCart,
  serializeCart,
  type AddResult,
  type Cart,
  type CartItem,
} from "./cart";

export const CART_STORAGE_KEY = "marcandoando-cart";
// Tabs hear each other through the browser's `storage` event; this one is for the
// tab that made the change, which does not get that event.
const CHANGE_EVENT = "marcandoando-cart-change";

export const STORAGE_ERROR =
  "El carrito no se puede usar en este navegador. Usa «Pedir por WhatsApp» para pedir este producto.";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * The stored cart. `ready` is false on the server and during hydration, so the
 * pages served from the cache render the same until the browser has read it.
 */
export function useCart(): { ready: boolean; cart: Cart } {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  const cart = useMemo(() => parseStoredCart(raw), [raw]);
  return { ready: raw !== undefined, cart };
}

function write(cart: Cart): boolean {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

/** Applies a change to the stored cart; false when the browser refuses to store it. */
export function updateCart(change: (cart: Cart) => Cart): boolean {
  return write(change(parseStoredCart(readRaw())));
}

export type StoreAddResult = AddResult | { ok: false; error: "storage" };

/** Adds an item to the stored cart, with the limits and the merge rule of spec 006. */
export function addItem(item: CartItem): StoreAddResult {
  const result = addToCart(parseStoredCart(readRaw()), item);
  if (!result.ok) return result;
  return write(result.cart) ? result : { ok: false, error: "storage" };
}
