-- Product type instead of categories (spec 001 and 002, amendment of 2026-10-31,
-- issue #64). Expand step: add the type and stop requiring a category. The code
-- that is live before this deploy still works: it keeps writing category_id and
-- reading the category table, which stays until issue #65 drops it.

-- Existing products become "producto" through the default.
alter table public.product
  add column kind text not null default 'producto'
    constraint product_kind_check check (kind in ('producto', 'pack'));

alter table public.product alter column category_id drop not null;

comment on column public.product.kind is
  'producto or pack: the home page section the product is listed in (spec 001).';
comment on column public.product.category_id is
  'Unused since 2026-10-31; dropped with the category table in issue #65.';
