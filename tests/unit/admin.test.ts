import { describe, expect, it } from "vitest";
import { isAdminUser } from "../../lib/auth/admin";

// Mirrors public.is_admin(): app_metadata.role = 'admin'. user_metadata can be
// written by the user themselves, so it must never count.
describe("isAdminUser", () => {
  it("is true when app_metadata.role is admin", () => {
    expect(isAdminUser({ app_metadata: { role: "admin" } })).toBe(true);
  });

  it("is false for a user with no role", () => {
    expect(isAdminUser({ app_metadata: {} })).toBe(false);
  });

  it("is false for another role", () => {
    expect(isAdminUser({ app_metadata: { role: "cliente" } })).toBe(false);
  });

  it("ignores user_metadata, which the user can edit", () => {
    expect(
      isAdminUser({ app_metadata: {}, user_metadata: { role: "admin" } }),
    ).toBe(false);
  });

  it("is false when there is no user", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });
});
