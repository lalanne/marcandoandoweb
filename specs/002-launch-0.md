# 002 — Launch 0: first public release

**Status:** draft

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

- **Category**: seeded by migration with the ten categories of Req §3B; not
  editable in the admin at launch.
- **Product**: name, slug, description, `price_from_clp`, `is_available`,
  `is_featured`, `is_published`, category.
- **Design**: title, slug, description, `is_published`; the gallery's unit.
- **Image**: alt text required, owner is a product or a design, position.
- **Row-level security** exactly as in spec 001 for those tables: the public reads
  published rows, only the admin writes.

Deferred to later specs: variants, themes, design-to-product links, offers
(`offer_price_clp`), minimum quantity, materials, sizes and colors, multiple
categories per product.

A product in launch 0 belongs to one category **(interpretation: the join table
comes with the multi-category work)**.

### Admin: `/panel`

- **Sign-in** with email and password (Supabase Auth). One admin account, created
  by the developer and handed to Javiera. No sign-up page.
- **Products:** list, create, edit, delete; set price, availability, highlighted,
  published; choose the category; upload and order photos with alt text.
- **Designs:** list, create, edit, delete; upload photos with alt text.
- Designed for a computer, usable on a phone.
- Out: roles, category editing, password reset flow beyond what Supabase gives by
  default, bulk actions, search.

### Public site

One page in Chilean Spanish (informal "tú"), reading from the database:

| Section | Content |
|---------|---------|
| **Header** | Logo and links that scroll to the sections |
| **Hero** | Logo or main image, the tagline "Marcamos tus ideas", a short line on what Marcando Ando personalizes, and a "Cotizar por WhatsApp" button (Req §3A) |
| **Products** | Published products grouped by category: cover photo, name, "desde" price if set, and a "no disponible por ahora" notice with no button when unavailable. Highlighted products first. Each available product links to WhatsApp with a message naming it |
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

1. Spec 001's criteria 1, 3, 5, 6, 8, 13, 15, 16, 18, 19 and 20, restricted to
   Category, Product, Design and Image, pass against local Supabase.
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
6. Given the admin, when they create a product with name, price, category and a
   photo with alt text and publish it, then it appears on the public page without a
   deploy.
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
24. Given a merge to `main`, when the deploy finishes, then production is updated, and
    migrations have been applied to the production database (the exact step is
    decided in the deployment work and recorded in `CLAUDE.md`).

## Verification plan

| # | Criterion | Layer |
|---|-----------|-------|
| 1, 5, 8 (size) | Constraints, RLS, non-admin refused | Integration (Vitest) against local Supabase, as anonymous, non-admin and admin |
| 13 | WhatsApp URL and message builder | Unit (Vitest), pure function |
| 3, 4, 6, 7, 9, 10 | Admin flows | End to end (Playwright) against local Supabase |
| 11, 12, 14–18 | Public page, layout, keyboard | End to end (Playwright) at 360, 768 and 1280 px |
| 19, 21 | Accessibility, performance | axe and Lighthouse on the preview deploy |
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
2. Show "desde" prices from the start, or leave price off until Javiera confirms?
3. The social-sharing preview image: the logo or a collage?
4. The pre-filled WhatsApp message: a fixed greeting naming the product, asking them
   to tell their idea. Proposed; confirm.
5. Does Javiera sign in with an email she owns? Which one?
