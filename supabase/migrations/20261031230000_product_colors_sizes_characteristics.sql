-- Colors, sizes and characteristics of a product (spec 001, amendment of
-- 2026-10-31, issue #87). Expand step only: three new columns with empty
-- defaults. No existing code reads or writes them, so the code that is live
-- before this deploy keeps working. Row-level security is unchanged: the policies
-- are per row, so the public reads published products (with these columns) and
-- only the admin writes.

-- A check constraint cannot hold a subquery, so the list rules live in
-- immutable functions.

-- colors: a list of at most 20 objects {name, hex}; name 1 to 30 characters and
-- not blank, hex "#RRGGBB".
create function public.product_colors_valid(colors jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(colors) = 'array'
    and jsonb_array_length(colors) <= 20
    and not exists (
      select 1
      from jsonb_array_elements(colors) as c(value)
      where jsonb_typeof(c.value) <> 'object'
         or jsonb_typeof(c.value -> 'name') is distinct from 'string'
         or jsonb_typeof(c.value -> 'hex') is distinct from 'string'
         or char_length(c.value ->> 'name') not between 1 and 30
         or btrim(c.value ->> 'name') = ''
         or (c.value ->> 'hex') !~ '^#[0-9A-Fa-f]{6}$'
    )
$$;

-- sizes: a list of at most 20 text labels, each 1 to 20 characters and not blank.
create function public.product_sizes_valid(sizes jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(sizes) = 'array'
    and jsonb_array_length(sizes) <= 20
    and not exists (
      select 1
      from jsonb_array_elements(sizes) as s(value)
      where jsonb_typeof(s.value) <> 'string'
         or char_length(s.value #>> '{}') not between 1 and 20
         or btrim(s.value #>> '{}') = ''
    )
$$;

alter table public.product
  add column colors jsonb not null default '[]'::jsonb
    constraint product_colors_check check (public.product_colors_valid(colors)),
  add column sizes jsonb not null default '[]'::jsonb
    constraint product_sizes_check check (public.product_sizes_valid(sizes)),
  add column characteristics text not null default ''
    constraint product_characteristics_check check (char_length(characteristics) <= 1000);

comment on column public.product.colors is
  'List, in display order, of {name, hex}: up to 20, name 1 to 30 characters, hex #RRGGBB (spec 001).';
comment on column public.product.sizes is
  'List, in display order, of size or clothing-size labels: up to 20, each 1 to 20 characters (spec 001).';
comment on column public.product.characteristics is
  'One characteristic per line: material, measurements, capacity, care. Up to 1000 characters (spec 001).';
