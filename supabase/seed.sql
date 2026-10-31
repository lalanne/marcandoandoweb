-- LOCAL DEVELOPMENT AND TESTS ONLY. Never applied to production (spec 002,
-- Constraints): `supabase db reset` runs it locally; `supabase db push` and
-- production migrations never do. Everything here is fake: no real child photo,
-- no school crest, no real price or person.

-- Three fake users: two admins and one signed-in non-admin (any number of admins
-- is allowed, spec 005). An admin is identified by app_metadata.role = 'admin' (see
-- public.is_admin(), which reads the signed token). app_metadata can only be
-- written with the service role, never by a user.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'admin@marcandoando.test',
   crypt('local-only-admin-pass', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"admin"}', '{}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'admin2@marcandoando.test',
   crypt('local-only-admin2-pass', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"admin"}', '{}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'cliente@marcandoando.test',
   crypt('local-only-cliente-pass', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(),
   '', '', '', '', '', '', '', '');

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select u.id, u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email in ('admin@marcandoando.test', 'admin2@marcandoando.test', 'cliente@marcandoando.test');

-- Fake sample catalog. Prices and names are obviously invented. Two published
-- packs, one highlighted, so the "Packs" section and its order can be tested.
insert into public.product (slug, name, description, price_from_clp, kind, is_featured, is_available, is_published) values
  ('demo-botella-ejemplo', 'Botella de ejemplo', 'Producto falso para desarrollo.', 1000, 'producto', true, true, true),
  ('demo-polera-ejemplo', 'Polera de ejemplo', 'Producto falso para desarrollo.', 1000, 'producto', false, true, true),
  ('demo-calcetines-agotados', 'Calcetines de ejemplo (no disponibles)', 'Producto falso, no disponible por ahora.', 1000, 'producto', false, false, true),
  ('demo-estuche-borrador', 'Estuche de ejemplo (borrador)', 'Producto falso sin publicar.', 1000, 'producto', false, true, false),
  ('demo-pack-regalo', 'Pack regalo de ejemplo', 'Pack falso para desarrollo.', 1000, 'pack', true, true, true),
  ('demo-pack-curso', 'Pack curso de ejemplo', 'Pack falso para desarrollo.', 1000, 'pack', false, true, true),
  ('demo-pack-borrador', 'Pack de ejemplo (borrador)', 'Pack falso sin publicar.', 1000, 'pack', false, true, false);

insert into public.design (slug, title, description, is_published) values
  ('demo-diseno-estrellas', 'Diseño de ejemplo: estrellas', 'Diseño falso para desarrollo.', true),
  ('demo-diseno-borrador', 'Diseño de ejemplo (borrador)', 'Diseño falso sin publicar.', false);

-- Fake image rows (the files do not exist in storage; the gallery shows nothing
-- until real files are uploaded locally).
insert into public.image (storage_path, alt_text, kind, position, product_id)
select 'demo/botella.webp', 'Botella de ejemplo con un dibujo de estrellas', 'photo', 1, id
from public.product where slug = 'demo-botella-ejemplo';
