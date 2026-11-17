"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  cartWhatsappUrl,
  changeQuantity,
  DISCOUNT_NOTE,
  emptyCart,
  estimateNote,
  excludedLabel,
  markSent,
  NONE_NOTE,
  parseQuantity,
  QUANTITY_ERROR,
  reconcile,
  removeLine,
  summarize,
  type CartLine,
  type CartProduct,
} from "@/lib/cart/cart";
import { updateCart, useCart } from "@/lib/cart/store";
import { productPath } from "@/lib/catalog/details";
import { formatClp } from "@/lib/catalog/format";
import { imageUrl } from "@/lib/catalog/images";
import { buttonClass } from "../site/Hero";
import { QuantityControl } from "./QuantityControl";

// The body of /carrito (spec 006, "The cart page"). The page itself is served from the
// cache with the published Personas products in `products`; the stored items are read
// in the browser and matched against them, so the cart's contents never reach a server
// and visiting the page never reads the database.

const linkButton =
  "inline-flex min-h-11 items-center rounded-full px-3 font-semibold underline";
const smallButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-brand-night bg-white px-4 font-semibold text-brand-night hover:bg-brand-yellow/60";

function Photo({ line }: { line: CartLine }) {
  const faded = line.included ? "" : "opacity-40";
  if (!line.image) {
    return (
      <div
        aria-hidden="true"
        className={`h-20 w-20 shrink-0 rounded-xl border-2 border-brand-night bg-brand-teal/30 ${faded}`}
      />
    );
  }
  return (
    <Image
      src={imageUrl(line.image.storagePath)}
      alt={line.image.altText}
      width={80}
      height={80}
      loading="lazy"
      unoptimized
      className={`h-20 w-20 shrink-0 rounded-xl border-2 border-brand-night bg-brand-teal/30 object-cover ${faded}`}
    />
  );
}

function CartLineCard({ line }: { line: CartLine }) {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const { item } = line;
  const text = typed ?? String(item.quantity);
  const parsed = parseQuantity(text);

  function onText(value: string) {
    setTyped(value);
    const quantity = parseQuantity(value);
    if (quantity !== null) {
      setTyped(null);
      updateCart((cart) => changeQuantity(cart, line.key, quantity));
    }
  }

  const remove = (
    <button
      type="button"
      aria-label={`Quitar: ${line.name}`}
      onClick={() => updateCart((cart) => removeLine(cart, line.key))}
      className={smallButton}
    >
      Quitar
    </button>
  );

  return (
    <li
      className={`flex gap-3 rounded-2xl border-2 bg-white p-3 sm:gap-4 sm:p-4 ${
        line.included ? "border-brand-night" : "border-dashed border-brand-night/70"
      }`}
    >
      <Photo line={line} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {line.found ? (
          <a
            href={productPath(item.slug)}
            className="inline-flex min-h-11 items-center self-start text-lg font-semibold underline"
          >
            {line.name}
          </a>
        ) : (
          <p className="text-lg font-semibold">{line.name}</p>
        )}
        {item.color !== null ? <p>Color: {item.color}</p> : null}
        {item.size !== null ? <p>Talla: {item.size}</p> : null}
        {item.personalization !== "" ? (
          <p className="break-words">Personalización: &ldquo;{item.personalization}&rdquo;</p>
        ) : null}

        {line.included ? (
          <>
            <p className="font-medium">
              {line.unitPrice !== null ? `${formatClp(line.unitPrice)} c/u` : "Precio por cotizar"}
            </p>
            <p className="text-lg font-bold">
              {line.subtotal !== null ? (
                <>
                  <span className="sr-only">Subtotal </span>
                  {formatClp(line.subtotal)}
                </>
              ) : (
                "Por cotizar"
              )}
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <QuantityControl
                id={id}
                text={text}
                label="Cantidad"
                name={line.name}
                error={parsed === null ? QUANTITY_ERROR : null}
                onText={onText}
              />
              {remove}
            </div>
          </>
        ) : (
          <>
            <p className="font-semibold text-red-800">{line.reason}</p>
            <p>No se incluye en el pedido.</p>
            <div>{remove}</div>
          </>
        )}
      </div>
    </li>
  );
}

function TotalBox({ lines }: { lines: CartLine[] }) {
  const summary = summarize(lines);
  if (summary.included === 0) return null;
  return (
    <section
      aria-label="Total del pedido"
      className="flex flex-col gap-2 rounded-2xl border-2 border-brand-night bg-brand-yellow-soft p-4"
    >
      {summary.kind === "none" ? (
        <p className="text-lg font-semibold">{NONE_NOTE}</p>
      ) : (
        <>
          <p className="text-2xl font-bold">
            {summary.kind === "total" ? "Total" : "Total estimado"}: {formatClp(summary.amount ?? 0)}
          </p>
          {summary.kind === "estimate" ? (
            <p className="font-semibold">{estimateNote(summary.unpriced)}</p>
          ) : null}
          <p className="text-sm">{DISCOUNT_NOTE}</p>
        </>
      )}
    </section>
  );
}

export function CartView({ products }: { products: CartProduct[] }) {
  const { ready, cart } = useCart();
  const lines = useMemo(() => reconcile(cart.items, products), [cart.items, products]);

  if (!ready) return <div aria-busy="true" className="min-h-40" />;

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg">Tu carrito está vacío.</p>
        <Link href="/#productos" className={buttonClass}>
          Ver productos
        </Link>
      </div>
    );
  }

  const summary = summarize(lines);

  function empty() {
    if (window.confirm("¿Vaciar el carrito? Se quitan todos los productos.")) {
      updateCart(() => emptyCart());
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4">
        {lines.map((line) => (
          <CartLineCard key={line.key} line={line} />
        ))}
      </ul>
      <TotalBox lines={lines} />
      <div className="flex flex-col items-start gap-3">
        {summary.included > 0 ? (
          <a
            href={cartWhatsappUrl(lines)}
            onClick={() => updateCart(markSent)}
            className={`${buttonClass} text-center`}
          >
            Enviar pedido por WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${buttonClass} cursor-not-allowed opacity-50 hover:translate-y-0 hover:bg-brand-yellow`}
          >
            Enviar pedido por WhatsApp
          </button>
        )}
        {summary.excluded > 0 ? (
          <p className="font-semibold">{excludedLabel(summary.excluded)}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3">
          {cart.sent ? <p className="font-semibold">¿Ya enviaste tu pedido?</p> : null}
          <button type="button" onClick={empty} className={smallButton}>
            Vaciar carrito
          </button>
        </div>
        <Link href="/#productos" className={linkButton}>
          ← Seguir viendo productos
        </Link>
      </div>
    </div>
  );
}
