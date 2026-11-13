# 002 — Launch 0: first public release

**Status:** approved (the 2026-11-12 amendment for issue #153, the company logo as tall as the people's logo, stacked on phones, at a cache-safe address, criteria 118 to 120 and criteria 111 and 112 amended, is a draft for the owner to approve; the 2026-11-12 amendment for issue #148, the company logo next to the people's logo, criteria 112 to 117 and criterion 111 amended, was approved by the owner on 2026-11-12 and is implemented in the PR for issue #148; the 2026-11-12 amendment for issue #141, a corporate look for the company pages, criteria 103 to 111, was approved by the owner on 2026-11-12 and is implemented in the PR for issue #145; the 2026-11-06 amendment for issue #136, the catalog served from a cache refreshed when the admin saves, criteria 97 to 102, was approved by the owner on 2026-11-06; the 2026-11-06 amendment for issue #126, illustrated collection tabs, criteria 93 to 96, was approved by the owner on 2026-11-06; the 2026-11-05 amendment for issue #120, collection tabs on the home page, criteria 82 to 89, was approved by the owner on 2026-11-05; the 2026-11-04 amendment for issue #107, a catalog for companies, criteria 68 to 81, was approved by the owner on 2026-11-04; before that, by the owner on 2026-10-31, with the amendments of that date for issues #63, #69, #72, #79, #82 and #85; first approved on 2026-10-23). The 2026-10-31 amendment for issue #87 (product page, colors, sizes, characteristics; criteria 56 to 66) was approved by the owner on 2026-10-31 and implemented in the PR for issue #88.

Sources: [spec 000](000-overview.md), [spec 001](001-content-model.md) (draft, PR #14),
[`docs/requirements.md`](../docs/requirements.md) ("Req §N"),
[ADR-0001](../docs/adr/0001-web-stack.md). Issue #15. Interpretations are labelled
**(interpretation)**.

## Why this exists

The owner wants something live on Sunday 2026-10-25: *useful, with fewer features,
functional and without errors* (owner, 2026-10-23). The owner's minimum is **a
database and an admin account**, so Javiera can keep the site current herself
(Req §7). Everything else in v1 is cut down to what that minimum needs.

Launch 0 is the smallest slice of v1 that has those two things. It is built on the
final stack and the final model, so v1 grows from it instead of replacing it.

Spec numbering: this spec takes number 002, so the numbers proposed in spec 000's
"Proposed next specs" table shift by one when those specs are drafted.

## Risk

Two days is very tight for a database, auth, row-level security, image upload, an
admin and a public page, all tested and without errors. Reusing `duplaweb`'s auth,
`/panel` pattern and Vercel flow is what makes it possible at all. If the admin is
not verified by Sunday midday, the owner decides: move the date, or launch the
public page with content loaded by the developer and the admin following. That
decision is the owner's, not the agent's.

## Scope

### Data: a subset of spec 001

Spec 001 must be approved for the part launch 0 uses. Launch 0 implements only:

- ~~**Category**: seeded by migration with the ten categories of Req §3B; not
  editable in the admin at launch.~~ Removed 2026-10-31 (amendment below).
- **Product**: name, slug, description, `price_from_clp`, `is_available`,
  `is_featured`, `is_published`, ~~category~~ type (`kind`, amended 2026-10-31).
- **Design**: title, slug, description, `is_published`; the gallery's unit.
- **Image**: alt text (optional in the admin since 2026-11-05: an empty one is stored as
  "Foto de {name}", so it is never empty), owner is a product or a design, position.
- **Row-level security** exactly as in spec 001 for those tables: the public reads
  published rows, only the admin writes.

Deferred to later specs: variants, themes, design-to-product links, offers
(`offer_price_clp`), minimum quantity, ~~materials, sizes and colors~~ (they come in
with the 2026-10-31 amendment for issue #87, below: `colors`, `sizes` and
`characteristics`), multiple categories per product.

A product in launch 0 belongs to one category **(interpretation: the join table
comes with the multi-category work)**.

**2026-10-31 amendment - Productos and Packs instead of categories (issue #63).**
After trying the site, Javiera asked to remove the categories and keep two groups,
"Productos" and "Packs", and to change the header links ("Feedback from Javiera
(2026-10-31)" in `docs/requirements.md`). Following the amendment of the same date
in spec 001:

- **Category** is no longer seeded or used. A product has a required **type**
  (`kind`): "Producto" or "Pack". A pack is an ordinary product with a different
  label, with no link to other products.
- The admin chooses the type instead of the category (Admin below).
- The public page lists products in two sections, "Productos" and "Packs" (Public
  site below).
- The header links read exactly **Productos · Packs · Cómo pedir · Colegios y
  grupos**. The "Trabajos" link is removed from the header (owner decision,
  2026-10-31); the "Real work" section itself stays.
- "Multiple categories per product" is no longer deferred: it is dropped.

Implemented in two steps (spec 001, migration plan): issue #64 (product type, admin,
public page, header; the `category` table stays unused) and issue #65 (the table is
dropped once #64 is in production).

### Admin: `/panel`

- **Sign-in** with email and password (Supabase Auth). One admin account, created
  by the developer and handed to Javiera. No sign-up page.

**2026-10-31 amendment - back to the public site (issue #79).** After "Salir" the
admin landed on `/entrar`, which had no link to the site, and the panel header had
none either: the owner had to type the site address again. The owner asked for all
three of these (2026-10-31):

- **"Salir" ends on the home page.** Sign-out stays a form POST to `/salir` and a
  full page load, but it now lands on `/` (it landed on `/entrar`), where the header
  link reads "Admin" (criterion 43).
- **"Ver sitio" in the panel header**, next to the panel's own links: it opens the
  home page and the admin stays signed in, so the header link there reads "Mi
  panel" (criterion 44).
- **"Volver al sitio" on `/entrar`**, above the sign-in form: it opens the home
  page (criterion 45).

Unchanged: after signing out, the browser's back button shows no panel data
(criterion 10), and a Google session also ends (spec 005, criterion 9).
- **Products:** list, create, edit, delete; set price, availability, highlighted,
  published; choose the ~~category~~ type, "Producto" or "Pack" (amended
  2026-10-31); upload and order photos with alt text. In the product list, packs
  carry a "Pack" badge and filters by type sit above it (amendment below,
  criteria 38 to 42).

**2026-10-31 amendment - telling packs apart in the panel (issue #72).** In the
product list a pack looked like any other product. The owner chose two of the
options on the design canvas (https://claude.ai/artifact/CxNPWpt77vxogi4pFHSPwW),
"A" and "D":

- **A, a "Pack" badge:** each pack carries a "Pack" badge, first in its row of
  badges (before "Publicado" or "Sin publicar"), a filled pill in the brand purple
  with a small stacked-layers icon and white text. A product carries no type
  badge.
- **D, filters with counts:** above the list, "Todos (n)", "Productos (n)" and
  "Packs (n)", counting every product of that type, published or not. Choosing one
  lists only that type. The choice lives in the address (`?tipo=producto` or
  `?tipo=pack`; none, or any other value, is "Todos"), so it works without
  JavaScript and survives a reload. Under "Todos" the list is split under the
  headings "Productos" and "Packs", in that order; a group with no items is not
  shown.

Before this amendment the list showed each product's type as text only
(criterion 32).
- ~~**Designs:** list, create, edit, delete; upload photos with alt text.~~
  Postponed 2026-10-31 (amendment below).

**2026-10-31 amendment - "Diseños" removed from the panel (issue #69).** The owner
decided to drop "Diseños" from the admin: "we are not going to use it now". It is
postponed, not cancelled, so only the panel changes:

- The panel menu and the panel home have no "Diseños" link, and `/panel/disenos`,
  `/panel/disenos/nuevo` and `/panel/disenos/<id>` answer 404 (criterion 37).
- The `design` table, its rows and photos, its row-level security and the shared
  admin code for designs stay as they are, so the screens can come back with a
  small change.
- The public "Real work" section keeps its rule: it shows only when a design is
  published. Production has none and the panel can no longer publish one, so it
  stays hidden; visitors see no change.

Implemented in issue #70. Before this amendment the admin managed designs
(criterion 9).
- Designed for a computer, usable on a phone.
- Out: roles, ~~category editing~~ (no categories since 2026-10-31), password reset flow beyond what Supabase gives by
  default, bulk actions, search.

### Public site

One page in Chilean Spanish (informal "tú"), reading from the database:

| Section | Content |
|---------|---------|
| **Header** | Logo, links that scroll to the sections, and a sign-in link: "Admin" for visitors (was "Entrar" until 2026-11-04), "Mi panel" for the signed-in admin (see criteria 27 to 31). Amended 2026-10-31: the section links are exactly "Productos", "Packs", "Cómo pedir" and "Colegios y grupos", in that order; "Productos" and "Packs" only show when their section is shown; there is no "Trabajos" link (criteria 34 and 35). Amended 2026-11-04 (issue #107): "Catálogo empresa" after "Packs", to `/empresas`, only when an Empresas item is published (criteria 69 and 70) |
| **Hero** | Logo or main image, the tagline "Marcamos tus ideas", a short line on what Marcando Ando personalizes, and a "Cotizar por WhatsApp" button (Req §3A) |
| **Products** | Published products of type "Producto" (amended 2026-10-31; before, all published products grouped by category): cover photo, name, price if set (amended 2026-10-31: "$7.000 c/u", no longer "desde $7.000"), and a "no disponible por ahora" notice with no button when unavailable. Highlighted products first. Each available product links to WhatsApp with a message naming it. Section heading "Productos", anchor `#productos` |
| **Packs** | Added 2026-10-31. Published products of type "Pack", shown and ordered exactly like the Products section. Section heading "Packs", anchor `#packs` |
| **Real work** | Published designs with their photos |
| **How to order** | Three short steps: tell us your idea, we send you a quote, we make it |
| **Schools and groups** | A short block for courses, generations and teams, with a WhatsApp button (Req §3E, reduced) |
| **Footer** | WhatsApp, Instagram `@marcando_ando`, and the email only if the owner confirms one |
| **Floating button** | A WhatsApp button always visible (Req §6) |

There is no search or filters at launch. ~~There are no separate product pages.~~ Each product has its own page since the 2026-10-31 amendment for issue #87 (below).

**2026-10-31 amendment - all of a product's photos on its card (issue #82).** The
admin could already give a product several photos, in an order, but each card showed
only the cover (the first photo by position). The owner asked that visitors can see
all of them, and chose option 1 of the design canvas
(https://claude.ai/artifact/A4u9PaJuwpbFUYzhr8mUw3), "swipe on the card":

- A card with **one photo looks as before**: no controls are added.
- A card with **several photos** keeps one 4:3 photo area and lets the visitor move
  through the photos **inside the card**, in the admin's order: previous and next
  buttons on the photo, a counter ("2 / 4") on the photo, a row of dots under it
  (each one a button to that photo), and sideways swipe on touch screens. Past the
  last photo it goes back to the first, and before the first to the last (confirmed by the owner when approving, 2026-10-31).
- Every photo keeps its own Spanish alt text. Only the first photo of a card loads
  with the page as today; the others load when the visitor moves to them (or just
  before), so the page stays as fast as it was.
- The same applies to products and packs. The rest of the card (name, price,
  availability, "Cotizar") does not change.

**2026-11-01 amendment - fast photo browsing (issue #98).** Javiera reported that
moving through a product's photos is slow the first time. Cause: the photos were
served as the stored 1.5 to 3 MB PNG files (about 1448 px wide, shown at about 350 px)
and the next photo was only requested when the visitor pressed next. Now:

- **Photos are stored resized.** When the admin uploads a photo, the server turns it
  into a WebP of at most 1000 px wide (never enlarged, upright by its EXIF
  orientation, no metadata), typically 30 to 100 KB. The 5 MB upload limit and the
  accepted types (JPG, PNG, WebP, AVIF) do not change; a file that is not really an
  image is refused with the usual Spanish message. Photos uploaded before this
  change are converted once with `scripts/optimize-photos.mjs` (run by the owner).
- **Neighbors are preloaded.** Once the photo on show has loaded, the next and the
  previous photo of that card or product page are requested, so they are ready when
  the visitor moves.
- **No empty gap.** The fixed 4:3 box is filled with the brand teal while a photo
  loads.
- Criterion 49 is changed: before, "the next photo is requested no earlier than when
  the visitor moves toward it"; now, only the first photo loads with the page, and
  the next and previous ones are requested after it has loaded.
- Not done, on purpose: serving through Next's image optimizer (`/_next/image`). It
  works with the `/img/...` route, but it keeps a copy of an image that was
  unpublished after the route starts answering 404 (checked on the production build:
  still served 10 minutes after unpublishing, with no end in sight), which would
  break the 5-minute window of criteria 25 and 26. The owner decided (2026-11-01)
  to keep that 5-minute window of `/img/...`.

**2026-10-31 amendment - a page per product, with colors, sizes and a link to share
(issue #87, approved by the owner on 2026-10-31).** Javiera's customers keep asking
which colors a product comes in and she answers with an image; she asked for a detail
view and a link she can send ("Feedback from Javiera: product details and a link to
share" in `docs/requirements.md`). From the design canvas
(https://claude.ai/artifact/7re5R2fp8YvJ4Hxa4Yk99y) the owner chose **A, a page per
product**, and that colors and sizes are lists (spec 001's amendment of the same
date). So:

- **The page.** Every published product and pack has a page at `/productos/<slug>`
  (the slug is spec 001's; it does not change when the name is edited). It shows, in
  this order: a link "Volver a productos" (or "Volver a packs" for a pack) to the
  home page's section, the photos (the same previous/next, counter, dots and swipe as
  the card, criteria 46 to 50), the name, the price ("$7.000 c/u"), the "no
  disponible por ahora" notice when unavailable, the colors, the sizes, the
  characteristics, the description, the "Cotizar por WhatsApp" button (same message
  as the card's). ~~and the "Copiar enlace" button~~ (removed from the page, see the
  2026-10-31 amendment for issue #100 below). A heading, list or row shows **only
  when it has content**: a product with no colors shows no "Colores" heading.
- **Colors** show as round swatches, each with its name written next to it (never
  color alone). **Sizes** show as pills. **Characteristics** show as a list, one item
  per line of the text.
- **From the card.** Each card gets a "Ver detalles" link (a link, since it goes to
  another page) after the price. Tapping the photo does not open the page, so swiping
  through photos stays free (issue #82). A screen reader hears "Ver detalles de
  <name>".
- **The link to share.** `https://<site>/productos/<slug>`. ~~"Copiar enlace" on the
  page copies it~~ The public page has no such button (issue #100 amendment below).
  In the panel's product list, every published product has a "Copiar enlace" button
  that copies it and says "Enlace copiado" (announced politely); if the browser
  refuses, the link shows in a text field, selected, so it can be copied by hand; an
  unpublished product has none, because its page is a 404.
- **Preview when shared.** The page has its own title ("<name> | Marcando Ando"), a
  description that includes the price and what it is, a canonical address, and the
  Open Graph tags (title, description, image = the cover photo as an absolute address,
  url) so WhatsApp and Instagram show a preview. Published product pages are listed
  in the site's sitemap, so Google can find them. The cover photo is served from
  `/img/<path>`; an unpublished product's photo is never served (criterion 25).
- **Not published, or unknown.** `/productos/<slug>` of an unpublished or missing
  product answers 404, as the rest of the public data does.
- **Admin form.** New optional fields on the product form: **Colores** (rows of a
  name and a color picker, "Agregar color" and "Quitar" per row), **Tamaños y tallas**
  (rows of a label, "Agregar" and "Quitar"), and **Características** (a text area,
  "una por línea"). Entry order is display order. Invalid values (a missing name, a
  color that is not `#RRGGBB`, more than 20 rows) show a Spanish error and save
  nothing. All appear on the public site without a deploy.
- **Out:** stock or inventory per color or size, variant prices, filtering by color or
  size, and a pop-up or in-card detail (options B and C, not chosen).
- **Seed and tests** use fake colors and sizes only.

Before this amendment a card showed a photo, name, price and "Cotizar", and nothing opened.

**2026-10-31 amendment - prices without "desde", and a wholesale note (issue #85).**
The owner asked to drop "desde" from the prices and to tell visitors that "al por
mayor es otro precio". From the options on the design canvas
(https://claude.ai/artifact/Wb1cYC8HEbMGHuEpgCnFvU) this amendment takes **B with the
"c/u" of D** (confirmed by the owner when approving, 2026-10-31):

- A card's price reads "$7.000 c/u" (per unit), in place of "desde $7.000". A product
  with no price still shows none, and no "c/u" either.
- One note, under the heading of the "Productos" section and of the "Packs" section:
  "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp." It shows
  once per section, not on every card.
- In the admin form, the label "Precio desde (CLP)" becomes "Precio (CLP)". The
  stored value (`price_from_clp`) and how it is typed do not change.
- The WhatsApp messages do not change.

Before this amendment the cards read "desde $7.000" (the Products row above).

**2026-11-04 amendment - "Catálogo empresa", a catalog for companies (issue #107,
approved by the owner on 2026-11-04).** Javiera: "Arriba, dónde sale producto" "Quiero otra sección que diga:
catálogos empresas" (her words in `docs/requirements.md`). The site has served
people (B2C); she also wants to sell to companies (B2B). The owner decided on
2026-11-04 (spec 000, decision 7; spec 001, `audience`):

- **Two catalogs.** Each product and pack belongs to one: **Personas** or
  **Empresas**. The home page's "Productos" and "Packs" sections list only
  Personas items, so the home page looks as it does today. Every existing item is
  Personas after the migration.
- **The header.** On every public page (home, `/productos/<slug>`, `/empresas`) the
  section links read exactly **Productos · Packs · Catálogo empresa · Cómo pedir ·
  Colegios y grupos**. "Productos" and "Packs" keep their rule (shown only when the
  home page has that section; they now count Personas items only). "Catálogo
  empresa" goes to `/empresas` and shows only when at least one Empresas item is
  published, so no link leads to an empty catalog. On `/empresas` it is marked as
  the current page (`aria-current="page"`).
- **The page `/empresas`.** In this order: the heading "Catálogo empresa"; one
  intro line, **"Poleras, polerones, tazones, botellas y regalos con el logo de tu
  empresa. Cotiza por volumen por WhatsApp."** (proposed copy, to confirm with
  Javiera; it names only products the business already makes); a "Cotizar por
  WhatsApp" button with the company message; then a "Productos" section
  (`#productos`) and a "Packs" section (`#packs`) with the published Empresas items
  of each kind, cards as on the home page, highlighted first. A section with no
  items is hidden. If no Empresas item is published, the page still answers with the
  heading, the intro line, the button and the line "Estamos preparando el catálogo
  para empresas. Escríbenos y te contamos." (so a link already sent never breaks),
  but the header has no link to it. The page has its own title ("Catálogo empresa
  | Marcando Ando"), description, canonical address and Open Graph tags, and is in the
  sitemap.
- **No prices for companies.** An Empresas card and page show no price and no "c/u",
  even when the admin has set one. In place of the home page's wholesale note, each
  section on `/empresas` has, right under its heading, once: **"Precios según
  cantidad: cotiza por WhatsApp."** The page's description and Open Graph tags carry
  no price either.
- **Product page of an Empresas item.** Same page as today at `/productos/<slug>`
  (the slug is unique across both catalogs), with no price; the back link reads
  "Volver a catálogo empresa" and goes to `/empresas#productos` (or `#packs` for a
  pack); the order button reads "Pedir por WhatsApp" and uses the company product
  message. A Personas item's page is unchanged.
- **WhatsApp messages for companies.** Same number. The general company message:
  "Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar. Te cuento qué
  necesitamos:". The company product message: "Hola, Marcando Ando. Escribo por mi
  empresa y quiero cotizar: <name>. Te cuento qué necesitamos:". On `/empresas` and
  on an Empresas product page the floating button uses the general company message;
  everywhere else every message stays as it is (criterion 55).
- **Admin.** The product form gets a required field **"Catálogo"**, with the options
  "Personas" and "Empresas" (radio buttons, like "Tipo"); a new product starts as
  "Personas". Next to the price field a hint says "En Catálogo empresa no se
  muestra el precio." when "Empresas" is chosen. In the product list, each Empresas
  item carries an "Empresas" badge (a filled brand-yellow pill with dark text, after the
  "Pack" badge when it has one; yellow since 2026-11-05, issue #118, see the amendment below); Personas items carry none. Above the type filters,
  a second row of filters, **"Todos los catálogos (n)", "Personas (n)" and "Empresas
  (n)"**, lives in the address as `?catalogo=personas` or `?catalogo=empresas` (none,
  or any other value, is all), works without JavaScript and combines with `?tipo=`:
  the type counts are counted within the chosen catalog. "Copiar enlace" works as
  for any published item.
- **Not decided, so not on the site:** minimum orders, lead times and invoicing
  ("factura") for companies (spec 000, item 6). Per the real-data rule they are left
  out, not shown as placeholders; they come back as an amendment once Javiera
  confirms them.
- **Out:** company accounts, online quotes, price tables by volume, one item in both
  catalogs (the admin duplicates it), downloadable PDF catalogs, and changing the
  hero, the "Cómo pedir" or the "Colegios y grupos" blocks.

Before this amendment there was one catalog and the header had four section links
(criterion 35). The look, header, footer, heading and "tú" copy of the company pages
described here are replaced by the 2026-11-12 amendment (issue #141) further down.

**2026-11-05 amendment - the "Empresas" badge is brand yellow (issue #118, approved by the owner on 2026-11-05).**
Javiera said the "Empresas" badge was sometimes too like the other badges. It was a
filled teal pill, close to the light-teal "Publicado" and "Disponible" status badges.
It is now a filled brand-yellow pill (`--brand-yellow`, `#F0B242`, the existing
palette token) with the same dark text and outline, so it differs from the teal and
gray status badges and the deep-purple "Pack" badge. Text, position (after "Pack")
and `data-testid="empresas-badge"` do not change. Criterion 79 now says yellow
instead of leaving the color open; the contrast of at least 4.5:1 stays.

**2026-11-05 amendment - rename "Catálogos empresas" to "Catálogo empresa" (issue #119, approved by the owner on 2026-11-05).** The visible name of the company catalog is now the singular, with the accent: "Catálogo empresa". Every mention in this spec and in spec 000 is changed (header link, `/empresas` heading, page title "Catálogo empresa | Marcando Ando", back link "Volver a catálogo empresa", the two hints in the product form). The URL `/empresas`, the audience value "Empresas" and the criteria numbers do not change; Javiera's original words in `docs/requirements.md` stay as she wrote them.

**2026-11-05 amendment - collection tabs on the home page: "Todos", "Especial Navidad", "Especial escolar" (issue #120, approved by the owner on 2026-11-05).**
Javiera: "Necesito secciones en la pagina principal de marcando ando, la actual que
dice "productos", es la seccion todos, tb deberia haber una seccion, "especial
navidad""especial escolar"" (her words in `docs/requirements.md`). The owner added
that the specials hold packs as well as products, and chose on 2026-11-05 the design
"Option A": tabs above the Productos and Packs sections.

- **The tabs.** On the home page, between the hero and the "Productos" section, a row
  of three links under the label "Colecciones" (`<nav aria-label="Colecciones">`,
  anchor `#colecciones`): **Todos**, **Especial Navidad**, **Especial escolar**, in
  that order. ~~Chosen tab: a dark filled pill, with `aria-current="page"`; the others,
  white pills with a dark outline.~~ Each is at least 44 px tall, in the site's rounded
  style. *(The look of the tabs is replaced by the 2026-11-06 amendment for issue #126
  below: illustrated pills, the chosen one marked with a soft yellow fill, a thicker
  outline and a shadow.)*
- **What each tab shows.** "Todos" (`/`) is the page as it is today: every published
  Personas product under "Productos" and every published Personas pack under "Packs".
  A special tab (`/?coleccion=navidad`, `/?coleccion=escolar`) shows only the
  published Personas items whose `collections` (spec 001) contain that collection,
  products under "Productos" and packs under "Packs", ordered as always
  (highlighted first). The headings, anchors (`#productos`, `#packs`) and the
  wholesale note do not change. A section with no item in the chosen tab is hidden,
  as today.
- **Nothing leads to nothing.** A special tab shows only when at least one published
  Personas item (product or pack) is in that collection. When neither special has an
  item, the row of tabs is not shown at all and the page is exactly as before this
  amendment. `?coleccion=` with an unknown value, or with a collection whose tab is
  not shown, behaves as "Todos".
- **Without JavaScript, and shareable.** The tabs are plain links that load the page
  with the choice in the address and end with `#colecciones`, so the visitor stays at
  the tabs instead of jumping to the top. Reloading, or sending the link on WhatsApp
  or Instagram, shows the same view. The page's title, description, canonical address
  (`/`), Open Graph tags and the sitemap are those of the home page for every tab:
  the tabs add no pages to the sitemap.
- **Everything is in "Todos".** An item in a collection is also in "Todos". An item
  in both collections appears in both tabs. An item in none appears only in "Todos".
  Unpublished items appear nowhere.
- **The header does not change.** The links stay "Productos · Packs · Catálogo
  empresa · Cómo pedir · Colegios y grupos" under the rules of criteria 35 and 69;
  they point to the sections of "Todos" (a visitor on a special tab who uses one
  returns to the page as it is without `coleccion`).
- **Empresas.** `/empresas` has no tabs and ignores `?coleccion=`; an Empresas item
  never appears on the home page, whatever its `collections` (criterion 68).
- **Admin.** The product form gets a **"Colecciones"** field with two checkboxes,
  "Especial Navidad" and "Especial escolar", none checked for a new item, with the
  hint **"Todos los productos salen siempre en «Todos»."** Saving writes the
  `collections` of spec 001. A change shows on the public page without a deploy. The
  product list gets no new badge or filter in this amendment.
- **Photos.** The school collection will show photos of children and school crests;
  the image-privacy rule (the "Privacy" constraint above, criteria 25 and 26, and
  `CLAUDE.md`) still holds: no photo with a minor's face or a school crest is
  published until the client confirms permission.
- **Out:** collections the admin creates, renames or deletes (the two are fixed in
  code, like `kind` and `audience`), a page or address per collection, a collection
  filter in the admin product list, a badge for collections in the list, tabs on
  `/empresas` or on a product page, a third special (Father's Day, World Cup 2026,
  St. Patrick's), and changing the card, prices, photos or WhatsApp buttons.

**2026-11-06 amendment - illustrated collection tabs (issue #126, approved by the
owner on 2026-11-06).** Javiera sent mockups of the tabs
(`assets/mockups/126/`, summary in `docs/requirements.md`): each tab a larger rounded
pill with an illustration on the left and the label on the right. The owner added
that no pill is dark, "Todos" included (in her mockup it is dark navy), and chose on
2026-11-06 the soft yellow fill for the chosen tab. This replaces only the look of the
tabs in the #120 amendment above; what each tab shows, the addresses, the
no-JavaScript behaviour, the hidden empty tab and criteria 82 to 89 do not change.

- **The pills.** Each tab is a rounded pill (fully rounded ends) with a 2 px
  night-blue outline (`--brand-night`, `#141824`), like the site's other outlined
  controls. The tabs that are not chosen have a white background (`#FFFFFF`). Inside,
  left to right: the illustration, then the label in the site's typeface, night blue,
  semibold. No tab has a dark filled background, whether chosen or not.
- **The illustrations.**

  | Tab | Illustration |
  |-----|--------------|
  | Todos | A white t-shirt, a bottle and a mug, with a yellow star, a pink heart on the mug and yellow spark strokes |
  | Especial Navidad | A smiling Santa, a Christmas tree with a star and a red present with a yellow ribbon |
  | Especial Escolar | A blue backpack with a star, red and blue books and a yellow pencil |

  They come from Javiera's mockups: each is cut out of `assets/mockups/126/` and saved
  as a transparent WebP in `public/img/` at twice its display size, at most 30 KB
  each **(interpretation)**. Ready cut-outs, 112 px tall and without the pill outline,
  are in `assets/mockups/126/illustrations/`. If a crop does not look clean, it is redrawn as an SVG in
  the same style and brand colours instead; no other artwork is invented. They are
  decorative: `alt=""` and no accessible name of their own, because the label already
  names the tab. The illustration has the same size in every tab, about 44 px tall at
  360 px and 56 px at 1280 px **(owner confirmed the sizes, with 44 px on phones, on
  2026-11-06)**, and is loaded eagerly (the tabs
  sit right under the hero), with its width and height set so nothing shifts as it
  loads.
- **The chosen tab** **(owner chose the soft yellow fill on 2026-11-06)**. It keeps
  `aria-current="page"` and stands out by more than colour: a soft yellow background
  (brand yellow `#F0B242` lightened to about `#FBEBC8` **(interpretation)**, defined
  as a CSS variable), a 3 px night-blue outline instead of 2 px, and the site's
  offset shadow (`3px 3px 0` night blue, as on "Cotizar por WhatsApp"). The others
  have a white background, the 2 px outline and no shadow. The keyboard focus ring
  (3 px purple, as everywhere on the site) stays visible on top of either look.
- **Labels.** Same order and links; the third label changes from "Especial escolar"
  to **"Especial Escolar"**, as in Javiera's mockup (owner decision, 2026-11-06), in
  the tab, the `lib/catalog/collection.ts` labels and every place that shows the
  collection name (criteria 82 to 89 read it that way from now on). At 360 px the
  pills wrap onto a second line instead of scrolling sideways, a two-word label may
  wrap inside its pill, and the row has no horizontal scroll.
- **Out:** illustrations anywhere else (header, sections, cards), animation, a new
  collection, and any change to what the tabs show or where they link.

Before this amendment the tabs were text-only pills and the chosen one was dark
filled with white text.

**2026-11-06 amendment - the catalog is served from a cache, refreshed when the
admin saves (issue #136, approved by the owner on 2026-11-06).** Javiera reported
that the site is slow to load (not the photo browsing fixed in #98). Measured in #129
and #134: after a few quiet minutes, every visit waits on Supabase, whose first
answer after a quiet period takes about 0.5 s (30 to 90 ms right after), so the
products appear about 2.7 s after a cold visit starts, against about 1.2 s warm.
Product pages also wait 0.6 to 1 s on the database check in `proxy.ts` before
anything shows, not even the header. Moving the functions next to the database
(#131) did not help. The catalog changes only when the admin saves, so it is built
once and served from Vercel's cache, and rebuilt when she saves.

- **What is cached.** The public catalog pages: the home page with its sections
  (Productos, Packs and the published designs) and its collection views (`/?coleccion=...`),
  `/empresas`, and every published product's page (`/productos/<slug>`). A visitor
  gets them from the cache without a database read. Before this amendment every
  visit read the catalog from the database (inside `<Suspense>`, after the page's
  shell).
- **Refreshed on every admin save.** Any panel action that changes what the public
  sees (creating, editing, publishing, unpublishing, marking unavailable or deleting
  a product or pack; changing its collections or audience; adding, editing, moving or
  deleting a photo) refreshes the cached pages it affects before the admin's next
  page load. Every criterion of this spec that says "without a deploy" still holds,
  word for word: the change shows on the next load. Only the first load after a
  save waits on the database, once.
- **Changes made outside the panel** (the Supabase dashboard, a script such as
  `scripts/optimize-photos.mjs`, a migration) show within 1 hour, with no deploy; a
  production deploy shows them at once. No visitor waits for that hourly refresh:
  the cached page is served while the new one is built.
- **Product pages keep their real 404** (criterion 60): an unknown or unpublished
  slug answers 404 with none of its data, and a product unpublished in the panel is
  a 404 on its next load. The check in `proxy.ts` that read the database before
  every product page is removed; the proxy guards only `/panel` again.
- **Unchanged:** every address (the collection tabs keep `/?coleccion=navidad` and
  `/?coleccion=escolar`, with the views, canonical address, sitemap and
  no-JavaScript behavior of criteria 82 to 89), what each page shows, and the header
  link "Admin" / "Mi panel" (criteria 27 to 31), which is still read per visit and
  makes no database call for a visitor without a session.
- **The build reads the catalog.** The production build fills the cache from the
  production database. A build that cannot read the database fails, so production
  keeps the previous deployment and never serves an empty catalog.
- **Goal (measured, not a criterion):** on the #129 phone profile, a cold visit to
  the home page shows the products in about the warm time (about 1.2 s, against
  2.7 s today), and a product page answers its first byte about as fast as the home
  page. Measured on production after each step and posted on #129.
- **Out:** the photo cache. `/img/...` keeps its 5-minute public cache and the
  unpublish window of criteria 25 and 26, decided by the owner on 2026-11-01. A
  longer photo cache needs a way to purge a photo from Vercel's CDN the moment it is
  unpublished (photos of children may be withdrawn), which has to be tried first. It
  will be its own amendment after that spike. Also out: keeping Supabase awake with
  scheduled pings, and moving the Supabase project.

**2026-11-12 amendment - a corporate look for the company pages (issue #141, approved
by the owner on 2026-11-12).** Javiera: "quiero que la web de empresas tenga
otro look que la web de individuos, que tenga un look mas corporativo" (her words in
`docs/requirements.md`). Until now the company catalog used the people's look
(cream, Fredoka, dark outlines, offset shadows, four bright colors) and addressed the
visitor as "tú". The owner decided on 2026-11-12: everything a company sees gets a
corporate look, option A ("Clásico") of the design options; the company pages say
"usted"; there is a new company logo; and the people's header marks the link to the
company catalog with a briefcase icon (option 3). The people's site does not change
otherwise.

- **The company pages.** `/empresas` and the page `/productos/<slug>` of every
  Empresas item (available or not), each as a whole: header, content, footer and the
  floating WhatsApp button. Every other page (the home page and its collection views,
  Personas product pages, `/entrar`, `/panel`, the 404 page) keeps today's look.
- **The logo.** "Marcando Ando · Soluciones corporativas": a navy wordmark with a
  gold "M" mark, from `assets/logo-empresas.png` (2172×724, white background). The
  site serves it as `public/img/logo-empresas.webp`, at twice its display size and
  at most 40 KB **(interpretation)**, with `width` and `height` set and loaded
  eagerly. It is about 44 px tall at 360 px and 64 px at 1280 px **(interpretation)**,
  its alt text is "Marcando Ando, soluciones corporativas", and it links to
  `/empresas`. Its white background sits on the white header, so no transparent
  version is needed for this look. The people's logo does not appear on the company
  pages. The browser-tab icon and the social-sharing image stay as they are
  **(interpretation)**.
- **Colors**, as CSS variables on `:root` with a `--corp-` prefix, next to the
  people's `--brand-` ones:

  | Variable | Value | Used for | Contrast |
  |----------|-------|----------|----------|
  | `--corp-navy` | `#0B1B3F` | Text, headings, buttons, outlines, the call-to-action band | 16.9:1 on white |
  | `--corp-navy-deep` | `#07122B` | Footer background | |
  | `--corp-gold` | `#B8862B` | Decoration only: short rules, step numbers (24 px or larger, bold), the top edge of pack cards, the button on the navy band (navy text on it: 5.2:1) | 3.2:1 on white, so never small text |
  | `--corp-gold-text` | `#8A6417` | Gold text at any size (the eyebrow line, text links) | 5.4:1 on white, 5.0:1 on the light gray |
  | `--corp-gold-light` | `#E2C07A` | Links in the footer | 10.7:1 on the footer |
  | `--corp-gray` | `#F5F6F9` | Background of alternate sections and of a photo box while it loads | |
  | `--corp-line` | `#E4E7EE` | 1 px outlines of cards and the header's bottom line | |
  | `--corp-body` | `#3B4559` | Body text | 8.9:1 on the light gray |
  | `--corp-muted` | `#5A6478` | Secondary text (notes, "Web para personas") | 5.5:1 on the light gray |

  The page background is white (`#FFFFFF`). No pink, yellow, teal or purple on the
  company pages.
- **Type.** Montserrat (600 to 800) for headings, the header links and buttons;
  Inter (400 to 600) for body text; both from Google Fonts through `next/font`, and
  downloaded only on the company pages **(interpretation)**. Fredoka is not used on
  them.
- **Shapes.** Buttons have 6 px corners and cards 8 px; cards and the header have 1 px
  `--corp-line` outlines. No 2 px dark outlines, no offset shadows and no fully
  rounded pills (those are the people's style). The keyboard focus ring stays visible
  (3 px, in `--corp-navy` on light backgrounds and white on navy).
- **The header of the company pages.** White, with a 1 px bottom line. Left: the
  company logo. Then the links, in this order: **Productos** (`/empresas#productos`),
  **Packs** (`/empresas#packs`), **Cómo cotizar** (`/empresas#cotizar`), **Web para
  personas** (`/`, in `--corp-muted`), a navy **"Cotizar por WhatsApp"** button with
  the general company message, and the sign-in link ("Admin" / "Mi panel",
  criteria 27 to 31, in the corporate style). "Productos" and "Packs" show only when
  `/empresas` has that section. At 360 px the links wrap onto more lines; there is no
  horizontal scroll. This replaces, on the company pages, the five links of the
  2026-11-04 amendment; the people's pages keep those five.
- **The page `/empresas`**, in this order:
  1. **Hero**, on light gray: the eyebrow line "Catálogo empresa" (small capitals,
     `--corp-gold-text`); the heading **"Productos personalizados con el logo de su
     empresa"** (proposed copy, to confirm with Javiera); a short gold rule; the intro
     line **"Poleras, polerones, tazones, botellas y regalos corporativos. Cotice por
     volumen por WhatsApp."** (proposed copy; it names only products the business
     already makes); the buttons "Cotizar por WhatsApp" (navy, general company
     message) and "Ver productos" (navy outline, to `#productos`, only when that
     section exists). The design options show a photo next to the text; per the
     real-data rule there is no photo and no placeholder until Javiera sends one, and
     the text then takes the full width.
  2. **Categories:** one line, "Poleras · Polerones · Tazones · Botellas · Regalos
     corporativos", plain text with gold dots, not links **(interpretation)**.
  3. **Productos** (`#productos`) and **Packs** (`#packs`, light gray): each heading,
     then once the note **"Precios según cantidad: cotice por WhatsApp."**, then the
     cards. A card shows what it shows today (photos, name, badges, "Ver", criterion 71
     and the #101 amendment), in the corporate style: white, 1 px outline, 8 px
     corners, the name in Montserrat; a pack card has a 3 px gold top edge. A section
     with no items is hidden, as before.
  4. **Cómo cotizar** (`#cotizar`): three numbered steps (proposed copy, to confirm
     with Javiera): **01 "Escríbanos"**, "Cuéntenos por WhatsApp qué productos
     necesita y cuántas unidades."; **02 "Envíe su logo"**, "Revisamos el diseño con
     usted antes de producir."; **03 "Reciba su cotización"**, "Le respondemos con el
     precio según la cantidad." Lead times are not mentioned: they are not confirmed
     (2026-11-04 amendment).
  5. **Call-to-action band**, navy: "¿Necesita productos con el logo de su empresa?"
     and a gold "Cotizar por WhatsApp" button (navy text, general company message).

  With no published Empresas item, the page shows the hero, the line **"Estamos
  preparando el catálogo para empresas. Escríbanos y le contamos."**, "Cómo cotizar"
  and the band, and no "Ver productos" button.
- **The page of an Empresas item.** Same content and order as today (photos, details,
  back link "Volver a catálogo empresa", "Pedir por WhatsApp", "no disponible por
  ahora"), in the corporate colors, type and shapes, with the company header and
  footer. The photo box fills with `--corp-gray` while a photo loads, instead of
  teal.
- **The footer of the company pages.** On `--corp-navy-deep`: "Marcando Ando ·
  Soluciones corporativas", the WhatsApp link (same number, general company message)
  and the Instagram link, the same facts as today's footer. The people's tagline
  "Marcamos tus ideas." is not shown.
- **The floating WhatsApp button** on the company pages: a navy circle with a white
  icon, a 1 px white outline and no offset shadow. Same place, size, label and
  message as before (criterion 75).
- **"Usted" on the company pages.** All visible text that addresses the visitor uses
  "usted". Changed: the intro line and the empty-catalog line (above), the section
  note ("cotiza" becomes "cotice"), and the page description and Open Graph
  description of `/empresas`: "Poleras, polerones, tazones, botellas y regalos
  corporativos con el logo de su empresa. Cotice por volumen por WhatsApp." The
  WhatsApp messages are written in the customer's voice to the business, so they do
  not change **(interpretation, open question 9)**. The people's pages keep "tú".
- **The link from the people's site.** On the people's pages the header link
  "Catálogo empresa" keeps its place, size, typeface and pill shape, and gains a 2 px
  `--corp-navy` outline, navy text and a briefcase icon before the text (an inline
  stroke SVG, 16 px, `aria-hidden="true"`). Its accessible name stays "Catálogo
  empresa". The other header links do not change. No banner or strip is added
  (option 4 was declined).
- **How it is built** **(interpretation)**. A theme, not a second site: the company
  pages set a theme on their root element, the `--corp-` variables drive the shared
  components (cards, sections, product page), and the company header, footer and
  hero are their own components. No new framework or UI library (ADR-0001). The
  design options are on the owner's Claude Design canvas (option A is the reference;
  option B, "Ejecutivo oscuro", and C, "Minimalista editorial", were not chosen).
  *Implementation note (issue #145):* `next/font` declares a font for every route
  that imports it, so the page of an Empresas item is its own internal route
  (`/empresa-producto/<slug>`) to which the proxy rewrites `/productos/<slug>`
  (the address does not change); asked for directly, that route answers 404. This
  keeps Montserrat and Inter off the people's product pages (criterion 104).
- **Out:** any other change to the people's look; a separate domain or subdomain;
  a hero photo (until Javiera sends one); minimum orders, lead times, invoicing or
  company clients; the WhatsApp messages; the admin panel's look; the browser-tab
  icon and the social-sharing image.

Before this amendment the company pages used the people's look, header, footer and
"tú" copy; criteria 69, 71, 72 and 73 are amended to match (marked there).

**2026-11-12 amendment - the company logo next to the people's logo (issue #148,
approved by the owner on 2026-11-12).** The owner asked on 2026-11-12 for the corporate logo to sit beside the main
Marcando Ando logo in the people's header, and to lead to `/empresas` when clicked.
Javiera sent a version of the company logo with a transparent background the same
day, so it can sit on the people's cream header. The owner chose variant A of the
mockups (Claude Design canvas "Logo empresas en el header"): the two logos side by
side with a thin line between them, and the menu link "Catálogo empresa" kept.

- **The logo file.** `assets/logo-empresas.png` is replaced by Javiera's transparent
  version (same design, 2172×724, transparent background). The site file
  `public/img/logo-empresas.webp` is made from it, cropped to the drawn logo (the
  original has a wide empty margin), with its transparency kept. One file serves both
  headers.
- **In the people's header** (the home page and its collection views, Personas
  product pages): after the people's logo come a decorative vertical line (1 px,
  `--brand-night` at 35% opacity, `aria-hidden`, about two thirds of the logo's
  height) and the company logo, about 32 px tall below 768 px and 40 px tall from
  768 px **(interpretation)**. The company logo is a link to `/empresas` with the alt
  text "Marcando Ando, soluciones corporativas" and a visible focus ring. The people's
  logo keeps its size and its link to `#inicio`. The menu does not change: the
  "Catálogo empresa" link with its briefcase stays (criterion 110).
- **When it shows.** Only when at least one Empresas item is published, the same rule
  as the menu link (criterion 70) **(approved by the owner on 2026-11-12)**. When it appears after the catalog loads, the
  header does not change height (criterion 67).
- **Layout.** At 360 px both logos fit on one row, with the menu below as today. Where
  the logos and the menu do not fit on one row, the menu wraps to a row below the
  logos, as it does on phones today **(interpretation: at 1280 px the header's
  1024 px content width is, by a rough estimate to be measured in the implementation, about 90 px too narrow for both logos and the five links
  on one row, so the header gets a second row there; widening the header to 1152 px
  was the alternative; the owner approved the second row on 2026-11-12)**. No horizontal scroll at any width.
- **In the company header**, the cropped file shows the drawn logo at the same size as
  before: about 28 px tall at 360 px and 40 px from 768 px, instead of 44 and 64 px
  for the uncropped file **(interpretation)**. Nothing else on the company pages
  changes.
- **Out:** changing either logo's design; a logo or line in the footers; the admin
  panel; the company pages' header otherwise.

Criterion 111 is amended to match (marked there), and the logo bullet of the
amendment above ("no transparent version is needed") is superseded by this one.

**2026-11-12 amendment - the company logo as tall as the people's logo, stacked on
phones, at a cache-safe address (issue #153, draft).** After the #148 change went live
the owner found the company logo too small next to the people's logo (32 and 40 px
tall against 64 and 80 px) and saw the old logo (white box, uncropped) in their
browser. The served file was correct; the browser had kept its cached copy because
the new file had the same address, `/img/logo-empresas.webp`. The owner chose on
2026-11-12 (Claude Design canvas "Logo empresas en el header", artboard "Elegida
(#153)"):

- **From 768 px:** the company logo is as tall as the people's logo (80 px), on the
  same row, with the decorative line between them (about 56 px tall). The menu stays
  on the row below.
- **Below 768 px:** a company logo as tall as the people's logo cannot fit beside it
  (about 307 px wide at 64 px tall, next to a 140 px logo, in about 328 px). So the
  company logo goes on its own row **under** the people's logo, left-aligned with it,
  **as wide as the people's logo** (about 140 px wide, about 30 px tall), with no
  line. The menu comes below it.
- **The address of the logo changes with the file.** Both headers load the company
  logo through a static import (as the people's logo already is), so it is served
  from `/_next/static/media/` with a content hash in its name, and a new version of
  the file reaches browsers that cached an old one. The file stays
  `public/img/logo-empresas.webp` in the repo.
- **The file** has at least 160 px of height (twice the 80 px display) and stays at
  most 40 KB, transparent and cropped (criteria 111 and 116).
- Unchanged: when it shows (criterion 114), no height change when it streams in
  (criterion 115), the link and focus ring (criterion 113), the company header's
  look and logo size (criterion 117), the people's logo and the menu.

Criteria 111 and 112 are amended to match (marked there); the sizes and the
one-row layout at 360 px in the #148 amendment above are superseded by this one.

## Constraints

Inherited from spec 000 and `CLAUDE.md`, restated where they bite:

- **Real data only.** Prices appear only if the owner confirms them. A missing fact
  is left out of the live page, not shown as a placeholder. Seed data is for local
  development and tests only and never reaches production.
- **Privacy.** No photo showing a minor's face or a school crest goes live. The
  owner chooses the photos and confirms it.

  **2026-10-25 amendment - private image storage (issue #45).** The `images`
  bucket was public and its read policy let anyone fetch or list every file, so a
  photo of an unpublished product or design (for example one waiting for the
  owner's permission) was readable by anyone who listed the bucket or knew the
  path. Now the bucket is private and storage reads follow the owner's published
  state: an object is readable only by the admin, or by anyone when an `image`
  row with that `storage_path` belongs to a published product or design. The site
  serves published images from its own origin at `/img/<storage_path>` (read with
  the anonymous client, so row-level security decides; short public cache), and
  the admin previews any image at `/panel/img/<storage_path>` (`private,
  no-store`). A CDN may keep serving an image for up to the cache window (5
  minutes) after the owner unpublishes it. Before this, the spec was silent on
  storage reads.
- **WhatsApp link.** `https://wa.me/56982661835` (confirmed 2026-10-23). Every
  ordering button uses it, with a pre-filled Spanish message.
- **Security.** The admin area and every write are protected by the admin check and
  by row-level security, and both are tested. The service-role key is never sent to
  the browser. No credentials in the repo.
- **Performance.** Uploaded images are limited in size and served optimized
  (WebP/AVIF, sensible dimensions); lazy loading except in the hero.
- **Accessibility.** Semantic HTML, `lang="es"`, Spanish `alt` on every image (the
  admin cannot save an image without it), good contrast, keyboard access.
- **Responsive.** Phone, tablet, computer.
- **Brand.** Logo and palette from `CLAUDE.md`, colors as CSS variables on `:root`.
  The company pages have their own logo, palette and type (2026-11-12 amendment,
  issue #141).
- **Local development.** Runs entirely on the developer machine with local Supabase
  in Docker, migrations from day one (spec 000).
- **Ownership.** Accounts start under the owner's; handover to Javiera is part of v1.

## Acceptance criteria

**Data and security** (these are spec 001's criteria for the tables above)

1. Spec 001's criteria 1, 3, 5, 6, 8, 13, 15, 16, 18, 19, 20, 22 and 23,
   restricted to Product, Design and Image, pass against local Supabase.

   **2026-10-31 amendment.** Category is removed from the list of tables, and spec
   001's new product-type criteria 22 and 23 are added.
2. Given production, when the database is inspected, then it holds only real
   content: no seed rows.

**Admin**

3. Given a visitor who is not signed in, when they open `/panel` or any panel route,
   then they are sent to the sign-in page and see no data.
4. Given the admin's correct email and password, when they sign in, then they reach
   the panel; given a wrong password, then they see a clear Spanish error and stay
   signed out.
5. Given a signed-in user who is not the admin, when they open the panel or try to
   write, then they are refused.
6. Given the admin, when they create a product with name, price, type and a
   photo with alt text and publish it, then it appears on the public page without a
   deploy, in the section of its type.

   **2026-10-31 amendment.** "Category" is replaced by "type" (Producto or Pack),
   and the product appears in the section of its type.
7. Given a published product, when the admin changes its price, then the public page
   shows the new price; when they mark it unavailable, then it shows the notice and
   no WhatsApp button; when they unpublish or delete it, then it disappears.
8. Given the admin, when they try to save an image above the size limit or of a type
   that is not allowed, then it is refused with a clear message.
   **2026-11-05 amendment (issue #117).** The alt text is no longer required: Javiera
   only wants to add the photo. Criterion 8 used to also refuse an image without alt
   text; that part is replaced by criteria 90 to 92. The size and type refusals are
   unchanged.
9. ~~Given the admin, when they create, edit and delete a design with photos, then
   the "Real work" section reflects it.~~ **Retired 2026-10-31 (issue #69):** the
   panel no longer manages designs (criterion 37).
10. Given the admin signs out, when they press the browser's back button, then the
    panel does not show data.

**Public page**

11. Given the page loads, when the visitor looks at the top, then the logo, the
    tagline and a "Cotizar por WhatsApp" button are visible without scrolling on a
    360 px wide screen.
12. Given the page, when it is read, then every section in the table is present in
    order, and all visible text is Spanish; a section with no content (for example no
    designs yet) is hidden instead of shown empty.
13. Given any ordering or floating button, when activated, then it opens
    `https://wa.me/56982661835` with a pre-filled Spanish message, and a product's
    message names that product.
14. Given the Instagram link, when activated, then it opens
    `https://www.instagram.com/marcando_ando`.
15. Given the footer, when no email is confirmed, then no email or placeholder
    appears.
16. Given every image, when checked, then it has Spanish `alt` text.

**Quality and delivery**

17. Given the page at 360, 768 and 1280 px, when opened, then there is no horizontal
    scroll and the floating button covers no content that cannot be reached.
18. Given the page, when navigated with the keyboard only, then every link and button
    can be reached with a visible focus.
19. Given the page and the panel, when an automated accessibility check runs, then it
    reports no serious or critical violations.
20. Given production, when the page and the panel are used, then the console shows no
    errors and no request fails.
21. Given a mobile connection profile, when the page is measured, then the largest
    content shows in under 2.5 s with no visible layout shift.
22. Given `marcandoando.cl` and `www.marcandoando.cl`, when opened, then both serve
    the site over HTTPS with a valid certificate, and one redirects to the other.
23. Given the page's head, when inspected, then it has a title, a description, Open
    Graph tags with a preview image, a favicon and `lang="es"`.
24. Given a merge to `main` that changes the app and the owner has accepted the
    deployment (spec 004), when the deploy finishes, then production is updated, and
    migrations have been applied to the production database.

    **2026-10-25 amendment.** This criterion first said production updates on every
    merge. The owner decided that nothing reaches production before they accept it;
    the pipeline is specified in [spec 004](004-deployment.md).

**Image privacy** (added 2026-10-25, issue #45)

25. Given an image whose product or design is not published, when the public (not
    signed in, or signed in but not the admin) tries to read it by listing the
    bucket, by its direct storage URL or at `/img/<path>`, then it is refused (not
    listed, not downloadable, 404).
26. Given the admin, when they open `/panel/img/<path>` for any image, then they
    get it, uncached; and given an image of a published product or design, when a
    visitor opens `/img/<path>`, then it is served with a short public cache
    header.

**Sign-in link in the header** (added 2026-10-29, issue #57)

**2026-10-29 amendment - visible sign-in link.** The only way into the admin was to
type `/entrar`, because nothing on the home page linked to it. The owner asked for a
visible entry in the header, labelled "Entrar", and "Mi panel" when the admin is
signed in. Hiding the address was never the protection: the login and the database
rules are, and they do not change. The link is shown to everyone, including
customers.

27. Given a visitor who is not signed in, when the home page loads, then the header
    shows a link labelled "Admin" that goes to `/entrar`, visible without scrolling
    at 360 px and at 1280 px, reachable with the keyboard with a visible focus.
28. Given the admin signed in, when the home page loads, then the header link reads
    "Mi panel" and goes to `/panel`.
29. Given a user who is signed in but is not the admin, when the home page loads,
    then the header link reads "Admin", and nothing reveals who is signed in.
30. Given the admin who signs out through `/salir`, when they return to the home
    page, then the link reads "Admin" again.
31. Given the home page, when the session cannot be read or takes long, then the link
    shows "Admin", the hero and the other sections are not delayed or broken, and
    the header does not shift the layout when the label changes to "Mi panel".

**2026-11-04 amendment - "Admin" label (issue #109).** Only the admin signs in, so
"Entrar" invited customers to click something that is not for them. The owner asked
for the visitor's header link to read "Admin" instead. Criteria 27, 29, 30, 31 and 43
now say "Admin"; "Mi panel" for the admin is unchanged. The `/entrar` page (its
heading, title and "Entrar" submit button) and the route are unchanged.

**Productos and Packs** (added 2026-10-31, issue #63)

32. Given the admin creating or editing a product, when they open the form, then it
    has a required "Tipo" field with the options "Producto" and "Pack" and no
    "Categoría" field; a new product starts as "Producto"; and the product list in
    the panel shows each product's type.
33. Given published products of both types, when the home page loads, then the
    "Productos" section lists only the products of type "Producto" and the "Packs"
    section, right after it, lists only those of type "Pack"; in each, highlighted
    products come first; and no category name or category heading appears anywhere
    on the page.
34. Given no published product of one type, when the home page loads, then that
    type's section is not shown and its header link is not shown, and the other
    type's section and link are.
35. Given the home page with published products of both types and published
    designs, when the header is read, then its section links are exactly
    "Productos", "Packs", "Cómo pedir" and "Colegios y grupos", in that order, each
    going to its section (`#productos`, `#packs`, `#como-pedir`, `#colegios`); there
    is no "Trabajos" link; and the links fit without horizontal scroll at 360 px and
    1280 px.
36. Given the admin, when they change a published product's type from "Producto"
    to "Pack", then the home page shows it in the "Packs" section and no longer in
    "Productos", without a deploy.

**No "Diseños" in the panel** (added 2026-10-31, issue #69)

37. Given the admin signed in, when they open the panel, then neither the panel
    menu nor the panel home shows a "Diseños" link; and when they open
    `/panel/disenos`, `/panel/disenos/nuevo` or `/panel/disenos/<id>` of an existing
    design, then they get the "not found" page and no design data; a visitor who is
    not signed in is still sent to the sign-in page from those addresses.

**Packs in the panel list** (added 2026-10-31, issue #72)

38. Given products of both types, when the admin opens the product list, then each
    pack shows a "Pack" badge first in its row of badges and no product shows one;
    the badge's text has a contrast of at least 4.5:1 and its icon is hidden from
    screen readers.
39. Given 3 products and 2 packs, published or not, when the admin opens the product
    list, then the filters read "Todos (5)", "Productos (3)" and "Packs (2)".
40. Given the product list, when the admin chooses "Packs" (or "Productos"), then the
    address ends in `?tipo=pack` (or `?tipo=producto`), only that type is listed, and
    a reload keeps the choice; when the address has no `tipo` or an unknown value,
    then "Todos" is chosen.
41. Given "Todos", when the list shows, then the items are grouped under the headings
    "Productos" and then "Packs", and a group with no items has no heading; given a
    chosen type with no items, then the list says so in Spanish instead of showing
    nothing (for example "Todavía no hay packs.").
42. Given the filters, when they are used with the keyboard only, then each can be
    reached and chosen with a visible focus, the chosen one is announced as current
    (`aria-current="page"`), and at 360 px the filters wrap with no horizontal
    scroll.

**Back to the public site** (added 2026-10-31, issue #79)

43. Given the admin signed in, when they press "Salir" in the panel, then they land
    on the home page (`/`) after a full page load, signed out: the header link reads
    "Admin", and opening `/panel` sends them to `/entrar`.
44. Given the admin signed in, when they open the panel at 360 px or 1280 px, then
    its header has a link "Ver sitio" that can be reached with the keyboard; when
    they follow it, then they reach the home page still signed in, and its header
    link reads "Mi panel".
45. Given a visitor on `/entrar`, signed in or not, when the page shows, then a link
    "Volver al sitio" above the sign-in form leads to the home page, can be reached
    with the keyboard, and keeps the page free of horizontal scroll at 360 px.

**All of a product's photos on its card** (added 2026-10-31, issue #82)

46. Given a published product or pack with one photo, when the home page loads, then
    its card shows that photo and no previous or next button, counter or dots.
47. Given a published product with four photos, when the home page loads, then its
    card shows the first photo by position, the counter "1 / 4", buttons labelled
    "Foto anterior" and "Foto siguiente", and four dots; when the visitor presses
    "Foto siguiente", then the second photo shows and the counter reads "2 / 4"; when
    they press the third dot ("Ver foto 3"), then the third photo shows and that dot
    is marked as current; and from the fourth photo, "Foto siguiente" shows the
    first again (from the first, "Foto anterior" shows the fourth).
48. Given a card with several photos on a touch screen, when the visitor swipes the
    photo sideways, then the next or previous photo shows, as with the buttons.
49. Given a card (or a product page) with several photos, when the page loads, then
    only its first photo is requested; after that photo has loaded, the next and the
    previous photo are requested (so they are ready when the visitor moves), and no
    other; every photo has its own Spanish alt text; and changing photos does not
    change the size of the card (no layout shift). (Amended 2026-11-01, issue #98.)
50. Given the photo controls, when they are used with the keyboard only, then each
    can be reached and pressed with a visible focus, each is at least 44 by 44 px,
    their labels are in Spanish, and at 360 px the page has no horizontal scroll.
51. Given a product that is not published, when a visitor asks for any of its photos
    at `/img/<path>`, then they are refused as in criterion 25.

**Prices without "desde", and the wholesale note** (added 2026-10-31, issue #85)

52. Given a published product with price 7000, when the home page loads, then its card
    shows "$7.000 c/u", with a dot as thousands separator; the word "desde" appears
    nowhere on the public page; and a product without a price shows no price and no
    "c/u".
53. Given the "Productos" or "Packs" section is shown, when the visitor reads it, then
    right under its heading there is, once, the note "Precios por unidad. Al por mayor
    es otro precio: cotiza por WhatsApp.", with a text contrast of at least 4.5:1 and
    no horizontal scroll at 360 px.
54. Given the admin creating or editing a product, when they look at the price field,
    then its label reads "Precio (CLP)" and not "Precio desde (CLP)", and a price typed
    as "7.000" is still saved as 7000.
55. Given a product page's "Pedir por WhatsApp" button and the floating WhatsApp
    button, when they are followed, then the pre-filled messages are the same as before
    this amendment (reworded 2026-10-31, issue #101: the card's "Cotizar" button became
    the "Ver" link).

**2026-10-31 amendment - "Ver" on the card, "Pedir por WhatsApp" on the page (issue
#101, approved by the owner by merging).** Javiera: "Cotizar" makes no sense on the
home page (it should say "Ver"), and on the product page "Cotizar por WhatsApp" should
say "Pedir por WhatsApp" (her words in `docs/requirements.md`). The owner chose that
each card has one action. So (copy and one link only):

- **Card.** The WhatsApp button "Cotizar" is replaced by a button-styled link "Ver"
  that goes to `/productos/<slug>`; the separate "Ver detalles" link is removed. The
  card no longer has a WhatsApp button: ordering happens on the product page and
  through the hero and the floating button. A screen reader hears "Ver <name>". An
  unavailable product's card still shows "no disponible por ahora" and also "Ver", so
  its page can be opened.
- **Product page.** The button reads "Pedir por WhatsApp". The pre-filled WhatsApp
  messages do not change. An unavailable product still shows "no disponible por ahora"
  and no order button.
- **Unchanged.** The hero ("Cotizar por WhatsApp", which spec 004's smoke test looks
  for), the floating button, the footer and the "Colegios y grupos" block.
- Criteria 55 to 59 are reworded to the new words (60 is about the 404 and does not
  name a button). Where older text of this spec says "Cotizar" or "Ver detalles" for a
  card or the product page, this amendment supersedes it.

**2026-10-31 amendment - no "Copiar enlace" on the public page (issue #100, approved
by the owner by merging).** "Copiar enlace" is a tool for Javiera, who copies a
product's link in the panel to send it to customers (her request in #87). A visitor
can already copy the address from the browser or use the phone's share button, so the
button is removed from `/productos/<slug>`, with no empty space, spacing or focus stop
left where it was. The panel button stays as it was (criterion 63, now written out in
full). The link format, the preview tags and the rest of the page do not change. The
component is shared, so it stays for the panel.

**A page per product, with colors, sizes and a link to share** (added 2026-10-31, issue #87)

56. Given a published product or pack, when the home page loads, then its card has a
    link "Ver" (and no "Ver detalles" link and no WhatsApp button) that goes to
    `/productos/<slug>`, can be reached and pressed with the keyboard with a visible
    focus, is at least 44 by 44 px, and is announced as "Ver <name>"; and pressing the
    photo itself does not leave the page. An unavailable product's card also has it.
57. Given a published product with a price of 7000, three photos, colors Rosado
    (`#E8647F`) and Celeste (`#4FB0B0`), sizes "4", "6" and "8", and two lines of
    characteristics, when a visitor opens `/productos/<slug>`, then they see the
    name, "$7.000 c/u", the photos with the controls of criteria 46 to 50, the two
    colors as swatches with their names written, the three sizes in that order, the
    characteristics as a list of two items, and the "Pedir por WhatsApp" button
    whose message names the product as on the card.
58. Given a published product with no colors, no sizes, no characteristics and no
    price, when a visitor opens its page, then it shows no "Colores", "Tamaños y
    tallas" or "Características" heading and no price, and still shows the name, the
    photos and the "Pedir por WhatsApp" button.
59. Given a published product marked unavailable, when a visitor opens its page,
    then it shows "no disponible por ahora" and no "Pedir por WhatsApp" button.
60. Given an unpublished product, or a slug that does not exist, when a visitor opens
    `/productos/<slug>`, then the answer is 404 and none of its data or photos is
    shown (a photo asked at `/img/<path>` is refused, criterion 25).
61. Given a published product, when its page is requested, then its `<title>` is
    "<name> | Marcando Ando", it has a description that includes the price when there
    is one, a canonical address, and the Open Graph tags `og:title`, `og:description`,
    `og:url` and `og:image`, the last one the absolute address of the cover photo and
    absent when the product has no photo; and the sitemap lists the page of every
    published product and none of an unpublished one.
62. ~~Given a product page, when the visitor presses "Copiar enlace", then
    `https://<site>/productos/<slug>` is on the clipboard and the text "Enlace
    copiado" is announced; when the browser refuses to copy, then the link shows in a
    text field, selected, instead.~~ Amended (issue #100): Given a published product
    page, when it loads, then it has no "Copiar enlace" button, no "Enlace copiado"
    text and no link text field, and no empty space, spacing or focus stop where the
    button was; the photos, price, colors, sizes, characteristics and "Pedir por
    WhatsApp" are as before.
63. Given the admin looking at the product list in the panel, when a product is
    published, then its row has a "Copiar enlace" button, and when pressed
    `https://<site>/productos/<slug>` is on the clipboard and the text "Enlace
    copiado" is announced, and when the browser refuses to copy, the link shows in a
    text field, selected, instead; when the product is not published, then its row has
    none.
64. Given the admin on the product form, when they add the colors Rosado `#E8647F` and
    Celeste `#4FB0B0`, the sizes "4" and "6", and the characteristics "100% algodón"
    and "Estampado con vinilo", and save, then the public page shows them in that
    order without a deploy; when they remove a color and save, it disappears; when
    they leave a color without a name, choose a color that is not `#RRGGBB` or add a
    21st row, then a Spanish error shows and nothing is saved; and every one of these
    fields is optional.
65. Given a product page at 360 px and at 1280 px, when it loads and is used with the
    keyboard only, then there is no horizontal scroll, every control can be reached
    with a visible focus and is at least 44 by 44 px, labels and alt text are in
    Spanish, text contrast is at least 4.5:1, the color names carry the meaning (the
    swatches alone do not), axe reports nothing, and "Volver a productos" (or "Volver
    a packs") leads to that section of the home page.
66. Given a link already shared, when the admin edits the product's name, price,
    photos, colors, sizes or characteristics, then `/productos/<slug>` still opens
    that product; the slug does not change unless the admin changes it on purpose.

**Bigger logo** (added 2026-10-31, issue #99)

Javiera: "el icono de la pagina es muy pequeno, necesita ser agrandado".

67. Given the home page at 360 px and at 1280 px, when it loads, then the header logo
    is at least 56 px tall on a phone and 72 px tall on desktop, is served with at
    least as many pixels as it shows, keeps its Spanish alt text, and the header
    still has no horizontal scroll and does not change height on reload; and the
    browser-tab icon is the logo cropped to its drawing (it spans at least 95% of the
    icon's width), so it reads at 32 px.

**Catálogo empresa** (added 2026-11-04, issue #107)

68. Given published Personas and Empresas items of both kinds, when the home page
    loads, then its "Productos" and "Packs" sections list only the Personas items,
    and no Empresas item appears on the home page.
69. Given at least one published Empresas item, when the home page, a product page
    or `/empresas` loads, then the header's section links are exactly "Productos",
    "Packs", "Catálogo empresa", "Cómo pedir" and "Colegios y grupos", in that
    order; "Catálogo empresa" goes to `/empresas`; on `/empresas` it has
    `aria-current="page"`; and the links fit without horizontal scroll at 360 px and
    1280 px. (Criterion 35 is extended: the links are those five when an Empresas item
    is published, and its four otherwise.) (Amended 2026-11-12, issue #141: this
    holds for the people's pages; the company pages have their own header,
    criterion 105.)
70. Given no published Empresas item, when any public page loads, then the header has
    no "Catálogo empresa" link, and the other links follow criteria 34 and 35.
71. Given published Empresas items of both kinds, when a visitor opens `/empresas`,
    then they see, in order, the heading "Catálogo empresa", the intro line, a
    "Cotizar por WhatsApp" button, a "Productos" section with only the Empresas
    products and a "Packs" section with only the Empresas packs, highlighted items
    first in each; and a kind with no published Empresas item has no section.
    (Amended 2026-11-12, issue #141: "Catálogo empresa" is now the eyebrow line above
    the heading "Productos personalizados con el logo de su empresa", and the page
    has more sections; the full order is criterion 106.)
72. Given no published Empresas item, when a visitor opens `/empresas`, then the page
    answers 200 with the heading, the intro line, the button and the line "Estamos
    preparando el catálogo para empresas. Escríbenos y te contamos.", and no
    "Productos" or "Packs" section. (Amended 2026-11-12, issue #141: the line now
    reads "Estamos preparando el catálogo para empresas. Escríbanos y le contamos.",
    criterion 107.)
73. Given an Empresas item with price 7000, when its card on `/empresas` and its page
    at `/productos/<slug>` load, then neither shows "$7.000", "c/u" or any price, and
    the page's description and Open Graph tags contain no price; and each section on
    `/empresas` has, once, right under its heading, "Precios según cantidad: cotiza por
    WhatsApp." with a contrast of at least 4.5:1, and not the home page's wholesale
    note. (Amended 2026-11-12, issue #141: the note now reads "Precios según
    cantidad: cotice por WhatsApp.", criterion 107.)
74. Given an available Empresas item, when a visitor opens its page, then the back
    link reads "Volver a catálogo empresa" and goes to `/empresas#productos` (or
    `/empresas#packs` for a pack), and "Pedir por WhatsApp" opens
    `https://wa.me/56982661835` with the message "Hola, Marcando Ando. Escribo por mi
    empresa y quiero cotizar: <name>. Te cuento qué necesitamos:"; an unavailable one
    shows "no disponible por ahora" and no order button (criterion 59).
75. Given `/empresas` or an Empresas product page, when the visitor follows the
    "Cotizar por WhatsApp" button of `/empresas` or the floating button, then it opens
    `https://wa.me/56982661835` with "Hola, Marcando Ando. Escribo por mi empresa y
    quiero cotizar. Te cuento qué necesitamos:"; and on the home page and on a
    Personas product page every WhatsApp message is unchanged (criterion 55).
76. Given `/empresas`, when its head is read, then its title is "Catálogo empresa |
    Marcando Ando" and it has a description, a canonical address and the Open Graph
    tags `og:title`, `og:description` and `og:url`; and the sitemap lists `/empresas`
    and the page of every published Empresas item, and none of an unpublished one.
77. Given `/empresas` and an Empresas product page at 360 px and at 1280 px, when they
    load and are used with the keyboard only, then there is no horizontal scroll,
    every control can be reached with a visible focus and is at least 44 by 44 px, all
    visible text and alt text is Spanish, and axe reports no serious or critical
    violation.
78. Given the admin creating or editing a product or pack, when they open the form,
    then it has a required "Catálogo" field with the options "Personas" and
    "Empresas", a new item starts as "Personas", and choosing "Empresas" shows the
    hint "En Catálogo empresa no se muestra el precio." next to the price; when they
    save a published item as "Empresas", then it appears on `/empresas` in the section
    of its kind and no longer on the home page, without a deploy; and moving it back
    to "Personas" reverses that.
79. Given 3 Personas items and 2 Empresas items, one of them a pack, published or not,
    when the admin opens the product list, then each Empresas item shows an "Empresas"
    badge (after "Pack" when it is a pack) that is a filled brand-yellow pill (the
    `--brand-yellow` color, not teal, purple or gray, so it stands apart from the
    status and Pack badges) with a text contrast of at least 4.5:1 and
    no Personas item shows one; and the catalog filters read "Todos los catálogos
    (5)", "Personas (3)" and "Empresas (2)".
80. Given the product list, when the admin chooses "Empresas" (or "Personas"), then
    the address has `?catalogo=empresas` (or `?catalogo=personas`), only that catalog's
    items are listed, the type filters count within it and keep their own choice
    (`?catalogo=empresas&tipo=pack` lists only Empresas packs), and a reload keeps
    both; when `catalogo` is missing or unknown, all catalogs are listed.
81. Given the catalog filters, when they are used with the keyboard only, then each
    can be reached and chosen with a visible focus, the chosen one has
    `aria-current="page"`, and at 360 px the filters wrap with no horizontal scroll.

**Collection tabs** (added 2026-11-05, issue #120)

82. Given published Personas items: a product and a pack in "Especial Navidad", a
    product in "Especial escolar", and a product and a pack in no collection, when a
    visitor opens the home page with no `coleccion`, then the row labelled
    "Colecciones" shows the tabs "Todos", "Especial Navidad" and "Especial escolar" in
    that order, between the hero and "Productos", "Todos" has `aria-current="page"`,
    and "Productos" and "Packs" list all five items as they did before this
    amendment.
83. Given the same items, when the visitor opens `/?coleccion=navidad`, then
    "Especial Navidad" has `aria-current="page"`, "Productos" lists only that
    collection's product and "Packs" only its pack; and when they open
    `/?coleccion=escolar`, then "Productos" lists only its product and the "Packs"
    section is hidden because it has none.
84. Given an unknown value (`/?coleccion=otra`), or `/?coleccion=escolar` when no
    published Personas item is in "Especial escolar", when the home page opens, then
    it shows "Todos"; and given no published Personas item in either collection, then
    no row of tabs is shown and the page is the same as before this amendment.
85. Given an item in both collections, an item in none, an unpublished item in a
    collection, and an Empresas item in "Especial Navidad", when each view is opened,
    then the first appears in both tabs and in "Todos", the second only in "Todos",
    the third nowhere, and the fourth never on the home page; and `/empresas?coleccion=navidad`
    lists every published Empresas item and has no tabs.
86. Given the tabs, when JavaScript is turned off and a visitor chooses "Especial
    Navidad", then the address is `/?coleccion=navidad#colecciones`, the view is that
    collection with the tabs still in view, and loading the same address again, or in
    another browser, shows the same view; and the page's title, description,
    canonical address and the sitemap are those of the home page.
87. Given the tabs at 360 px and at 1280 px, when the page is used with the keyboard
    only, then each tab can be reached and chosen with a visible focus and is at least
    44 by 44 px, the chosen one has `aria-current="page"`, the page has no horizontal
    scroll (the tabs wrap or scroll inside their own row), all visible text is
    Spanish, text contrast is at least 4.5:1, and axe reports no serious or critical
    violation.
88. Given the admin creating or editing a product or pack, when they open the form,
    then it has a "Colecciones" field with the checkboxes "Especial Navidad" and
    "Especial escolar", none checked for a new item, and the hint "Todos los
    productos salen siempre en «Todos»."; when they save a published Personas item
    with "Especial Navidad" checked, then it appears under that tab, and still under
    "Todos", without a deploy; and when they uncheck it and save, then it is gone
    from that tab and stays in "Todos".
89. Given the header on the home page with a special tab chosen, when a visitor
    reads and uses it, then its links are those of criteria 35 and 69 and "Productos"
    and "Packs" point to `#productos` and `#packs` of the page without `coleccion`.

**Optional alt text (amendment of 2026-11-05, issue #117; approved by the owner on
2026-11-05).** The "Texto alternativo" field of a photo is optional, for products, packs
and designs (they share the form). When it is left empty (or only spaces) the app stores
the Spanish default "Foto de {name}", with the name of the product or pack, or the title
of the design, at the moment of saving. The database constraint (alt text not empty) is
unchanged, so every `<img>` keeps a non-empty Spanish `alt` (criterion 16). The stored
default is not updated if the item is renamed later; the admin can type another text.

90. Given the admin on a product, pack or design, when they upload a photo and leave
    the alt text empty (or with only spaces), then the upload succeeds, the photo is
    stored with the alt text "Foto de {name}", and the public page shows it with that
    `alt`; when they write an alt text, then it is stored and shown as before.
91. Given a saved photo, when the admin empties its alt text and saves, then it is saved
    with "Foto de {name}" and no error is shown.
92. Given the photo form, when the admin opens it, then the field "Texto alternativo de
    la foto nueva" is not marked required (no `aria-required`), and its hint says it is
    optional and what is used when it is empty ("Opcional. Si lo dejas vacío, se usa
    «Foto de {nombre}».").

**Illustrated collection tabs (amendment of 2026-11-06, issue #126; approved by
the owner on 2026-11-06).** Criteria 82 to 89 still hold; these add the look of the tabs.

93. Given the collection tabs on the home page, when a visitor sees them at 360 px and
    at 1280 px, then each of "Todos", "Especial Navidad" and "Especial Escolar" is a
    pill with a night-blue outline, with its own illustration (the table in the
    2026-11-06 amendment) to the left of its label, the three illustrations the same
    height, a white background when not chosen, and no tab, chosen or not, with a dark
    background.
94. Given any tab chosen ("Todos" at `/`, "Especial Navidad" at `/?coleccion=navidad`,
    "Especial Escolar" at `/?coleccion=escolar`), when the visitor reads the row, then
    only that tab has `aria-current="page"`, the soft yellow background, the 3 px
    outline and the offset shadow, and the other tabs have a white background, the
    2 px outline and no shadow.
95. Given the tabs, when they are read by a screen reader or the accessibility tree,
    then each illustration has `alt=""`, the accessible name of each tab is exactly its
    label, and every illustration is a file under `/img/` of at most 30 KB with its
    width and height set.
96. Given the tabs at 360 px and at 1280 px, when the page is used with the keyboard
    only, then each tab is at least 44 by 44 px with a visible focus, the page has no
    horizontal scroll, label text contrast is at least 4.5:1 and the outlines at least
    3:1 against the background, the tabs at 1280 px fit on one line, and axe reports
    no serious or critical violation.

**Catalog served from a cache (amendment of 2026-11-06, issue #136; approved by
the owner on 2026-11-06).** Every other criterion still holds, including each one that
says "without a deploy".

97. Given the production server with published items, when `/`,
    `/?coleccion=navidad`, `/empresas` or a published product's page has been loaded
    once and a product's name is then changed directly in the database (not through
    the panel), when the same page is loaded again, then it still shows the old name;
    and on production, the second request for each of those pages is answered from
    Vercel's cache (`x-vercel-cache` is `HIT`, `STALE` or `PRERENDER`).
98. Given those pages cached, when the admin, in the panel, renames a product, edits
    its price, publishes or unpublishes it, marks it unavailable, changes its
    collections or audience, deletes it, or adds, edits, moves or deletes one of its
    photos, then the next load of each affected page (the home page and its
    collection views, `/empresas`, the product's page) shows the change.
99. Given a change made directly in the database, when the cached page is older than
    1 hour, then the next loads show the change (the first may still show the old
    page while the new one is built); and given a production deploy, then the change
    shows as soon as it is live.
100. Given a published product whose page has been loaded, when the admin unpublishes
     it in the panel, then its page answers 404 with none of its data on the next
     load; and given an unknown slug, then it answers 404 (criterion 60 unchanged).
101. Given any request to a public page, when it is answered, then no database read
     runs before the response starts: the proxy's matcher covers only `/panel` and
     `/panel/*`, and a product page has no `Server-Timing` entry from the proxy.
102. Given a production build whose Supabase URL or key is wrong or unreachable,
     when the build runs, then it fails, instead of producing pages with an empty
     catalog.

**Corporate look for the company pages (amendment of 2026-11-12, issue #141; approved
by the owner on 2026-11-12).** "Company pages" are `/empresas` and the page of
every Empresas item; "people's pages" are every other public page. Criterion 77
(no horizontal scroll, keyboard, 44 px, Spanish, axe) still holds for the company
pages in their new look.

103. Given a published Empresas item, when `/empresas` and its product page load at
     360 px and at 1280 px, then the header shows the company logo
     (`/img/logo-empresas.webp`, alt "Marcando Ando, soluciones corporativas",
     linking to `/empresas`) and not the people's logo; headings, header links and
     buttons are set in Montserrat and body text in Inter; the page background is
     white; and no button or card has an offset shadow or a 2 px dark outline.
104. Given the home page, a collection view (`/?coleccion=navidad`) and a Personas
     product page, when they load, then they look as before this amendment (the
     people's logo, Fredoka, the cream background, the people's header and footer),
     and no Montserrat or Inter font file is requested.
105. Given published Empresas products and packs, when a company page loads, then its
     header links are exactly "Productos", "Packs", "Cómo cotizar", "Web para
     personas", "Cotizar por WhatsApp" and the sign-in link ("Admin" or "Mi panel"),
     in that order; they go to `/empresas#productos`, `/empresas#packs`,
     `/empresas#cotizar`, `/` and `https://wa.me/56982661835` with the general company
     message; "Productos" (or "Packs") is missing when `/empresas` has no such
     section; and at 360 px the header has no horizontal scroll.
106. Given published Empresas items of both kinds, when a visitor opens `/empresas`,
     then they see, in order: the eyebrow "Catálogo empresa"; one `h1`, "Productos
     personalizados con el logo de su empresa"; the intro line; the buttons
     "Cotizar por WhatsApp" and "Ver productos" (to `#productos`); the categories line;
     the "Productos" and "Packs" sections (criterion 71); "Cómo cotizar" (`#cotizar`)
     with its three steps; the navy band with "¿Necesita productos con el logo de su
     empresa?" and "Cotizar por WhatsApp"; and the footer. The hero has no image.
107. Given the company pages, when their visible text is read, then the intro line is
     "Poleras, polerones, tazones, botellas y regalos corporativos. Cotice por volumen
     por WhatsApp.", each section's note is "Precios según cantidad: cotice por
     WhatsApp.", the empty-catalog line is "Estamos preparando el catálogo para
     empresas. Escríbanos y le contamos.", the `/empresas` description and
     `og:description` are "Poleras, polerones, tazones, botellas y regalos
     corporativos con el logo de su empresa. Cotice por volumen por WhatsApp.", and no
     visible text contains the words "tú", "tu", "tus", "te", "cotiza", "escríbenos"
     or "cuéntanos"; and the people's pages keep their texts (criterion 55 and the
     home page's wholesale note unchanged).
108. Given the company pages, when their styles are read, then the variables
     `--corp-navy` `#0B1B3F`, `--corp-navy-deep` `#07122B`, `--corp-gold` `#B8862B`,
     `--corp-gold-text` `#8A6417`, `--corp-gold-light` `#E2C07A`, `--corp-gray`
     `#F5F6F9`, `--corp-line` `#E4E7EE`, `--corp-body` `#3B4559` and `--corp-muted`
     `#5A6478` are defined on `:root`; no text smaller than 24 px is colored
     `--corp-gold`; every text has a contrast of at least 4.5:1 (3:1 at 24 px or
     larger) against its background; and no pink, yellow, teal or purple brand color
     is used.
109. Given a company page, when its footer and floating button are read, then the
     footer is on `--corp-navy-deep` with "Marcando Ando · Soluciones corporativas",
     the WhatsApp link (general company message) and the Instagram link, and without
     "Marcamos tus ideas."; and the floating button is a navy circle with a white icon
     and no offset shadow, with the label and message of criterion 75.
110. Given at least one published Empresas item, when a people's page loads at 360 px
     and at 1280 px, then its "Catálogo empresa" link has a 2 px `--corp-navy`
     outline, navy text and a decorative briefcase icon (`aria-hidden="true"`)
     before the text; its accessible name is exactly "Catálogo empresa"; the other
     header links look as before; and the header has no horizontal scroll.
111. Given `public/img/logo-empresas.webp`, when it is checked, then it is at most
     40 KB, has at least twice the pixels it is shown at on a 1280 px screen, and the
     `<img>` has `width` and `height` set and is not lazy loaded. *(Amended 2026-11-12, issue #148: "shown at" means the larger of the
     two headers it appears in, the people's and the company's; the file is cropped and
     transparent, criterion 116.)* *(Amended 2026-11-12, issue #153: the largest display
     is 80 px tall in the people's header, so the file has at least 160 px of height.)*
112. Given at least one published Empresas item, when the home page, a collection view
     (`/?coleccion=navidad`) or a Personas product page loads at 360 px and at
     1280 px, then the header shows, in order, the people's logo (link to `#inicio`),
     a decorative line (`aria-hidden="true"`) and the company logo
     `/img/logo-empresas.webp`, a link to `/empresas` whose accessible name is
     "Marcando Ando, soluciones corporativas"; the company logo is next to the
     people's logo on the same row, about 32 px tall at 360 px and 40 px tall at
     1280 px; and the people's logo has the same size as before.
     *(Amended 2026-11-12, issue #153: the sizes, the one-row layout at 360 px and the
     address `/img/logo-empresas.webp` are replaced by criteria 118, 119 and 120.)*
113. Given the people's header, when the company logo link is clicked, then the
     browser opens `/empresas`; and when it is reached with the keyboard, then it
     shows a visible focus ring.
114. Given no published Empresas item, when a people's page loads, then neither the
     company logo nor the line is in the header, and the header looks as before.
115. Given the people's header at 360 px and at 1280 px, when the catalog finishes
     loading and the company logo appears, then the header's height does not change
     (criterion 67), the page has no horizontal scroll, and every link is at least
     44 px tall or wide where criterion 18 requires it; axe reports no violation.
116. Given `public/img/logo-empresas.webp`, when it is checked, then it has a
     transparent background (its corner pixels are fully transparent) and less than
     10% of its height and width is empty margin around the drawn logo.
117. Given a company page, when it loads at 360 px and at 1280 px, then its header
     logo is about 28 px tall at 360 px and 40 px tall at 1280 px, and the company
     header otherwise looks as in criterion 105.
118. Given at least one published Empresas item, when a people's page loads at
     1280 px (and at any width from 768 px), then the company logo is on the same row
     as the people's logo, after the decorative line, and its rendered height equals
     the people's logo's height (80 px, within 2 px).
119. Given at least one published Empresas item, when a people's page loads at 360 px
     (and at any width below 768 px), then the company logo is on its own row directly
     under the people's logo, its left edge aligned with it (within 2 px), its
     rendered width equals the people's logo's width (within 2 px), the decorative
     line is not displayed, the menu is below the company logo, and the page has no
     horizontal scroll.
120. Given the people's header and the company header, when the company logo's `<img>`
     is read, then its `src` is not `/img/logo-empresas.webp` but an address under
     `/_next/static/media/` whose file name carries a content hash, and that address
     answers 200 with a WebP image.


| # | Criterion | Layer |
|---|-----------|-------|
| 1, 5, 8 (size) | Constraints, RLS, non-admin refused | Integration (Vitest) against local Supabase, as anonymous, non-admin and admin |
| 13 | WhatsApp URL and message builder | Unit (Vitest), pure function |
| 3, 4, 6, 7, 10 | Admin flows | End to end (Playwright) against local Supabase (9 retired 2026-10-31) |
| 11, 12, 14–18 | Public page, layout, keyboard | End to end (Playwright) at 360, 768 and 1280 px |
| 19, 21 | Accessibility, performance | axe and Lighthouse on the preview deploy |
| 25 | Storage read policy: unpublished images not readable or listable | Integration (Vitest) against local Supabase, as anonymous, non-admin and admin; end to end for `/img/...` |
| 26 | `/panel/img/...` for the admin, `/img/...` with cache headers | Unit (URL helper), integration (storage), end to end (Playwright) |
| 27, 31 | Link visible and stable at 360 and 1280 px, keyboard, no layout shift, fallback label | End to end (Playwright) with axe |
| 32, 36 | Type field in the admin, moving a product between sections | End to end (Playwright) against local Supabase; a unit test for the form input parser (type required, only the two values) |
| 33, 34 | Two sections by type, empty type hidden | Unit test for the pure grouping function; end to end (Playwright) at 360 and 1280 px with axe |
| 35 | Header links | End to end (Playwright) at 360 and 1280 px with axe |
| 37 | No "Diseños" in the panel, its addresses answer 404 | End to end (Playwright) at 360 and 1280 px, as the admin and as a visitor |
| 39, 40, 41 | Counting, reading the filter from the address, grouping | Unit test for the pure function that counts, filters and groups the list; end to end for the address and the reload |
| 38, 41, 42 | Badge, headings, empty message, keyboard, no horizontal scroll | End to end (Playwright) at 360 and 1280 px against local Supabase, with axe |
| 46, 47 | One photo shows no controls; several photos: counter, buttons, dots, going round | Unit test for the pure helper that orders the photos and computes the next and previous index; end to end (Playwright) at 360 and 1280 px against local Supabase with seeded photos, with axe |
| 48 | Swipe | End to end (Playwright) with touch emulation on the 360 px project |
| 49 | First photo only on load, neighbors preloaded, alt text, no layout shift | Unit tests for the helper that names the photos to preload and for the resizing of an upload; integration test that an uploaded photo is stored as a WebP of at most 1000 px; end to end: the network requests on load name only each card's first photo, then the next and previous one, before the visitor presses next; alt text per photo; the card's box keeps its size when the photo changes |
| 50 | Keyboard, focus, 44 px targets, no horizontal scroll | End to end (Playwright) at 360 and 1280 px with axe |
| 51 | Unpublished photos stay private | Covered by the criterion 25 tests, extended to a product's second and later photos |
| 52, 53 | Price "$7.000 c/u", no "desde", the note once per section | Unit test for the price label helper; end to end (Playwright) at 360 and 1280 px with axe |
| 54 | Admin price label | End to end (Playwright); the existing price parser unit tests stay |
| 55 | WhatsApp messages unchanged | The existing unit tests of the message builder stay green |
| 56 | "Ver" link on the card, photo does not navigate | End to end (Playwright) at 360 and 1280 px, with axe |
| 57, 58, 59 | Page content, only fields with content, unavailable | End to end (Playwright) at 360 and 1280 px against local Supabase with seeded fake colors, sizes and characteristics; a unit test for the pure helper that turns the characteristics text into items and the list into what the page shows |
| 60 | 404 for unpublished or unknown | End to end (Playwright); integration for the data being hidden (spec 001 criterion 13) |
| 61 | Title, description, Open Graph tags, sitemap | Unit test for the pure metadata builder; end to end that reads the tags and the sitemap of the running server |
| 62 | No "Copiar enlace" on the public page | End to end (Playwright) at 360 and 1280 px: no button, text or field, "Pedir por WhatsApp" still there |
| 63 | "Copiar enlace" in the panel and its fallback | Unit test for the pure link builder; end to end (Playwright) as a throwaway admin, clipboard stubbed to work and to refuse |
| 64 | Admin fields: save, order, remove, errors, optional | End to end (Playwright) against local Supabase as a throwaway admin; unit tests for the form parser (spec 001 criteria 24 to 26 share it) |
| 65 | Responsive, keyboard, contrast, axe, back link | End to end (Playwright) at 360 and 1280 px with axe |
| 67 | Logo size, sharpness, header fit, tab icon crop | End to end (Playwright) at 360 and 1280 px with axe (header tests) |
| 66 | The link survives edits | End to end (Playwright), or integration on the slug staying the same after an update |
| 43, 44, 45 | "Salir" ends on the home page, "Ver sitio", "Volver al sitio" | End to end (Playwright) at 360 and 1280 px against local Supabase, as a throwaway admin (signing out ends every session of that user); criterion 10 and spec 005 criterion 9 keep their tests |
| 28, 29, 30 | Label by session: admin, non-admin, after sign-out | End to end (Playwright) against local Supabase, as the throwaway admin and the seeded non-admin; a unit test for the pure function that picks the label and the target |
| 2, 20, 22, 23, 24 | Production state, console, DNS, SSL, metadata, deploy | Manual checklist on the live site, plus Vercel deploy status |
| 68, 71, 72 | Home page lists Personas only; `/empresas` sections, order, empty state | Unit test for the pure grouping function, extended by audience; end to end (Playwright) at 360 and 1280 px against local Supabase with seeded Empresas items, with axe |
| 69, 70 | Header links with and without Empresas items, `aria-current` | End to end (Playwright) at 360 and 1280 px with axe; the empty case unpublishes the seeded Empresas items in the test and restores them |
| 73 | No price for Empresas, the company note | Unit test for the price label helper (no label for Empresas); end to end (Playwright) at 360 and 1280 px |
| 74, 75 | Back link and company WhatsApp messages | Unit tests for the message builder (company general and product messages, Personas messages unchanged); end to end (Playwright) reading the links' `href` |
| 76 | `/empresas` metadata and sitemap | Unit test for the pure metadata builder; end to end that reads the tags and the sitemap of the running server |
| 77 | Responsive, keyboard, 44 px, Spanish, axe | End to end (Playwright) at 360 and 1280 px with axe |
| 78 | "Catálogo" field, hint, moving an item between catalogs | End to end (Playwright) against local Supabase as a throwaway admin; a unit test for the form input parser (catalog required, only the two values) |
| 79, 80 | Badge, counts, filter from the address, combined with `tipo` | Unit test for the pure function that counts, filters and groups the list; end to end (Playwright) for the address and the reload |
| 81 | Catalog filters by keyboard, wrapping at 360 px | End to end (Playwright) at 360 and 1280 px with axe |
| 82, 83, 84, 85 | Tabs, what each shows, unknown or empty collection, membership rules | Unit test for the pure function that picks the collection from the address and filters and groups the items (extending the grouping function of criteria 33 and 68); end to end (Playwright) at 360 and 1280 px against local Supabase with seeded fake items, with axe; the empty case unpublishes the seeded items in the test and restores them |
| 86 | Works without JavaScript, shareable, home page metadata and sitemap | End to end (Playwright) with JavaScript disabled, reading the address, the tags and the sitemap of the running server |
| 87 | Keyboard, 44 px, `aria-current`, no horizontal scroll, contrast, axe | End to end (Playwright) at 360 and 1280 px with axe |
| 88 | "Colecciones" field, hint, saving, showing and removing without a deploy | End to end (Playwright) against local Supabase as a throwaway admin; a unit test for the form input parser (only the two values, none allowed) |
| 89 | Header unchanged on a special tab | End to end (Playwright) reading the links' `href` at 360 and 1280 px |
| 90, 91, 92 | Optional alt text, default "Foto de {name}", hint | Unit test for the pure default function; integration test (Vitest) that products and designs store the default on upload and on edit; end to end (Playwright) uploading without alt text and reading the public `alt` |
| 93, 94 | Illustrated pills, chosen tab by soft yellow fill, thicker outline and shadow | End to end (Playwright) at 360 and 1280 px against local Supabase with the seeded collections, reading each tab's image, computed background, border width and shadow for each of the three addresses; screenshots attached to the PR |
| 95 | Decorative illustrations, accessible names, file size and dimensions | End to end (Playwright) reading `alt`, the accessible name and the `width`/`height` attributes; a unit test that checks the size of the files in `public/img/` |
| 96 | Keyboard, 44 px, no horizontal scroll, contrast, one line at 1280 px, axe | End to end (Playwright) at 360 and 1280 px with axe |
| 97 | Pages served from the cache, not re-read from the database | End to end (Playwright) on the production server (`CI=1`) against local Supabase: a direct database change does not show; smoke test (spec 004) reads `x-vercel-cache` on production |
| 98 | Every panel action that changes the public view refreshes it at once | End to end (Playwright) as a throwaway admin, one step per action, on the production server |
| 99 | Changes outside the panel show within 1 hour | Unit test of the cache lifetime setting (at most 1 hour); not waited out in end to end |
| 100 | Unpublish gives a 404 at once; unknown slug 404 | End to end (Playwright) on the production server |
| 101 | No database read before the response; proxy guards only `/panel` | Unit test of the proxy matcher; end to end reading the product page's `Server-Timing` |
| 102 | A build that cannot read the database fails | A CI step builds with an unreachable Supabase URL and expects the build to fail |
| 103, 104 | Company pages in the corporate look; people's pages unchanged, no corporate fonts loaded | End to end (Playwright) at 360 and 1280 px against local Supabase, reading the logo, computed font families, backgrounds, borders and shadows, and the font requests of each page; screenshots attached to the PR |
| 105 | Company header links, order, targets, hidden empty sections | End to end (Playwright) at 360 and 1280 px, with and without Empresas packs |
| 106 | Order of the `/empresas` sections, one `h1`, no hero image | End to end (Playwright) reading the landmarks and headings in document order |
| 107 | "Usted" copy and the words list | Unit tests for the copy constants and the metadata builder; end to end reading the visible text of `/empresas` and an Empresas product page |
| 108 | `--corp-` variables, gold not used for small text, contrast, no people's colors | End to end (Playwright) reading the computed styles, with axe for contrast |
| 109 | Company footer and floating button | End to end (Playwright) reading the footer text, links, colors and the button's `href` |
| 110 | Briefcase icon on the people's "Catálogo empresa" link | End to end (Playwright) at 360 and 1280 px with axe, reading the accessible name and `aria-hidden` |
| 111 | Company logo file size, pixels, `width`/`height`, eager | Unit test of the file in `public/img/`; end to end reading the `<img>` attributes |
| 112, 113, 114 | Company logo beside the people's logo, link, focus, hidden without Empresas items | End to end (Playwright) at 360 and 1280 px against local Supabase, with and without a published Empresas item (isolated test for the empty case) |
| 115 | No height change when the logo streams in, no horizontal scroll, axe | End to end (Playwright) at 360 and 1280 px, measuring the header before and after the catalog loads, with axe |
| 116 | Transparent, cropped logo file | Unit test reading `public/img/logo-empresas.webp` with sharp (corner alpha, trimmed margins) |
| 117 | Company header logo size with the cropped file | End to end (Playwright) at 360 and 1280 px reading the `<img>` box |
| 118, 119 | Company logo as tall as the people's logo from 768 px; stacked and as wide below | End to end (Playwright) at 360 and 1280 px against local Supabase, reading both logos' boxes and the line's display |
| 120 | Content-hashed logo address in both headers | End to end (Playwright) reading the `src` of the `<img>` in the people's and the company header and requesting it |

Final check before announcing: on a real phone, sign in as the admin, add a product
with a photo, see it on the public page, tap every button, and send one real WhatsApp
message to the business number. Then delete the test product.

## Dependencies and blockers

| Item | Who | Needed by |
|------|-----|-----------|
| Approval of this spec and of spec 001's launch subset | Owner | Friday night |
| Node upgrade on the developer machine (Node 16 is too old) and the Supabase CLI | Owner | Friday night |
| Supabase project for production, and its plan: the free plan pauses an idle project, so a paid plan is likely needed for a live business site (ADR-0001, "to verify") | Owner | Saturday |
| Vercel plan: confirm the account used for `duplaweb` may host a business site (ADR-0001, "to verify") | Owner | Saturday |
| Photos for the first products and designs, clean files without minors' faces or crests | Owner and Javiera | Saturday |
| Prices to show, confirmed current; contact email or decision to omit | Javiera | Saturday |
| DNS: point `marcandoando.cl` and `www` to Vercel at NIC Chile, leaving email records alone | Owner | Saturday night |

## Decisions the owner confirmed (2026-10-23)

- "Live" means useful and without errors, with fewer features.
- Database and admin account are the minimum for launch.
- WhatsApp is `https://wa.me/56982661835`.
- Real photos without children's faces or school crests may be used.
- The Vercel account used for `duplaweb` hosts this site.
- The owner can change the DNS at NIC Chile this weekend.

## Open questions

1. Is one category per product enough at launch, or is the join table needed now?
   **Answered 2026-10-31:** neither; categories are removed and a product has one
   type, "Producto" or "Pack" (amendment under Scope).
2. Show "desde" prices from the start, or leave price off until Javiera confirms?
3. The social-sharing preview image: the logo or a collage?
4. The pre-filled WhatsApp message: a fixed greeting naming the product, asking them
   to tell their idea. Proposed; confirm.
5. Does Javiera sign in with an email she owns? Which one?
6. **Catálogo empresa (issue #107), open with Javiera:** the intro line on
   `/empresas` is proposed copy, to confirm; minimum orders, lead times and invoicing
   ("factura") for companies are unknown and stay off the site until she confirms
   them; her father's catalog, if there is one, could be read for structure (not
   copied). Her words were "catálogos empresas"; the owner renamed it "Catálogo empresa" on
   2026-11-05 (issue #119). "Empresas" alone would be shorter if the header gets
   tight at 360 px.
7. **Collection tabs (issue #120), approved by the owner on 2026-11-05; still open with Javiera:** the exact names
   and capitalization ("Especial navidad" in her message, "Especial Navidad" in the
   mockup); whether an item may be in both specials (the approved spec says yes, with a list
   on the row and no join table); whether "Todos" should be renamed. Proposed, to
   confirm: the label "Colecciones" for the row of tabs and the admin hint "Todos
   los productos salen siempre en «Todos»."
8. **Catalog cache (issue #136), approved by the owner on 2026-11-06; to revisit after measuring:** is 1 hour the right bound for changes
   made outside the panel (shorter means more database reads by Vercel, never by
   visitors)? And is it acceptable that the first load right after an admin save,
   usually the admin's own, waits on the database once?
9. **Corporate look (issue #141), approved by the owner on 2026-11-12; still open with Javiera:** the hero heading
   "Productos personalizados con el logo de su empresa", the intro line and the three
   "Cómo cotizar" steps are proposed copy (in particular, is it true that the design is
   reviewed with the customer before production?); a photo for the hero, if she wants
   one; whether the pre-filled WhatsApp messages, written as the customer ("Te cuento
   qué necesitamos"), should change for companies (the draft keeps them); and the
   logo sizes (about 44 px tall at 360 px, 64 px at 1280 px).
10. **Company logo in the people's header (issue #148), approved by the owner on 2026-11-12 with the draft's answers; to revisit after seeing it live:** should the logo show
    even when no Empresas item is published (the draft hides it, like the menu link)?
    At 1280 px the logos and the five links do not fit on one row in the 1024 px
    header: accept a second row for the menu (the draft), or widen the header to
    1152 px?
11. **Company logo size (issue #153), draft:** below 768 px the company logo goes under
    the people's logo, as wide as it (proposed), since it cannot be as tall as the
    people's logo beside it at 360 px. Confirm after seeing it live on a phone.
