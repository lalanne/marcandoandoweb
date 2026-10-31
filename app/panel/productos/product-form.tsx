"use client";

import { useActionState, useState } from "react";
import { formatPriceInput, parsePriceClp } from "@/lib/admin/price";
import { slugify } from "@/lib/admin/slug";
import { KIND_LABEL, PRODUCT_KINDS } from "@/lib/catalog/kind";
import { saveProduct, type ProductFormState, type RawProduct } from "./actions";
import { errorClass, fieldClass, inputClass, primaryButton } from "../ui";

type Props = {
  /** Present when editing; its id is sent along so the action updates it. */
  productId?: string;
  initial: RawProduct;
  submitLabel: string;
};

export function ProductForm({ productId, initial, submitLabel }: Props) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    saveProduct,
    { errors: {}, values: null },
  );
  const start = state.values ?? initial;
  const [name, setName] = useState(start.name);
  const [slug, setSlug] = useState(start.slug);
  // The address follows the name until the person edits it (or always, while
  // editing an existing product: its address does not change on its own).
  const [slugTouched, setSlugTouched] = useState(productId !== undefined);
  const [price, setPrice] = useState(start.price);
  const [description, setDescription] = useState(start.description);
  const [kind, setKind] = useState(start.kind);
  const [isFeatured, setIsFeatured] = useState(start.is_featured);
  const [isAvailable, setIsAvailable] = useState(start.is_available);
  const [isPublished, setIsPublished] = useState(start.is_published);
  const { errors } = state;

  const error = (key: keyof typeof errors) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className={errorClass}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {productId ? <input type="hidden" name="id" value={productId} /> : null}

      <div className={fieldClass}>
        <label htmlFor="product-name" className="font-medium">
          Nombre
        </label>
        <input
          id="product-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          autoComplete="off"
          aria-required="true"
          aria-describedby={errors.name ? "name-error" : undefined}
          aria-invalid={errors.name ? true : undefined}
          className={inputClass}
        />
        {error("name")}
      </div>

      <div className={fieldClass}>
        <label htmlFor="product-slug" className="font-medium">
          Dirección web (slug)
        </label>
        <input
          id="product-slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(e.target.value !== "");
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
          aria-invalid={errors.slug ? true : undefined}
          className={inputClass}
        />
        <p id="slug-hint" className="text-sm">
          Se escribe sola a partir del nombre. Solo minúsculas, números y guiones.
        </p>
        {error("slug")}
      </div>

      <div className={fieldClass}>
        <label htmlFor="product-description" className="font-medium">
          Descripción
        </label>
        <textarea
          id="product-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="product-price" className="font-medium">
          Precio desde (CLP)
        </label>
        <input
          id="product-price"
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            // Show a clean price with the dot: 7000 becomes 7.000.
            const parsed = parsePriceClp(price);
            if (parsed.ok) setPrice(formatPriceInput(parsed.value));
          }}
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={errors.price ? "price-error" : "price-hint"}
          aria-invalid={errors.price ? true : undefined}
          className={inputClass}
        />
        <p id="price-hint" className="text-sm">
          Con punto para los miles, por ejemplo 7.000. Déjalo vacío si aún no
          hay un precio confirmado.
        </p>
        {error("price")}
      </div>

      <div className={fieldClass}>
        <label htmlFor="product-kind" className="font-medium">
          Tipo
        </label>
        <select
          id="product-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-required="true"
          aria-describedby={errors.kind ? "kind-hint kind-error" : "kind-hint"}
          aria-invalid={errors.kind ? true : undefined}
          className={inputClass}
        >
          {PRODUCT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <p id="kind-hint" className="text-sm">
          Los productos se muestran en «Productos» y los packs en «Packs».
        </p>
        {error("kind")}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border-2 border-brand-night bg-white p-4">
        <legend className="px-1 font-medium">Cómo se muestra</legend>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_featured"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="size-6"
          />
          Destacado
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_available"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="size-6"
          />
          Disponible
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="size-6"
          />
          Publicado
        </label>
        <p className="text-sm">
          Si no está publicado, solo lo ves tú. Si no está disponible, se ve con
          el aviso «no disponible por ahora» y sin botón para cotizar.
        </p>
      </fieldset>

      {errors.form ? (
        <p role="alert" className={errorClass}>
          {errors.form}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
