import type { ReactNode } from "react";
import { inter, montserrat } from "./fonts";

/** The root of every company page: the --corp- theme and its two fonts. */
export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${inter.variable} corp-theme flex flex-1 flex-col`}>
      {children}
    </div>
  );
}
