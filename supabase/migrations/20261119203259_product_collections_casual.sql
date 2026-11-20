-- A third special collection, "casual", and the label "Escolar" (spec 001 and 002,
-- amendment of 2026-11-19, issue #174). Expand step only: the check is replaced by
-- one that also allows `casual`. Every existing row stays valid and unchanged, and
-- the code that is live before this deploy, which knows only navidad and escolar,
-- keeps working (it ignores a value it does not know). The stored value of
-- "Escolar" stays `escolar`, so no row is rewritten.

alter table public.product drop constraint product_collections_check;

alter table public.product
  add constraint product_collections_check
    check (collections <@ array['casual', 'navidad', 'escolar']::text[]);

comment on column public.product.collections is
  'Zero to three of casual, navidad and escolar: the special tabs of the home page the product also appears in (spec 001).';
