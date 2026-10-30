"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/lib/admin/slug";
import { saveDesign, type DesignFormState, type RawDesign } from "./actions";
import { errorClass, fieldClass, inputClass, primaryButton } from "../ui";

type Props = {
  /** Present when editing; its id is sent along so the action updates it. */
  designId?: string;
  initial: RawDesign;
  submitLabel: string;
};

export function DesignForm({ designId, initial, submitLabel }: Props) {
  const [state, action, pending] = useActionState<DesignFormState, FormData>(
    saveDesign,
    { errors: {}, values: null },
  );
  const start = state.values ?? initial;
  const [title, setTitle] = useState(start.title);
  const [slug, setSlug] = useState(start.slug);
  // The address follows the title until the person edits it (or always, while
  // editing an existing design: its address does not change on its own).
  const [slugTouched, setSlugTouched] = useState(designId !== undefined);
  const [description, setDescription] = useState(start.description);
  const [isFeatured, setIsFeatured] = useState(start.is_featured);
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
      {designId ? <input type="hidden" name="id" value={designId} /> : null}

      <div className={fieldClass}>
        <label htmlFor="design-title" className="font-medium">
          Título
        </label>
        <input
          id="design-title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          autoComplete="off"
          aria-required="true"
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={errors.title ? true : undefined}
          className={inputClass}
        />
        {error("title")}
      </div>

      <div className={fieldClass}>
        <label htmlFor="design-slug" className="font-medium">
          Dirección web (slug)
        </label>
        <input
          id="design-slug"
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
          Se escribe sola a partir del título. Solo minúsculas, números y guiones.
        </p>
        {error("slug")}
      </div>

      <div className={fieldClass}>
        <label htmlFor="design-description" className="font-medium">
          Descripción
        </label>
        <textarea
          id="design-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass}
        />
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
            name="is_published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="size-6"
          />
          Publicado
        </label>
        <p className="text-sm">
          Si no está publicado, solo lo ves tú. Los diseños publicados aparecen en
          «Trabajos reales», en la página del sitio.
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
