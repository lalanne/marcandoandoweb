// The two catalogs (spec 001 and 002, amendment of 2026-11-04). Fixed in code and
// in the database check constraint: adding a third is a spec change.
export const AUDIENCES = ["personas", "empresas"] as const;

export type Audience = (typeof AUDIENCES)[number];

/** Spanish label of each catalog, for the admin. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  personas: "Personas",
  empresas: "Empresas",
};

export function isAudience(value: unknown): value is Audience {
  return (AUDIENCES as readonly unknown[]).includes(value);
}
