// Class names of the company pages: 6 px corners on buttons, 8 px on cards, 1 px
// outlines, no offset shadows (spec 002, 2026-11-12 amendment, "Shapes").

const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-md border px-6 py-3 text-base font-semibold font-heading transition";

/** Navy button. */
export const corpButtonClass = `${buttonBase} border-corp-navy bg-corp-navy text-white hover:bg-corp-navy-deep`;

/** Navy outline button. */
export const corpOutlineButtonClass = `${buttonBase} border-corp-navy bg-white text-corp-navy hover:bg-corp-gray`;

/** Gold button for the navy band (navy text on gold, 5.2:1). */
export const corpGoldButtonClass = `${buttonBase} corp-on-navy border-corp-gold bg-corp-gold text-corp-navy hover:bg-corp-gold-light`;

export const corpCardClass = "rounded-lg border border-corp-line bg-white";

/** The sign-in link ("Admin" / "Mi panel") of the company header; one width for both labels. */
export const corpAccountLinkClass =
  "inline-flex min-h-11 w-24 items-center justify-center rounded-md border border-corp-line px-3 text-sm font-semibold font-heading text-corp-navy hover:bg-corp-gray";
