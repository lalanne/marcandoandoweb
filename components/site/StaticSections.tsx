import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";
import { buttonClass } from "./Hero";

const steps = [
  {
    title: "Cuéntanos tu idea",
    text: "Escríbenos por WhatsApp con tu diseño, tu nombre o lo que imaginas.",
  },
  {
    title: "Te enviamos una cotización",
    text: "Te respondemos con las opciones y el valor para tu pedido.",
  },
  {
    title: "Lo hacemos",
    text: "Si te gusta, lo preparamos y te avisamos cuando esté listo.",
  },
];

export function HowToOrder() {
  return (
    <section
      id="como-pedir"
      aria-labelledby="como-pedir-title"
      className="bg-brand-cream px-4 py-12"
    >
      <div className="mx-auto max-w-5xl">
        <h2 id="como-pedir-title" className="text-3xl font-bold">
          Cómo pedir
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-3xl border-2 border-brand-night bg-white p-4"
            >
              <span
                aria-hidden="true"
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-night bg-brand-pink text-xl font-bold"
              >
                {i + 1}
              </span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-1">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Schools() {
  return (
    <section
      id="colegios"
      aria-labelledby="colegios-title"
      className="bg-brand-purple/20 px-4 py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="colegios-title" className="text-3xl font-bold">
          Colegios y grupos
        </h2>
        <p className="mt-3 text-lg">
          ¿Un curso, una generación o un equipo? Hacemos poleras, polerones,
          botellas y más con el nombre, el logo o el diseño de tu grupo.
        </p>
        <a href={generalWhatsappUrl()} className={`${buttonClass} mt-6`}>
          Escríbenos por WhatsApp
        </a>
      </div>
    </section>
  );
}
