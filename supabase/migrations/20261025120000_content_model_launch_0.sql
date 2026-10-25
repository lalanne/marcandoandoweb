-- Launch 0 subset of spec 001 (content model): category, product, design, image.
-- Variants, themes, join tables, offers and multiple categories per product come
-- with later specs (spec 002, Data).

-- Who is the admin? Spec 001 assumes "a function that says whether the current
-- user is the admin". Simplest option: the signed token carries
-- app_metadata.role = 'admin'. app_metadata can only be written with the service
-- role (the developer creates the admin account), never by a signed-in user.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Category: flat, the navigation of the catalog (spec 001).
create table public.category (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text,
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text,
  -- Optional: prices are unconfirmed (spec 001 amendment 2026-10-25). A null check passes.
  price_from_clp integer check (price_from_clp >= 0),
  -- Launch 0: one category per product (spec 002). The join table comes later.
  category_id uuid not null references public.category (id) on delete restrict,
  is_featured boolean not null default false,
  is_available boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_category_id_idx on public.product (category_id);

create table public.design (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  description text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Image: a file in the storage bucket `images`. Exactly one owner. The variant
-- owner is added with variants; launch 0 owners are a product or a design.
create table public.image (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null check (length(btrim(storage_path)) > 0),
  alt_text text not null check (length(btrim(alt_text)) > 0),
  kind text not null default 'photo' check (kind in ('photo', 'graphic')),
  position integer not null default 0,
  product_id uuid references public.product (id) on delete cascade,
  design_id uuid references public.design (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_exactly_one_owner check (num_nonnulls(product_id, design_id) = 1)
);
create index image_product_id_idx on public.image (product_id);
create index image_design_id_idx on public.image (design_id);

create trigger category_set_updated_at before update on public.category
  for each row execute function public.set_updated_at();
create trigger product_set_updated_at before update on public.product
  for each row execute function public.set_updated_at();
create trigger design_set_updated_at before update on public.design
  for each row execute function public.set_updated_at();
create trigger image_set_updated_at before update on public.image
  for each row execute function public.set_updated_at();

-- The ten catalog categories of Req 3B. Real, permanent data (not seed data):
-- they ship to production. Published, because they are the site's navigation;
-- editing them in the admin is out of scope at launch (spec 002).
insert into public.category (slug, name, position, is_published) values
  ('botellas', 'Botellas personalizadas', 1, true),
  ('poleras', 'Poleras personalizadas', 2, true),
  ('polerones', 'Polerones personalizados', 3, true),
  ('estuches', 'Estuches personalizados', 4, true),
  ('calcetines', 'Calcetines personalizados', 5, true),
  ('productos-escolares', 'Productos escolares', 6, true),
  ('regalos', 'Regalos personalizados', 7, true),
  ('cursos-y-generaciones', 'Productos para cursos y generaciones', 8, true),
  ('fechas-especiales', 'Productos para fechas especiales', 9, true),
  ('etiquetas-para-ropa', 'Etiquetas para ropa', 10, true);

-- Row-level security (spec 001, "Visibility and write rules"): the public reads
-- published rows; only the admin writes and reads unpublished rows.
alter table public.category enable row level security;
alter table public.product enable row level security;
alter table public.design enable row level security;
alter table public.image enable row level security;

-- Supabase grants every privilege on new tables to anon and authenticated by
-- default; take back what the public must never have, as a second lock.
revoke all on public.category, public.product, public.design, public.image from anon;
grant select on public.category, public.product, public.design, public.image to anon;

create policy "public reads published categories" on public.category
  for select to anon, authenticated using (is_published);
create policy "admin manages categories" on public.category
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Unavailable products stay visible (spec 001, interpretation): only
-- is_published matters here.
create policy "public reads published products" on public.product
  for select to anon, authenticated using (is_published);
create policy "admin manages products" on public.product
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads published designs" on public.design
  for select to anon, authenticated using (is_published);
create policy "admin manages designs" on public.design
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- An image is visible when its owner is.
create policy "public reads images of published owners" on public.image
  for select to anon, authenticated using (
    exists (select 1 from public.product p where p.id = product_id and p.is_published)
    or exists (select 1 from public.design d where d.id = design_id and d.is_published)
  );
create policy "admin manages images" on public.image
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
