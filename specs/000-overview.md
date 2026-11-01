# 000 — Product Overview & v1 Scope

**Status:** approved (by the owner, 2026-10-31, with the amendments of that date: issues #63, #69, #85; first approved by the owner on 2026-10-23)

Source: [`docs/requirements.md`](../docs/requirements.md) (the client's text, cited
below as "Req §N" using its section numbers: 1 objective, 2 visual identity,
3A–3E structure, 4 functional requirements (unnumbered in the original), 5 quotes
and orders, 6 contact, 7 administration, 8 technical). Stack decision:
[ADR-0001](../docs/adr/0001-web-stack.md).

Where this spec interprets the requirements or fills a gap, it says so.

## Vision

A website for **Marcando Ando** ("Marcamos tus ideas"), a Chilean business that
personalizes t-shirts, hoodies, bottles, pencil cases, socks and other products
with designs, names and logos. The site does three things (Req §1):

1. **Show** the catalog and, above all, the real work and designs already made,
   so visitors get inspired.
2. **Quote**: turn interest into a WhatsApp conversation about a specific
   product, variant, quantity and personalization.
3. **Be run by Javiera**, with an admin panel, so every price, photo, product
   and design can change without the developer.

It should feel creative, close, cheerful and personal (Req §1), and never
overloaded (Req §2).

Everything else exists in service of these three. A feature that does not help a
visitor discover work, ask for a quote, or help Javiera keep the site current is
out of scope until it does.

## Users

| Who | What they do |
|-----|--------------|
| **Visitor / customer** | Browses on a phone, tablet or computer, finds a product or an idea, asks for a quote on WhatsApp. |
| **Parent or course representative** | A visitor with a specific goal: group gifts for a class, generation, graduation or farewell (Req §3E). The schools section is for them. |
| **Admin (Javiera)** | Keeps the catalog, prices, photos and gallery up to date. Not technical. |

Decision for v1 (owner, 2026-10-23): **one admin role** (Req open question 7).
More roles can be added later if Javiera needs them.

## Platform and stack

A responsive website (phone, tablet, computer: Req §4) on **Next.js, TypeScript,
Tailwind, Supabase and Vercel**, domain `marcandoando.cl`, as decided in
ADR-0001. The admin panel is a protected area of the same app. The domain, SSL
and hosting are part of delivery (Req §4, §8).

## v1 scope

| In | Out (later, or not at all) |
|----|----------------------------|
| **Home:** logo, navigation, main collage image, prominent "Cotizar por WhatsApp" button bottom left, footer with Instagram, email and WhatsApp (Req §3A) | Online payment and checkout |
| **Catalog:** ~~ten categories (bottles, t-shirts, hoodies, pencil cases, socks, school products, gifts, courses and generations, special dates, clothing labels); categories and products addable without redesign (Req §3B)~~ amended 2026-10-31 (Javiera's feedback, issue #63): two groups, "Productos" and "Packs", a fixed type on each product (a pack is a product, not a bundle); products addable without redesign | Customer accounts and order history |
| **Product page:** photos, variants and available designs, description, "from" price, personalization options including print size, minimum quantities, quote button (Req §3C). Amended 2026-10-31 (issue #87, approved by the owner on 2026-10-31 and implemented in the PR for issue #88): each product has its own page at `/productos/<slug>` with its photos, price, colors, sizes, characteristics and quote button, and a link Javiera can share (spec 002) | Shipping cost calculation, inventory counts |
| **WhatsApp quote:** a pre-filled message with product, variant or design, quantity and personalization (Req §5) | Reviews and testimonials |
| **Gallery of designs and finished work:** grouped by theme, new designs added constantly, each design linked to one or more products (Req §3D) | Multiple languages (Spanish only) |
| **Schools and courses section** (Req §3E) | Blog, newsletter, email marketing |
| **Search and filters** by product type and theme (Req §4) | Chatbot or AI assistant |
| **Contact:** floating WhatsApp button, Instagram link, optional contact form (Req §6) | Automated order management |
| **Admin panel:** add, edit and delete products; prices, photos and descriptions; ~~categories~~ each product's type, Producto or Pack (amended 2026-10-31); highlighted products; ~~designs in the gallery~~ (postponed 2026-10-31, issue #69: no "Diseños" in the panel for now); available or temporarily unavailable (Req §7) | Roles beyond a single admin |
| **Quality:** image optimization, basic SEO, responsive layout, SSL (Req §4, §8) | **Cart** (decided by the owner, 2026-10-23): v1 is a catalog plus WhatsApp quotes; a cart is revisited after launch (Req §1, §5) |
| **Offers ("Ofertas"):** a product can be flagged "en oferta" with its old and new price, and appears in a filtered view reached from the menu (Req §3A; interpretation, see decisions) | |
| **Delivery:** domain, hosting, forms, training for Javiera, handover of accounts and ownership, cost information (Req §8) | |

The cart and the "Ofertas" item are settled below; "Ofertas" still needs
Javiera's confirmation.

## Cross-cutting constraints

Every other spec inherits these.

- **Language:** all visible site text is Chilean Spanish, informal ("tú"). Code,
  identifiers and file names are English (project rule in `CLAUDE.md`).
- **Currency:** Chilean pesos (CLP) only. Prices are shown with a dot as
  thousands separator (`$7.000`). CLP has no minor unit, so amounts are whole
  numbers. Prices are reference or "from" prices, not firm quotes (Req §3B).
  Amended 2026-10-31 (issue #85): on the site they read as a price per unit
  ("$7.000 c/u"), without "desde", with a note that wholesale has another price
  (spec 002).
- **Brand:** the official logo and the brand colors pink, teal, yellow, purple
  and navy; light or white backgrounds so products stand out; cheerful, modern,
  tidy (Req §2). Palette values and typography belong to the design system spec.
- **Real content:** real photos of real products (Req §2). Never invent prices,
  numbers, addresses or testimonials; a missing fact is a visible placeholder.
- **Privacy:** many existing photos show children and school crests. Nothing with
  a minor's face or a school crest goes live until Javiera confirms permission
  (Req open question 9).
- **Responsive:** the site works on phones, tablets and computers (Req §4). The
  public site is designed phone first as a **working assumption** (social-media
  visitors are usually on phones), not a fact about this business: it is
  checked against real traffic once the site is live. The admin is designed for
  use on a computer, and works on a phone.
- **Performance:** images are optimized; pages load fast (Req §4, §8). The source
  screenshots are about 5 MB each and are not production images.
- **Accessibility:** semantic HTML, `lang="es"`, Spanish `alt` text, good contrast.
- **SEO:** basic configuration at launch (Req §4, §8).
- **Primary call to action:** WhatsApp (`https://wa.me/56982661835`, to confirm:
  Req open question 3).
- **Ownership:** Javiera owns the domain, the accounts, the data and the site;
  handover is part of delivery (Req §8). Credentials never live in the repo.
- **Cost:** hosting is paid (ADR-0001, "to verify"). Costs and renewals are told
  to Javiera before launch (Req §8).
- **Testing:** failing test first, every change, per the `tdd-change` skill. The
  RLS-first approach from `duplaweb`'s `TESTING.md` applies: the public reads the
  catalog, only the admin writes, and tests prove it against a real local
  Supabase.
- **Local development:** the whole site, including the admin and the database,
  runs on the developer's machine without going live: the Next.js dev server on
  `localhost`, and Supabase (Postgres, Auth, Storage) running locally in Docker
  from migrations and seed data. Production changes only when a PR is merged to
  `main`; each PR may get a Vercel preview URL that is not production. This
  needs a current Node version, which the developer's machine does not have yet
  (it has Node 16); the exact minimum is to be checked against the Next.js
  version chosen when the app is scaffolded.

## Proposed next specs

Not committed. Numbers are assigned when each is drafted; the order is the
proposed build order.

| Proposed | Topic | Covers |
|----------|-------|--------|
| 001 | Content model | Products, ~~categories~~ product type (2026-10-31), variants, designs, themes, courses, how designs link to products, availability, and the RLS read rules |
| 002 | Design system and brand | Palette tokens, typography, components, layout, responsive rules (Req §2) |
| 003 | Auth and admin foundation | Admin sign-in, the admin role, protected `/panel` area (Req §7) |
| 004 | Admin: catalog | Products, ~~categories~~ product type (2026-10-31), prices, availability, highlights (Req §7) |
| 005 | Images | Upload, storage, size limits, optimization (Req §4) |
| 006 | Public catalog | Home, ~~category and~~ product listing (by type since 2026-10-31), search and filters (Req §3A, §3B, §4) |
| 007 | Product page and WhatsApp quote | Variants, personalization options, pre-filled message (Req §3C, §5) |
| 008 | Gallery and admin: designs | Themes, design-to-product links, adding designs (Req §3D, §7) |
| 009 | Schools and courses | The dedicated section (Req §3E) |
| 010 | Contact, SEO and launch | Floating button, footer, optional form, SEO basics (Req §4, §6) |
| 011 | Deployment | Vercel, `marcandoando.cl`, DNS, SSL, email provider (Req §8, ADR-0001 action 7) |
| 012 | Continuous integration | Checks on every PR |
| 013 | Training and handover | Admin guide for Javiera, accounts and ownership (Req §7, §8) |

Likely build order: 001 → 002 → 003 → 005 → 004 → 006 → 007 → 008 → 009 → 010
→ 011 → 013, with 012 started as early as the first code lands. The content
model comes first because the database, the admin and every public page depend
on it.

## Decisions and open items

Carried from the open questions in `docs/requirements.md`. "Q" followed by a
number refers to that document's numbering.

**Decided by the owner, 2026-10-23**

1. **Cart (Q5): out of v1.** Req §1 lists "Solicitar productos personalizados
   (Carrito)", but Req §5 says the first stage is catalog plus quote and a cart
   "only if it is not complex". The WhatsApp quote flow is the v1 ordering path;
   a cart is revisited after launch.
2. **"Ofertas" (Q6): a product flag.** The menu in Req §3A lists offers, but
   nothing else describes it. A product can be flagged "en oferta" with its old
   and new price, shown in a filtered view. This is an interpretation, so it is
   **pending Javiera's confirmation**; spec 001 models it as an optional flag so
   a different answer is cheap to change.
3. **Admin users (Q7): one admin role** in v1.

**Still open**

4. **WhatsApp link (Q3), contact email (Q1), photos (Q8), minors' photos and
   school crests (Q9), costs and ownership (Q10).** These do not change the scope,
   but launch is blocked until they are answered.
5. **Reference site (Q11).** `uniformesgirasol.cl` has not been reviewed; it may
   change the catalog layout or the quote flow.

## Definition of done for v1

v1 is launched when:

- every item in the "In" column works, and each spec behind it is `verified`;
- Javiera can add a product, change a price and add a design to the gallery from
  the admin without help;
- `marcandoando.cl` serves the site over SSL;
- the privacy, photo and contact-email questions above are answered and reflected
  on the site;
- Javiera has been trained, and holds the accounts and access.

This overview has no feature acceptance criteria of its own. Each spec behind it
has Given/When/Then criteria and a Verification plan, as set out in
[`README.md`](README.md).
