import type { Audience } from "@/lib/catalog/audience";
import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";

// On /empresas and on an Empresas product page it carries the company message.
export function FloatingWhatsapp({ audience = "personas" }: { audience?: Audience }) {
  return (
    <a
      href={generalWhatsappUrl(audience)}
      aria-label="WhatsApp"
      className={
        audience === "empresas"
          ? "fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white bg-corp-navy text-white hover:bg-corp-navy-deep"
          : "fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-night bg-brand-teal text-brand-night shadow-[3px_3px_0_var(--brand-night)] hover:bg-brand-yellow"
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
      >
        <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      </svg>
    </a>
  );
}
