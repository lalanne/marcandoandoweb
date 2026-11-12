import { INSTAGRAM_URL, generalWhatsappUrl } from "@/lib/catalog/whatsapp";

const linkClass =
  "corp-on-navy inline-flex min-h-11 min-w-11 items-center rounded-md text-corp-gold-light underline";

// The footer of the company pages (spec 002, criterion 109). Same facts as the
// people's footer, without its tagline.
export function CompanyFooter() {
  return (
    <footer className="bg-corp-navy-deep px-4 pb-28 pt-8 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <p className="font-heading text-lg font-semibold">
          Marcando Ando · Soluciones corporativas
        </p>
        <ul className="flex flex-col">
          <li>
            <a className={linkClass} href={generalWhatsappUrl("empresas")}>
              WhatsApp: +56 9 8266 1835
            </a>
          </li>
          <li>
            <a className={linkClass} href={INSTAGRAM_URL}>
              Instagram: @marcando_ando
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
