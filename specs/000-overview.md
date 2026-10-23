# 000 — Product Overview & v1 Scope

**Status:** draft

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
| **Visitor / customer** | Browses on a phone (most arrive from Instagram), finds a product or an idea, asks for a quote on WhatsApp. |
| **Parent or course representative** | A visitor with a specific goal: group gifts for a class, generation, graduation or farewell (Req §3E). The schools section is for them. |
| **Admin (Javiera)** | Keeps the catalog, prices, photos and gallery up to date. Not technical. |

Decision for v1 (interpretation): **one admin role**. Whether others need access
is an open question (Req open question 7).

## Platform and stack

A responsive website (phone, tablet, computer: Req §4) on **Next.js, TypeScript,
Tailwind, Supabase and Vercel**, domain `marcandoando.cl`, as decided in
ADR-0001. The admin panel is a protected area of the same app. The domain, SSL
and hosting are part of delivery (Req §4, §8).

## v1 scope

| In | Out (later, or not at all) |
|----|----------------------------|
| **Home:** logo, navigation, main collage image, prominent "Cotizar por WhatsApp" button bottom left, footer with Instagram, email and WhatsApp (Req §3A) | Online payment and checkout |
| **Catalog:** ten categories (bottles, t-shirts, hoodies, pencil cases, socks, school products, gifts, courses and generations, special dates, clothing labels); categories and products addable without redesign (Req §3B) | Customer accounts and order history |
| **Product page:** photos, variants and available designs, description, "from" price, personalization options including print size, minimum quantities, quote button (Req §3C) | Shipping cost calculation, inventory counts |
| **WhatsApp quote:** a pre-filled message with product, variant or design, quantity and personalization (Req §5) | Reviews and testimonials |
| **Gallery of designs and finished work:** grouped by theme, new designs added constantly, each design linked to one or more products (Req §3D) | Multiple languages (Spanish only) |
| **Schools and courses section** (Req §3E) | Blog, newsletter, email marketing |
| **Search and filters** by product type and theme (Req §4) | Chatbot or AI assistant |
| **Contact:** floating WhatsApp button, Instagram link, optional contact form (Req §6) | Automated order management |
| **Admin panel:** add, edit and delete products; prices, photos and descriptions; categories; highlighted products; designs in the gallery; available or temporarily unavailable (Req §7) | Roles beyond a single admin |
| **Quality:** image optimization, basic SEO, responsive layout, SSL (Req §4, §8) | Cart: see open decisions |
| **Delivery:** domain, hosting, forms, training for Javiera, handover of accounts and ownership, cost information (Req §8) | |

Two items are deliberately **not decided** here and block approval; see below:
the cart (Req §1, §5) and the "Ofertas" menu item (Req §3A).

## Cross-cutting constraints

Every other spec inherits these.

- **Language:** all visible site text is Chilean Spanish, informal ("tú"). Code,
  identifiers and file names are English (project rule in `CLAUDE.md`).
- **Currency:** Chilean pesos (CLP) only. Prices are shown with a dot as
  thousands separator (`$7.000`). CLP has no minor unit, so amounts are whole
  numbers. Prices are reference or "from" prices, not firm quotes (Req §3B).
- **Brand:** the official logo and the brand colors pink, teal, yellow, purple
  and navy; light or white backgrounds so products stand out; cheerful, modern,
  tidy (Req §2). Palette values and typography belong to the design system spec.
- **Real content:** real photos of real products (Req §2). Never invent prices,
  numbers, addresses or testimonials; a missing fact is a visible placeholder.
- **Privacy:** many existing photos show children and school crests. Nothing with
  a minor's face or a school crest goes live until Javiera confirms permission
  (Req open question 9).
- **Mobile first:** the primary device is a phone.
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

## Proposed next specs

Not committed. Numbers are assigned when each is drafted; the order is the
proposed build order.

| Proposed | Topic | Covers |
|----------|-------|--------|
| 001 | Content model | Products, categories, variants, designs, themes, courses, how designs link to products, availability, and the RLS read rules |
| 002 | Design system and brand | Palette tokens, typography, components, layout, responsive rules (Req §2) |
| 003 | Auth and admin foundation | Admin sign-in, the admin role, protected `/panel` area (Req §7) |
| 004 | Admin: catalog | Products, categories, prices, availability, highlights (Req §7) |
| 005 | Images | Upload, storage, size limits, optimization (Req §4) |
| 006 | Public catalog | Home, category and product listing, search and filters (Req §3A, §3B, §4) |
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

## Open decisions (block approval)

Carried from the open questions in `docs/requirements.md`. "Q" followed by a
number refers to that document's numbering.

1. **Cart (Q5).** Req §1 lists "Solicitar productos personalizados (Carrito)" but
   Req §5 says the first stage is catalog plus quote, and a cart "only if it is not
   complex". Proposed: **out of v1**; the quote flow through WhatsApp is the v1
   ordering path, and a cart is revisited after launch. Needs the owner's call.
2. **"Ofertas" (Q6).** The menu in Req §3A lists offers, but nothing else
   describes it. Proposed: a simple highlight, such as a flag on a product ("en
   oferta" with the old and new price), shown in a filtered view. Needs
   Javiera's answer.
3. **Admin users (Q7).** Proposed: one admin role in v1.
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
