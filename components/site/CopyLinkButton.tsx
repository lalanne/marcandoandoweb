"use client";

import { useEffect, useRef, useState } from "react";
import { productUrl } from "@/lib/catalog/details";

// "Copiar enlace" (spec 002, criteria 62 and 63): copies the address of a
// product's page and says so; when the browser refuses, shows the address in a
// text field, selected, so it can be copied by hand.

export function CopyLinkButton({
  slug,
  productName,
  className,
}: {
  slug: string;
  productName: string;
  className: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  async function copy() {
    const link = productUrl(
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin,
      slug,
    );
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={copy} className={className}>
        Copiar enlace
        <span className="sr-only"> de {productName}</span>
      </button>
      <p role="status" className={state === "copied" ? "font-medium" : "sr-only"}>
        {state === "copied" ? "Enlace copiado" : ""}
      </p>
      {state === "manual" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`link-${slug}`} className="text-sm font-medium">
            No pudimos copiarlo solos. Copia este enlace:
          </label>
          <input
            id={`link-${slug}`}
            ref={field}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border-2 border-brand-night bg-white px-3 py-2 font-normal"
          />
        </div>
      ) : null}
    </div>
  );
}
