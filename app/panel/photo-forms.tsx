"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import {
  validateAltText,
  validateImageFile,
} from "@/lib/admin/image-upload";
import { panelImageUrl } from "@/lib/catalog/images";
import type { PhotoFormState } from "@/lib/admin/action-helpers";
import {
  dangerButton,
  errorClass,
  fieldClass,
  inputClass,
  primaryButton,
  secondaryButton,
} from "./ui";

// The photo forms are shared by products and designs. The screen passes the
// Server Actions of its owner; each reads `owner_id` and `image_id`.
export type PhotoActions = {
  upload: (previous: PhotoFormState, formData: FormData) => Promise<PhotoFormState>;
  save: (previous: PhotoFormState, formData: FormData) => Promise<PhotoFormState>;
  move: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
};

type Problems = { file?: string; alt?: string };

const KINDS = (
  <>
    <option value="photo">Foto</option>
    <option value="graphic">Gráfico</option>
  </>
);

/**
 * Adds a photo. The type, the size and the alt text are checked here first, in
 * Spanish, so a refused photo never leaves the phone; the Server Action and the
 * bucket check them again.
 */
export function UploadPhotoForm({
  ownerId,
  upload,
}: {
  ownerId: string;
  upload: PhotoActions["upload"];
}) {
  const [state, action, pending] = useActionState<PhotoFormState, FormData>(
    upload,
    { error: null },
  );
  const [problems, setProblems] = useState<Problems>({});

  function checkAndSend(formData: FormData) {
    const file = formData.get("file");
    const found: Problems = {
      file:
        (file instanceof File ? validateImageFile(file) : "Elige una foto para subir.") ??
        undefined,
      alt: validateAltText(String(formData.get("alt_text") ?? "")) ?? undefined,
    };
    setProblems(found);
    if (found.file || found.alt) return;
    action(formData);
  }

  const alt = problems.alt;
  const fileProblem = problems.file;

  return (
    <form
      action={checkAndSend}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border-2 border-brand-night bg-white p-4"
    >
      <input type="hidden" name="owner_id" value={ownerId} />
      <div className={fieldClass}>
        <label htmlFor="new-photo-file" className="font-medium">
          Archivo de imagen
        </label>
        <input
          id="new-photo-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-describedby={fileProblem ? "new-photo-file-error" : "new-photo-file-hint"}
          aria-invalid={fileProblem ? true : undefined}
          className={inputClass}
        />
        <p id="new-photo-file-hint" className="text-sm">
          JPG, PNG, WebP o AVIF, de hasta 5 MB.
        </p>
        {fileProblem ? (
          <p id="new-photo-file-error" role="alert" className={errorClass}>
            {fileProblem}
          </p>
        ) : null}
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-photo-alt" className="font-medium">
          Texto alternativo de la foto nueva
        </label>
        <input
          id="new-photo-alt"
          name="alt_text"
          autoComplete="off"
          aria-required="true"
          aria-describedby={alt ? "new-photo-alt-error" : "new-photo-alt-hint"}
          aria-invalid={alt ? true : undefined}
          className={inputClass}
        />
        <p id="new-photo-alt-hint" className="text-sm">
          Obligatorio. Describe lo que se ve, por ejemplo «Botella azul con el
          nombre Sofía».
        </p>
        {alt ? (
          <p id="new-photo-alt-error" role="alert" className={errorClass}>
            {alt}
          </p>
        ) : null}
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-photo-kind" className="font-medium">
          Tipo de la foto nueva
        </label>
        <select id="new-photo-kind" name="kind" defaultValue="photo" className={inputClass}>
          {KINDS}
        </select>
      </div>
      {state.error && !fileProblem && !alt ? (
        <p role="alert" className={errorClass}>
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${primaryButton} self-start`}>
        {pending ? "Subiendo..." : "Subir foto"}
      </button>
    </form>
  );
}

export type PhotoRowProps = {
  ownerId: string;
  actions: Pick<PhotoActions, "save" | "move" | "remove">;
  image: { id: string; storage_path: string; alt_text: string; kind: "photo" | "graphic" };
  /** 1-based position in the list, used in the labels. */
  number: number;
  isFirst: boolean;
  isLast: boolean;
};

/** One photo: preview, alt text and type, order buttons and delete. */
export function PhotoRow({ ownerId, actions, image, number, isFirst, isLast }: PhotoRowProps) {
  const [state, action, pending] = useActionState<PhotoFormState, FormData>(
    actions.save,
    { error: null },
  );
  const [alt, setAlt] = useState(image.alt_text);
  const [kind, setKind] = useState(image.kind);
  const altId = `photo-${image.id}-alt`;
  const kindId = `photo-${image.id}-kind`;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-brand-night bg-white p-3 sm:flex-row">
      <Image
        src={panelImageUrl(image.storage_path)}
        alt={image.alt_text}
        width={160}
        height={160}
        unoptimized
        className="size-32 shrink-0 rounded-xl border-2 border-brand-night object-cover"
      />
      <div className="flex flex-1 flex-col gap-3">
        <form action={action} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="owner_id" value={ownerId} />
          <input type="hidden" name="image_id" value={image.id} />
          <div className={fieldClass}>
            <label htmlFor={altId} className="font-medium">
              Texto alternativo de la foto {number}
            </label>
            <input
              id={altId}
              name="alt_text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              autoComplete="off"
              aria-required="true"
              aria-describedby={state.error ? `${altId}-error` : undefined}
              aria-invalid={state.error ? true : undefined}
              className={inputClass}
            />
            {state.error ? (
              <p id={`${altId}-error`} role="alert" className={errorClass}>
                {state.error}
              </p>
            ) : null}
          </div>
          <div className={fieldClass}>
            <label htmlFor={kindId} className="font-medium">
              Tipo de la foto {number}
            </label>
            <select
              id={kindId}
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "photo" | "graphic")}
              className={inputClass}
            >
              {KINDS}
            </select>
          </div>
          <button type="submit" disabled={pending} className={`${secondaryButton} self-start`}>
            {pending ? "Guardando..." : `Guardar foto ${number}`}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <PhotoButton
            action={actions.move}
            ownerId={ownerId}
            imageId={image.id}
            direction="up"
            disabled={isFirst}
            className={secondaryButton}
          >
            {`Mover la foto ${number} hacia arriba`}
          </PhotoButton>
          <PhotoButton
            action={actions.move}
            ownerId={ownerId}
            imageId={image.id}
            direction="down"
            disabled={isLast}
            className={secondaryButton}
          >
            {`Mover la foto ${number} hacia abajo`}
          </PhotoButton>
          <PhotoButton
            action={actions.remove}
            ownerId={ownerId}
            imageId={image.id}
            className={dangerButton}
          >
            {`Eliminar la foto ${number}`}
          </PhotoButton>
        </div>
      </div>
    </li>
  );
}

function PhotoButton({
  action,
  ownerId,
  imageId,
  direction,
  disabled,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  ownerId: string;
  imageId: string;
  direction?: "up" | "down";
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="owner_id" value={ownerId} />
      <input type="hidden" name="image_id" value={imageId} />
      {direction ? <input type="hidden" name="direction" value={direction} /> : null}
      <button type="submit" disabled={disabled} className={className}>
        {children}
      </button>
    </form>
  );
}
