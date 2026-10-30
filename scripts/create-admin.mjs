// Creates (or resets) an admin account. Any number of admins can exist: run it
// once per person, with the email that person signs in with (also their Google
// email, which links to this user). Run by the developer or the owner,
// never by the app: it needs the service-role key, which must never be imported
// by app code or reach the browser.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-admin.mjs
//
// The admin is the user whose token has app_metadata.role = 'admin'
// (public.is_admin()). Run again for the same email, it resets the password.
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } =
  process.env;

const missing = Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) return null;
  }
}

const attributes = {
  password: ADMIN_PASSWORD,
  email_confirm: true,
  app_metadata: { role: "admin" },
};

try {
  const existing = await findUserByEmail(ADMIN_EMAIL);
  const { error } = existing
    ? await supabase.auth.admin.updateUserById(existing.id, attributes)
    : await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, ...attributes });
  if (error) throw error;
  console.log(
    `${existing ? "Admin actualizado" : "Admin creado"}: ${ADMIN_EMAIL}`,
  );
} catch (error) {
  console.error(`No se pudo crear el admin: ${error.message}`);
  process.exit(1);
}
