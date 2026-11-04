-- Catalog a product belongs to: Personas or Empresas (spec 001 and 002, amendment
-- of 2026-11-04, issue #107). Expand step only: a new column with a default, so
-- the code that is live before this deploy keeps working (it neither reads nor
-- writes it) and every existing product becomes "personas", which leaves the
-- live site as it was.

alter table public.product
  add column audience text not null default 'personas'
    constraint product_audience_check check (audience in ('personas', 'empresas'));

comment on column public.product.audience is
  'personas or empresas: the catalog the product is listed in, the home page or /empresas (spec 001).';
