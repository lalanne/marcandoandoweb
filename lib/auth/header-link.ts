import { isAdminUser } from "./admin";

export type HeaderLink = { label: string; href: string };

const SIGN_IN: HeaderLink = { label: "Entrar", href: "/entrar" };
const PANEL: HeaderLink = { label: "Mi panel", href: "/panel" };

// The home page header link: "Mi panel" for the admin (same rule as
// public.is_admin()), "Entrar" for everyone else, including a visitor and a
// signed-in customer. Nothing here says who the user is.
export function headerLinkFor(
  user:
    | { app_metadata?: object | null; user_metadata?: object | null }
    | null
    | undefined,
): HeaderLink {
  return isAdminUser(user) ? PANEL : SIGN_IN;
}

export const DEFAULT_HEADER_LINK = SIGN_IN;
