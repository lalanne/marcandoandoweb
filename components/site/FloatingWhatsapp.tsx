import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";

export function FloatingWhatsapp() {
  return (
    <a
      href={generalWhatsappUrl()}
      aria-label="WhatsApp"
      className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-night bg-brand-teal text-brand-night shadow-[3px_3px_0_var(--brand-night)] hover:bg-brand-yellow"
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
