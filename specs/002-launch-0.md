# 002 — Launch 0: first public release

**Status:** approved (by the owner, 2026-10-31, with the amendments of that date for issues #63, #69, #72, #79, #82 and #85; first approved on 2026-10-23). The 2026-10-31 amendment for issue #87 (product page, colors, sizes, characteristics; criteria 56 to 66) was approved by the owner on 2026-10-31 and implemented in the PR for issue #88.

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
- **Image**: alt text required, owner is a product or a design, position.
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
  link reads "Entrar" (criterion 43).
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
| **Header** | Logo, links that scroll to the sections, and a sign-in link: "Entrar" for visitors, "Mi panel" for the signed-in admin (see criteria 27 to 31). Amended 2026-10-31: the section links are exactly "Productos", "Packs", "Cómo pedir" and "Colegios y grupos", in that order; "Productos" and "Packs" only show when their section is shown; there is no "Trabajos" link (criteria 34 and 35) |
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
  as the card's) and the "Copiar enlace" button. A heading, list or row shows **only
  when it has content**: a product with no colors shows no "Colores" heading.
- **Colors** show as round swatches, each with its name written next to it (never
  color alone). **Sizes** show as pills. **Characteristics** show as a list, one item
  per line of the text.
- **From the card.** Each card gets a "Ver detalles" link (a link, since it goes to
  another page) after the price. Tapping the photo does not open the page, so swiping
  through photos stays free (issue #82). A screen reader hears "Ver detalles de
  <name>".
- **The link to share.** `https://<site>/productos/<slug>`. "Copiar enlace" on the
  page copies it and says "Enlace copiado" (announced politely); if the browser
  refuses, the link shows in a text field, selected, so it can be copied by hand. In
  the panel's product list, every published product has a "Copiar enlace" button
  with the same behavior; an unpublished product has none, because its page is a 404.
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
8. Given the admin, when they try to save an image without alt text or above the size
   limit, then it is refused with a clear message.
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
    shows a link labelled "Entrar" that goes to `/entrar`, visible without scrolling
    at 360 px and at 1280 px, reachable with the keyboard with a visible focus.
28. Given the admin signed in, when the home page loads, then the header link reads
    "Mi panel" and goes to `/panel`.
29. Given a user who is signed in but is not the admin, when the home page loads,
    then the header link reads "Entrar", and nothing reveals who is signed in.
30. Given the admin who signs out through `/salir`, when they return to the home
    page, then the link reads "Entrar" again.
31. Given the home page, when the session cannot be read or takes long, then the link
    shows "Entrar", the hero and the other sections are not delayed or broken, and
    the header does not shift the layout when the label changes to "Mi panel".

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
    "Entrar", and opening `/panel` sends them to `/entrar`.
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
49. Given a card with several photos, when the page loads, then only its first photo
    is requested; the next photo is requested no earlier than when the visitor moves
    toward it; every photo has its own Spanish alt text; and changing photos does not
    change the size of the card (no layout shift).
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
55. Given a product card's "Cotizar" button and the floating WhatsApp button, when
    they are followed, then the pre-filled messages are the same as before this
    amendment.

**A page per product, with colors, sizes and a link to share** (added 2026-10-31, issue #87)

56. Given a published product or pack, when the home page loads, then its card has a
    link "Ver detalles" that goes to `/productos/<slug>`, can be reached and pressed
    with the keyboard with a visible focus, is at least 44 by 44 px, and is announced
    as "Ver detalles de <name>"; and pressing the photo itself does not leave the
    page.
57. Given a published product with a price of 7000, three photos, colors Rosado
    (`#E8647F`) and Celeste (`#4FB0B0`), sizes "4", "6" and "8", and two lines of
    characteristics, when a visitor opens `/productos/<slug>`, then they see the
    name, "$7.000 c/u", the photos with the controls of criteria 46 to 50, the two
    colors as swatches with their names written, the three sizes in that order, the
    characteristics as a list of two items, and the "Cotizar por WhatsApp" button
    whose message names the product as on the card.
58. Given a published product with no colors, no sizes, no characteristics and no
    price, when a visitor opens its page, then it shows no "Colores", "Tamaños y
    tallas" or "Características" heading and no price, and still shows the name, the
    photos and the "Cotizar por WhatsApp" button.
59. Given a published product marked unavailable, when a visitor opens its page,
    then it shows "no disponible por ahora" and no "Cotizar por WhatsApp" button.
60. Given an unpublished product, or a slug that does not exist, when a visitor opens
    `/productos/<slug>`, then the answer is 404 and none of its data or photos is
    shown (a photo asked at `/img/<path>` is refused, criterion 25).
61. Given a published product, when its page is requested, then its `<title>` is
    "<name> | Marcando Ando", it has a description that includes the price when there
    is one, a canonical address, and the Open Graph tags `og:title`, `og:description`,
    `og:url` and `og:image`, the last one the absolute address of the cover photo and
    absent when the product has no photo; and the sitemap lists the page of every
    published product and none of an unpublished one.
62. Given a product page, when the visitor presses "Copiar enlace", then
    `https://<site>/productos/<slug>` is on the clipboard and the text "Enlace
    copiado" is announced; when the browser refuses to copy, then the link shows in a
    text field, selected, instead.
63. Given the admin looking at the product list in the panel, when a product is
    published, then its row has a "Copiar enlace" button with the behavior of
    criterion 62; when it is not published, then its row has none.
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
| 49 | Lazy loading, alt text, no layout shift | End to end: the network requests on load name only each card's first photo; alt text per photo; the card's box keeps its size when the photo changes |
| 50 | Keyboard, focus, 44 px targets, no horizontal scroll | End to end (Playwright) at 360 and 1280 px with axe |
| 51 | Unpublished photos stay private | Covered by the criterion 25 tests, extended to a product's second and later photos |
| 52, 53 | Price "$7.000 c/u", no "desde", the note once per section | Unit test for the price label helper; end to end (Playwright) at 360 and 1280 px with axe |
| 54 | Admin price label | End to end (Playwright); the existing price parser unit tests stay |
| 55 | WhatsApp messages unchanged | The existing unit tests of the message builder stay green |
| 56 | "Ver detalles" link on the card, photo does not navigate | End to end (Playwright) at 360 and 1280 px, with axe |
| 57, 58, 59 | Page content, only fields with content, unavailable | End to end (Playwright) at 360 and 1280 px against local Supabase with seeded fake colors, sizes and characteristics; a unit test for the pure helper that turns the characteristics text into items and the list into what the page shows |
| 60 | 404 for unpublished or unknown | End to end (Playwright); integration for the data being hidden (spec 001 criterion 13) |
| 61 | Title, description, Open Graph tags, sitemap | Unit test for the pure metadata builder; end to end that reads the tags and the sitemap of the running server |
| 62, 63 | "Copiar enlace" and its fallback | Unit test for the pure link builder; end to end (Playwright) with clipboard permission granted and denied |
| 64 | Admin fields: save, order, remove, errors, optional | End to end (Playwright) against local Supabase as a throwaway admin; unit tests for the form parser (spec 001 criteria 24 to 26 share it) |
| 65 | Responsive, keyboard, contrast, axe, back link | End to end (Playwright) at 360 and 1280 px with axe |
| 66 | The link survives edits | End to end (Playwright), or integration on the slug staying the same after an update |
| 43, 44, 45 | "Salir" ends on the home page, "Ver sitio", "Volver al sitio" | End to end (Playwright) at 360 and 1280 px against local Supabase, as a throwaway admin (signing out ends every session of that user); criterion 10 and spec 005 criterion 9 keep their tests |
| 28, 29, 30 | Label by session: admin, non-admin, after sign-out | End to end (Playwright) against local Supabase, as the throwaway admin and the seeded non-admin; a unit test for the pure function that picks the label and the target |
| 2, 20, 22, 23, 24 | Production state, console, DNS, SSL, metadata, deploy | Manual checklist on the live site, plus Vercel deploy status |

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
