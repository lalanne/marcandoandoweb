import { Inter, Montserrat } from "next/font/google";

// The company pages' fonts (spec 002, 2026-11-12 amendment). Only CompanyShell
// imports this file, so only the company pages ask for them.
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
