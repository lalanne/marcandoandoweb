import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";

export const buttonClass =
  "inline-block rounded-full border-2 border-brand-night bg-brand-yellow px-6 py-3 text-lg font-semibold text-brand-night shadow-[3px_3px_0_var(--brand-night)] transition hover:-translate-y-0.5 hover:bg-brand-pink";

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-brand-cream px-4 py-10 text-center sm:py-16"
    >
      <div
        aria-hidden="true"
        className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-brand-teal/30"
      />
      <div
        aria-hidden="true"
        className="absolute -right-8 bottom-4 h-28 w-28 rounded-full bg-brand-purple/25"
      />
      <div className="relative mx-auto max-w-2xl">
        <h1
          id="hero-title"
          className="text-4xl font-bold leading-tight sm:text-6xl"
        >
          <span className="sr-only">Marcando Ando. </span>
          Marcamos tus ideas
        </h1>
        <p className="mt-4 text-lg sm:text-xl">
          Personalizamos poleras, polerones, botellas, calcetines, estuches y
          más, con tu diseño, tu nombre o tu idea.
        </p>
        <a href={generalWhatsappUrl()} className={`${buttonClass} mt-6`}>
          Cotizar por WhatsApp
        </a>
      </div>
    </section>
  );
}
