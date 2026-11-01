import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const title = "Marcando Ando | Marcamos tus ideas";
const description =
  "Personalizamos poleras, polerones, botellas, calcetines, estuches y más con tu diseño, tu nombre o tu idea. Cotiza por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "es_CL",
    siteName: "Marcando Ando",
    images: [
      {
        url: "/img/og.jpg",
        width: 1200,
        height: 630,
        alt: "Marcando Ando, logo con una polera rosada con una M y un tazón morado",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
