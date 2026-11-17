"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import {
  CART_ERRORS,
  MAX_PERSONALIZATION,
  parseQuantity,
  QUANTITY_ERROR,
} from "@/lib/cart/cart";
import { addItem, STORAGE_ERROR } from "@/lib/cart/store";
import type { CatalogColor } from "@/lib/catalog/types";
import { CartIcon, CheckIcon } from "./icons";
import { QuantityControl } from "./QuantityControl";

// The "Arma tu pedido" box of a Personas product page (spec 006, "On the product
// page"). It needs the browser's storage, so it is only drawn once the page is in
// the browser: without JavaScript there is no box and "Pedir por WhatsApp" is
// still there. Colors and sizes are toggle buttons (`aria-pressed`).

const noop = () => () => {};
function useInBrowser(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const pill =
  "flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-night px-4 py-1 font-medium text-brand-night";
const pillOn = "shadow-[0_0_0_2px_var(--brand-night)]";

export function AddToCart({
  slug,
  colors,
  sizes,
}: {
  slug: string;
  colors: CatalogColor[];
  sizes: string[];
}) {
  const inBrowser = useInBrowser();
  const ids = useId();
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState("1");
  const [text, setText] = useState("");
  const [missing, setMissing] = useState<{ color: boolean; size: boolean }>({
    color: false,
    size: false,
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const firstColor = useRef<HTMLButtonElement>(null);
  const firstSize = useRef<HTMLButtonElement>(null);

  if (!inBrowser) return null;

  const quantity = parseQuantity(quantityText);
  const quantityError = quantity === null ? QUANTITY_ERROR : null;

  function changed() {
    setAdded(false);
    setProblem(null);
  }

  function add() {
    const needColor = colors.length > 0 && color === null;
    const needSize = sizes.length > 0 && size === null;
    setMissing({ color: needColor, size: needSize });
    setAdded(false);
    setProblem(null);
    if (needColor || needSize) {
      (needColor ? firstColor : firstSize).current?.focus();
      return;
    }
    if (quantity === null) return;
    const result = addItem({
      slug,
      color,
      size,
      quantity,
      personalization: text,
    });
    if (result.ok) setAdded(true);
    else setProblem(result.error === "storage" ? STORAGE_ERROR : CART_ERRORS[result.error]);
  }

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-5 rounded-2xl border-2 border-brand-night bg-white p-4 sm:p-5"
    >
      <h2 id={`${ids}-title`} className="text-xl font-semibold">
        Arma tu pedido
      </h2>

      {colors.length > 0 ? (
        <div
          role="group"
          aria-labelledby={`${ids}-color`}
          aria-describedby={missing.color ? `${ids}-color-error` : undefined}
          className="flex flex-col gap-2"
        >
          <p id={`${ids}-color`} className="font-semibold">
            Color · elige uno
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => {
              const on = color === c.name;
              return (
                <button
                  key={`${c.name}-${i}`}
                  ref={i === 0 ? firstColor : undefined}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setColor(c.name);
                    setMissing((m) => ({ ...m, color: false }));
                    changed();
                  }}
                  className={`${pill} ${on ? `${pillOn} bg-brand-yellow-soft` : "bg-white"}`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: c.hex }}
                    className="h-6 w-6 shrink-0 rounded-full border-2 border-brand-night"
                  />
                  {c.name}
                  {on ? <CheckIcon size={16} /> : null}
                </button>
              );
            })}
          </div>
          {missing.color ? (
            <p id={`${ids}-color-error`} className="font-semibold text-red-800">
              Elige un color.
            </p>
          ) : null}
        </div>
      ) : null}

      {sizes.length > 0 ? (
        <div
          role="group"
          aria-labelledby={`${ids}-size`}
          aria-describedby={missing.size ? `${ids}-size-error` : undefined}
          className="flex flex-col gap-2"
        >
          <p id={`${ids}-size`} className="font-semibold">
            Talla o tamaño · elige una
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s, i) => {
              const on = size === s;
              return (
                <button
                  key={`${s}-${i}`}
                  ref={i === 0 ? firstSize : undefined}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setSize(s);
                    setMissing((m) => ({ ...m, size: false }));
                    changed();
                  }}
                  className={`${pill} min-w-11 justify-center ${
                    on ? `${pillOn} bg-brand-yellow` : "bg-white"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {missing.size ? (
            <p id={`${ids}-size-error`} className="font-semibold text-red-800">
              Elige una talla o un tamaño.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-qty`} className="font-semibold">
          Cantidad
        </label>
        <QuantityControl
          id={`${ids}-qty`}
          text={quantityText}
          label="Cantidad"
          name=""
          error={quantityError}
          onText={(value) => {
            setQuantityText(value);
            changed();
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-text`} className="font-semibold">
          Personalización (opcional)
        </label>
        <input
          id={`${ids}-text`}
          type="text"
          value={text}
          autoComplete="off"
          aria-describedby={`${ids}-hint ${ids}-count`}
          onChange={(e) => {
            setText(e.target.value);
            changed();
          }}
          className="min-h-11 rounded-xl border-2 border-brand-night bg-white px-3 py-2"
        />
        <p id={`${ids}-hint`} className="text-sm text-brand-night/80">
          Nombre, curso, frase o idea. Las imágenes nos las mandas por WhatsApp.
        </p>
        <p id={`${ids}-count`} className="text-sm text-brand-night/80">
          {text.length} de {MAX_PERSONALIZATION}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full border-2 border-brand-night bg-brand-yellow px-6 py-3 text-lg font-semibold text-brand-night shadow-[3px_3px_0_var(--brand-night)] transition hover:-translate-y-0.5 hover:bg-brand-pink"
        >
          <CartIcon size={22} />
          Agregar al carrito
        </button>
        {problem ? <p className="font-semibold text-red-800">{problem}</p> : null}
        <p role="status" aria-live="polite" className="min-h-6 font-semibold">
          {added ? (
            <>
              <span className="inline-flex items-center gap-1">
                <CheckIcon />
                Agregado al carrito
              </span>{" "}
              <a href="/carrito" className="inline-flex min-h-11 items-center underline">
                Ver carrito
              </a>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}
