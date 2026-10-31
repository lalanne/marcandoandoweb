# 002 — Launch 0: first public release

**Status:** draft (the 2026-10-31 amendment, issue #63, waits for the owner's approval; the spec was approved by the owner on 2026-10-23)

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
(`offer_price_clp`), minimum quantity, materials, sizes and colors, multiple
categories per product.

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
- **Products:** list, create, edit, delete; set price, availability, highlighted,
  published; choose the ~~category~~ type, "Producto" or "Pack" (amended
  2026-10-31); upload and order photos with alt text.
- **Designs:** list, create, edit, delete; upload photos with alt text.
- Designed for a computer, usable on a phone.
- Out: roles, ~~category editing~~ (no categories since 2026-10-31), password reset flow beyond what Supabase gives by
  default, bulk actions, search.

### Public site

One page in Chilean Spanish (informal "tú"), reading from the database:

| Section | Content |
|---------|---------|
| **Header** | Logo, links that scroll to the sections, and a sign-in link: "Entrar" for visitors, "Mi panel" for the signed-in admin (see criteria 27 to 31). Amended 2026-10-31: the section links are exactly "Productos", "Packs", "Cómo pedir" and "Colegios y grupos", in that order; "Productos" and "Packs" only show when their section is shown; there is no "Trabajos" link (criteria 34 and 35) |
| **Hero** | Logo or main image, the tagline "Marcamos tus ideas", a short line on what Marcando Ando personalizes, and a "Cotizar por WhatsApp" button (Req §3A) |
| **Products** | Published products of type "Producto" (amended 2026-10-31; before, all published products grouped by category): cover photo, name, "desde" price if set, and a "no disponible por ahora" notice with no button when unavailable. Highlighted products first. Each available product links to WhatsApp with a message naming it. Section heading "Productos", anchor `#productos` |
| **Packs** | Added 2026-10-31. Published products of type "Pack", shown and ordered exactly like the Products section. Section heading "Packs", anchor `#packs` |
| **Real work** | Published designs with their photos |
| **How to order** | Three short steps: tell us your idea, we send you a quote, we make it |
| **Schools and groups** | A short block for courses, generations and teams, with a WhatsApp button (Req §3E, reduced) |
| **Footer** | WhatsApp, Instagram `@marcando_ando`, and the email only if the owner confirms one |
| **Floating button** | A WhatsApp button always visible (Req §6) |

There are no separate product pages, search or filters at launch.

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
9. Given the admin, when they create, edit and delete a design with photos, then the
   "Real work" section reflects it.
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

## Verification plan

| # | Criterion | Layer |
|---|-----------|-------|
| 1, 5, 8 (size) | Constraints, RLS, non-admin refused | Integration (Vitest) against local Supabase, as anonymous, non-admin and admin |
| 13 | WhatsApp URL and message builder | Unit (Vitest), pure function |
| 3, 4, 6, 7, 9, 10 | Admin flows | End to end (Playwright) against local Supabase |
| 11, 12, 14–18 | Public page, layout, keyboard | End to end (Playwright) at 360, 768 and 1280 px |
| 19, 21 | Accessibility, performance | axe and Lighthouse on the preview deploy |
| 25 | Storage read policy: unpublished images not readable or listable | Integration (Vitest) against local Supabase, as anonymous, non-admin and admin; end to end for `/img/...` |
| 26 | `/panel/img/...` for the admin, `/img/...` with cache headers | Unit (URL helper), integration (storage), end to end (Playwright) |
| 27, 31 | Link visible and stable at 360 and 1280 px, keyboard, no layout shift, fallback label | End to end (Playwright) with axe |
| 32, 36 | Type field in the admin, moving a product between sections | End to end (Playwright) against local Supabase; a unit test for the form input parser (type required, only the two values) |
| 33, 34 | Two sections by type, empty type hidden | Unit test for the pure grouping function; end to end (Playwright) at 360 and 1280 px with axe |
| 35 | Header links | End to end (Playwright) at 360 and 1280 px with axe |
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
