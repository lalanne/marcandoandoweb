// Shared look of the products screens: big touch targets for the phone, the
// brand's dark outlines, and the notices that follow an action.

export const inputClass =
  "w-full rounded-xl border-2 border-brand-night bg-white px-3 py-2 font-normal";
export const fieldClass = "flex flex-col gap-1";
export const primaryButton =
  "min-h-11 rounded-xl border-2 border-brand-night bg-brand-yellow px-4 py-2 font-semibold text-brand-night disabled:opacity-60";
export const secondaryButton =
  "min-h-11 rounded-xl border-2 border-brand-night bg-white px-4 py-2 font-semibold text-brand-night disabled:opacity-60";
export const dangerButton =
  "min-h-11 rounded-xl border-2 border-red-800 bg-red-800 px-4 py-2 font-semibold text-white";
export const errorClass = "font-medium text-red-800";

const NOTICES: Record<string, { text: string; kind: "ok" | "error" }> = {
  creado: { text: "Producto creado. Ya puedes agregar fotos.", kind: "ok" },
  guardado: { text: "Producto guardado.", kind: "ok" },
  eliminado: { text: "Producto eliminado.", kind: "ok" },
  "no-eliminado": {
    text: "No se pudo eliminar el producto. Intenta de nuevo.",
    kind: "error",
  },
  "foto-subida": { text: "Foto subida.", kind: "ok" },
  "foto-guardada": { text: "Foto guardada.", kind: "ok" },
  "foto-eliminada": { text: "Foto eliminada.", kind: "ok" },
  "foto-no-eliminada": {
    text: "No se pudo eliminar la foto. Intenta de nuevo.",
    kind: "error",
  },
};

/** The message that follows an action, chosen by `?aviso=` in the address. */
export function Notice({ code }: { code: string | undefined }) {
  const notice = code ? NOTICES[code] : undefined;
  if (!notice) return null;
  return notice.kind === "ok" ? (
    <p
      role="status"
      className="rounded-xl border-2 border-brand-night bg-brand-teal/30 px-4 py-2 font-medium"
    >
      {notice.text}
    </p>
  ) : (
    <p
      role="alert"
      className="rounded-xl border-2 border-red-800 bg-white px-4 py-2 font-medium text-red-800"
    >
      {notice.text}
    </p>
  );
}
