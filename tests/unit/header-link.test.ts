import { describe, expect, it } from "vitest";
import { headerLinkFor } from "../../lib/auth/header-link";

// Spec 002, criteria 27 to 31: "Mi panel" only for the admin, "Admin" for
// everyone else, including when the session could not be read.
describe("headerLinkFor", () => {
  it("[002-AC27] is Admin to /entrar for a visitor with no session", () => {
    expect(headerLinkFor(null)).toEqual({ label: "Admin", href: "/entrar" });
    expect(headerLinkFor(undefined)).toEqual({
      label: "Admin",
      href: "/entrar",
    });
  });

  it("[002-AC28] is Mi panel to /panel for the admin", () => {
    expect(headerLinkFor({ app_metadata: { role: "admin" } })).toEqual({
      label: "Mi panel",
      href: "/panel",
    });
  });

  it("[002-AC29] is Admin for a signed-in user who is not the admin", () => {
    expect(headerLinkFor({ app_metadata: {} })).toEqual({
      label: "Admin",
      href: "/entrar",
    });
  });

  it("[002-AC29] ignores user_metadata, which the user can edit", () => {
    expect(
      headerLinkFor({
        app_metadata: {},
        user_metadata: { role: "admin" },
      }),
    ).toEqual({ label: "Admin", href: "/entrar" });
  });
});
