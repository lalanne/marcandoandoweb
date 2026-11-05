-- Special collections of the home page: "Especial Navidad" and "Especial escolar"
-- (spec 001 and 002, amendment of 2026-11-05, issue #120). Expand step only: a new
-- column with a default, so the code that is live before this deploy keeps working
-- (it neither reads nor writes it) and every existing product gets the empty list,
-- which leaves the live site as it was. "Todos" is not a value: every published
-- item is in it whatever its collections.

alter table public.product
  add column collections text[] not null default '{}'
    constraint product_collections_check
      check (collections <@ array['navidad', 'escolar']::text[]);

comment on column public.product.collections is
  'Zero, one or two of navidad and escolar: the special tabs of the home page the product also appears in (spec 001).';
