# 001 — Content Model

**Status:** approved (by the owner, 2026-10-31, with the amendment of that date, issue #63; first approved by the owner on 2026-10-23)

Sources: [spec 000](000-overview.md), [`docs/requirements.md`](../docs/requirements.md)
("Req §N"), [ADR-0001](../docs/adr/0001-web-stack.md). Interpretations and gaps
are labelled **(interpretation)**.

This spec defines *what the site knows*: the entities, how they relate, what is
public and what only the admin can touch. It is the foundation of the database,
the admin and every public page. It contains no SQL; the migrations are written
from it.

## Requirements covered

- ~~Ten catalog categories, and new ones addable without a redesign (Req §3B).~~
  Replaced 2026-10-31: two product types, "Productos" and "Packs" (Javiera's
  feedback of 2026-10-31 in `docs/requirements.md`). See the amendment under
  Category.
- Products with name, photos, description, "from" price, personalization
  options, and size, color and material information (Req §3B).
- Products with variants: different designs, names, colors and themes of the same
  product (Req §3C).
- Minimum quantities (Req §3C).
- A gallery of designs and finished work, grouped by theme, where each design can
  relate to one or more products (Req §3D).
- A schools and courses area built from the same content (Req §3E).
- Filters by product type and theme, and search (Req §4).
- Highlighted products, and products marked available or temporarily unavailable
  (Req §7).
- Offers (decided in spec 000: a product can have an offer price).
- Prices in CLP, editable by the admin (Req §3B, §7).

## Entities

All tables have `id` (uuid), `created_at` and `updated_at`. Every user-facing text
is Chilean Spanish. Slugs are lowercase, URL-safe and unique within their table;
they are used in page addresses (for SEO) and do not change once published, unless
the admin changes them on purpose.

### Category

The catalog's navigation: the ten categories of Req §3B (bottles, t-shirts,
hoodies, pencil cases, socks, school products, gifts, courses and generations,
special dates, clothing labels).

| Field | Notes |
|-------|-------|
| `slug`, `name` | required |
| `description` | optional, short |
| `position` | integer, display order |
| `is_published` | default false; unpublished categories are hidden from the public |

Categories are flat (no nesting) in v1. **(interpretation)**

**2026-10-31 amendment - categories replaced by a product type (issue #63).**
Javiera asked to remove the categories and keep only two groups, "Productos" and
"Packs" ("Feedback from Javiera (2026-10-31)" in `docs/requirements.md`). The
owner decided that a pack is an ordinary product with a different label (same
fields, no link to other products: "Los packs son como productos no bundle"),
and that the two groups are a **fixed type on the product**, not rows the admin
can edit. So:

- The **Category** entity, its product join table and its public read rule are
  removed from the model. Adding a third type is a spec change, not an admin task.
- **Product** gets a required `kind` (see the Product table).
- Themes are unchanged.

Migration plan (`CLAUDE.md`, "expand then contract"): first a migration adds
`product.kind` and makes `product.category_id` nullable, and the code stops
reading categories (issue #64); only after that code is in production, a later
migration drops `product.category_id` and the `category` table (issue #65).
Before this amendment, the ten categories of Req §3B were the catalog's
navigation.

### Theme

A theme the visitor can filter and browse by: Christmas, school and courses,
sports teams, Father's Day, and so on (Req §3D, §4: "temática").

| Field | Notes |
|-------|-------|
| `slug`, `name` | required |
| `parent_id` | optional, **one level only**: a theme may have children (for example "Colegios y cursos" with "Regalos para profesores") but a child cannot have children **(interpretation)** |
| `position`, `is_published` | integer display order; default false, unpublished themes are hidden from the public |

### Product

A thing Marcando Ando can personalize and quote.

| Field | Notes |
|-------|-------|
| `slug`, `name` | required |
| `description` | detailed description (Req §3C) |
| `price_from_clp` | optional integer, whole pesos, `>= 0` when set; shown as a "from" or reference price, not a firm quote (Req §3B). See the 2026-10-25 amendment below |
| `offer_price_clp` | optional integer; when set it must be lower than `price_from_clp`; this *is* the offer: a product is "on offer" exactly when it is set **(interpretation of "Ofertas", pending Javiera)** |
| `personalization` | text: what can be personalized and how, such as print size and "tu logo o tu diseño aquí" (Req §3B, §3C) |
| `materials`, `sizes`, `colors` | optional text, filled "when it applies" (Req §3B) **(interpretation: plain text, not structured)** |
| `min_quantity` | optional integer `>= 1` (Req §3C) |
| `is_featured` | highlighted on the site (Req §7) |
| `is_available` | default true; false means "temporarily unavailable" (Req §7) |
| `is_published` | default false; unpublished products are hidden from the public. Lets the admin prepare a product before it goes live **(interpretation)** |
| `kind` | required, `producto` or `pack`, default `producto`; any other value is rejected. Decides whether the product is listed under "Productos" or "Packs" (2026-10-31 amendment under Category) |

**2026-10-25 amendment - price is optional.** The owner decided that
`price_from_clp` is optional, because the client has not confirmed prices and a
required column would force invented numbers (`CLAUDE.md`: real data only). A
product without a price is valid, can be published, and the public reads it; the
site shows no price for it. When a price is set, criterion 1 still applies (whole
pesos, `>= 0`). It used to be required. `offer_price_clp` only makes sense with a
price: the offer rule (criterion 2) applies when `price_from_clp` is set.

~~A product belongs to **one or more categories** (a school bottle sits in both
"Botellas" and "Productos escolares") and may carry **themes**. Both through join
tables, with an order within a category.~~

**2026-10-31 amendment.** A product has exactly one `kind` and may carry
**themes** through a join table. It no longer belongs to categories.

### Variant

A named option of one product, with its own photos: a design, a name, a color
(Req §3C: "una botella puede tener diferentes diseños, nombres, colores y temáticas").

| Field | Notes |
|-------|-------|
| `product_id` | required; a variant cannot exist without its product |
| `name` | required, such as "Diseño Spider-Man" |
| `description` | optional |
| `price_clp` | optional; when set it replaces the product's "from" price for this variant, when empty the product's price applies **(interpretation)** |
| `is_available`, `position` | as for products |

A variant has no separate publish flag: it is visible when its product is.

### Design

The gallery's unit: a design or finished piece of work (Req §3D). One design can
show both the graphic and photos of finished products made with it.

| Field | Notes |
|-------|-------|
| `slug`, `title` | required |
| `description` | optional |
| `is_featured`, `is_published` | as for products |

A design carries **themes**, and links to **zero or more products** it can be used
on (Req §3D: a school-generation design used on a bottle, a pencil case, a t-shirt
or a hoodie). The link is many-to-many.

### Image

A photo or graphic stored in Supabase Storage (upload and optimization are spec
005; this spec only says what the database holds).

| Field | Notes |
|-------|-------|
| `storage_path` | required |
| `alt_text` | required, Spanish (accessibility, spec 000) |
| `kind` | `photo` (a photo of a product or finished work) or `graphic` (a design graphic) |
| `position` | display order within its owner |
| owner | **exactly one** of `product_id`, `variant_id`, `design_id` |

An owner's first image by `position` is its cover image.

### Not in the model (v1)

- **Contact data** (WhatsApp, Instagram, email) lives in configuration, not the
  database: the admin list in Req §7 does not include editing it.
- **Customers, orders, carts, reviews:** out of v1 (spec 000).
- **Admin users and roles:** spec 003. This spec assumes a function that says
  whether the current user is the admin.

## Relationships

Amended 2026-10-31: Category and ProductCategory are removed; `kind` is a column
of Product.

```
                                 Product (kind) ──< Variant
                                    │ │
Theme ──< ProductTheme >────────────┘ └──< Image (product or variant)
  │
  └──< DesignTheme >── Design ──< Image (design)
                          │
                          └──< DesignProduct >── Product
```

## Visibility and write rules (row-level security)

The public is anonymous; the admin is the single admin role (spec 000).

| Data | The public can read | Only the admin can |
|------|--------------------|--------------------|
| Theme (Category until the 2026-10-31 amendment) | published rows | create, change, delete, and read unpublished rows |
| Product | published rows, **including unavailable ones** (shown as unavailable, **(interpretation)**) | create, change, delete, and read unpublished rows |
| Variant | variants of a published product | all writes, and read variants of unpublished products |
| Design | published rows | all writes, and read unpublished rows |
| Image | images whose owner is visible to the public | all writes |
| Join tables | links where **both** sides are visible to the public | all writes |

No one but the admin can write anything. Image files themselves are served from
storage; their access rules belong to spec 005.

## Derived behavior

- **Group (added 2026-10-31):** a product with `kind` `producto` is listed under
  "Productos", one with `kind` `pack` under "Packs".
- **On offer:** `offer_price_clp` is set. The offers view lists the published
  products on offer, available or not. The old price is `price_from_clp`.
- **Quote enabled:** a product is quotable when it is published and available.
  An unavailable product still shows, with a "no disponible por ahora" notice and
  no quote button **(interpretation)**.
- **Schools and courses section:** the products and designs carrying the
  "Colegios y cursos" theme or its children (spec 009).
- **Search:** product name and description, Spanish full-text (spec 006).

## Acceptance criteria

Numbered for traceability; each is proven by the test named in the Verification
plan.

**Structure and constraints**

1. Given a product, when `price_from_clp` is negative or not a whole number, the
   write is rejected.
2. Given a product with `price_from_clp` 7000, when `offer_price_clp` is set to
   7000 or more, the write is rejected; when set to 5900, it is accepted and the
   product is on offer.
3. Given two products, when they share a slug, the second write is rejected; the
   same holds for themes and designs within their own table.

   **2026-10-31 amendment.** This criterion also covered categories; they are
   removed from the model.
4. Given a product, when `min_quantity` is less than 1, the write is rejected.
5. Given an image, when it has no owner or more than one owner, the write is
   rejected.
6. Given an image, when `alt_text` is empty, the write is rejected.
7. Given a theme that already has a parent, when another theme is made its child,
   the write is rejected.
8. Given a variant, when its product is deleted, the variant and its image rows are
   deleted with it.

**Relationships**

9. ~~Given a product, when it is added to two categories, it appears in both
   categories' listings.~~ **Retired 2026-10-31:** there are no categories; a
   product has one `kind` (criteria 22 and 23).
10. Given a design linked to three products, when the public reads the design, the
    three products are returned; and when it reads one of those products, the
    design is returned.
11. Given a design linked to a published product and an unpublished one, when the
    public reads the design's products, only the published one is returned.
12. Given a theme with a child theme, when the public reads the parent, the child
    is available as a child of it.

**Visibility (public)**

13. Given an unpublished product, when the public requests it or lists products, it
    is not returned, and neither are its variants, images or links.
14. Given a published product marked unavailable, when the public lists products,
    it is returned with its unavailable flag set.
15. Given one published and one unpublished product of the same `kind`, when the
    public lists the products of that `kind`, only the published product is
    returned.

    **2026-10-31 amendment.** This criterion listed a published category; it now
    lists a `kind`.
16. Given an unpublished design or theme, when the public lists them, it is not
    returned.
17. Given products on offer and not, when the public asks for offers, only the
    published products with an offer price are returned, each with its old and new
    price.

**Writes (admin)**

18. Given the public (not signed in), when it tries to create, change or delete any
    row in any table of this model, the write is rejected.
19. Given a signed-in user who is not the admin, when they try the same writes, they
    are rejected.
20. Given the admin, when they create, change or delete a product (including its
    `kind`), variant, design, theme, image row or link, the write succeeds, and the
    admin can read unpublished rows.

    **2026-10-31 amendment.** "Category" is removed from the list and changing a
    product's `kind` is added.

**Ordering**

21. Given themes, variants and images with positions, when they are listed, they
    come back ordered by position.

    **2026-10-31 amendment.** Categories are removed from the list.

**Product type** (added 2026-10-31, issue #63)

22. Given a product, when `kind` is set to anything other than `producto` or
    `pack`, or set to null, the write is rejected; when it is not given, the
    product is saved with `kind` `producto`.
23. Given published products of both kinds, when the public reads products, each
    one is returned with its `kind`, and asking for one `kind` returns only the
    published products of that `kind`.

## Verification plan

Test layers follow `CLAUDE.md` and `duplaweb`'s `TESTING.md`. The database
constraints and the visibility rules run against a real **local Supabase**, never
a mock of the database.

| # | Criterion | Layer |
|---|-----------|-------|
| 1–4, 7 | Value and shape constraints | Integration (local Supabase) |
| 5, 6 | Image owner and alt text | Integration |
| 8 | Delete cascade | Integration |
| 10–12 | Relationships | Integration (9 retired 2026-10-31) |
| 13–17 | Public visibility | Integration, as the anonymous role |
| 18, 19 | Writes rejected | Integration, as anonymous and as a non-admin user |
| 20 | Admin writes | Integration, as the admin |
| 21 | Ordering | Integration |
| 22, 23 | Product type: allowed values, default, public read by `kind` | Integration (local Supabase), as the anonymous role and the admin |
| 2, 17 | Offer rule | Also a unit test for the pure "is on offer / old and new price" helper |

A criterion is checked off here when its test exists, failed first for the right
reason, and now passes.

## Seed data (proposal)

For local development and tests: ~~the ten categories of Req §3B~~ (removed
2026-10-31) products of both kinds (at least one `pack`), a few themes taken
from the requirements and the Instagram account (Christmas, Colegios y cursos with
a couple of children, Equipos deportivos, Día del Padre), a handful of sample
products with variants and designs, one admin, one non-admin user. Seed prices and
photos are obviously fake; **no real child photo and no school crest** appears in
seed data (spec 000, privacy).

## Open design questions

The owner approved the spec on 2026-10-23 with the proposals below as the working answers. Questions 2, 4 and 6 still need Javiera's confirmation; changing an answer later is an amendment note under the affected section.

1. **Categories versus themes.** Req §3B lists ten "categories" that mix product
   types (bottles, t-shirts) with occasions and audiences (school, gifts, special
   dates), while Req §4 asks for filters by "product type" *and* "theme". This spec
   keeps both: categories as the catalog navigation (a product may be in several),
   themes as the cross-cutting filter. Is that the right split, or should the
   occasion-style categories become themes?
   **Answered 2026-10-31 (Javiera, owner):** no categories; a fixed product type,
   "Productos" or "Packs"; themes stay. See the amendment under Category.
2. **Unavailable products stay visible.** Proposed: shown with a notice and no quote
   button. The alternative is hiding them. Ask Javiera.
3. **Draft state.** `is_published` lets the admin prepare products before they go
   live. Req §7 only asks for available or unavailable. Keep it?
4. **Variant price override.** Optional price per variant. Do bottles with different
   designs ever cost differently?
5. **Sizes, colors and materials as plain text.** Simple for Javiera to edit. If the
   site later needs to filter by color or size, this becomes structured data.
6. **Offers.** Pending Javiera: is "oferta" a discounted product, or a seasonal
   promotion? A seasonal promotion with dates would need start and end dates.
7. **Theme depth.** One level of children. Is that enough for the schools section?
8. **Minimum quantity.** Is it per product, or also per variant? This spec says per
   product.
