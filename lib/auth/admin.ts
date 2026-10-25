// Mirrors public.is_admin() in the database: the admin is the user whose
// app_metadata.role is 'admin'. app_metadata can only be written with the
// service role; user_metadata is user-editable and must never count.
export function isAdminUser(
  user:
    | { app_metadata?: object | null; user_metadata?: object | null }
    | null
    | undefined,
): boolean {
  const role = (user?.app_metadata as { role?: unknown } | null | undefined)
    ?.role;
  return role === "admin";
}
