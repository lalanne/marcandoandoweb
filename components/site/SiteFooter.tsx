import { INSTAGRAM_URL, generalWhatsappUrl } from "@/lib/catalog/whatsapp";

// No email: the owner has not confirmed one (spec 002, criterion 15).
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-brand-night bg-brand-night px-4 pb-28 pt-8 text-brand-cream">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <p className="text-xl font-semibold">Marcando Ando</p>
        <p>Marcamos tus ideas.</p>
        <ul className="flex flex-col gap-2">
          <li>
            <a className="underline" href={generalWhatsappUrl()}>
              WhatsApp: +56 9 8266 1835
            </a>
          </li>
          <li>
            <a className="underline" href={INSTAGRAM_URL}>
              Instagram: @marcando_ando
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
