import type { ReactNode } from "react";

/**
 * The root of every company page: the --corp- theme and its two fonts. The fonts
 * are self-hosted in public/fonts and their stylesheet is linked only from here, so
 * a people's page never declares or requests them (criterion 104). React hoists the
 * links into the head.
 */
export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <div className="corp-theme flex flex-1 flex-col">
      {/* eslint-disable-next-line @next/next/no-css-tags -- a plain file in public/, hoisted by React */}
      <link rel="stylesheet" href="/fonts/company.css" precedence="default" />
      {["montserrat", "inter"].map((font) => (
        <link
          key={font}
          rel="preload"
          as="font"
          type="font/woff2"
          href={`/fonts/${font}-latin.woff2`}
          crossOrigin="anonymous"
        />
      ))}
      {children}
    </div>
  );
}
