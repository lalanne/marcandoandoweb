# ADR-0001: Web stack — Next.js, Supabase and Vercel

**Status:** Accepted
**Date:** 2026-10-23
**Deciders:** Christian Lalanne (owner and only developer)

## Context

Javiera, CEO of Marcando Ando, asked for a website (see
[`../requirements.md`](../requirements.md)) that is more than a brochure:

- a catalog with ten categories, products with variants, prices and photos;
- a product page with a WhatsApp quote button that pre-fills the message;
- a gallery of designs and finished work, where each design links to one or more
  products;
- a schools and courses section;
- search and filters by product type and theme;
- an **admin panel** so she can add, edit and hide products, change prices and
  photos, create categories and add designs herself, without depending on the
  developer;
- fast loading, basic SEO, her own domain and SSL;
- a cart only if it is not complex (first stage is catalog plus WhatsApp quotes).

Forces:

- One developer, working with Claude Code agents on a Pro plan. Less new
  technology means fewer things to learn, configure and keep up to date.
- The owner wants one technology and one provider per layer across all projects.
  `duplaweb` (also a Spanish-language business site, with an admin panel) already
  runs Next.js, Supabase and Vercel. `da2` and `cheap` are mobile apps on Expo and
  Firebase, which is a different kind of product.
- The site is a client's business site. She will own it, and she has asked about
  maintenance and renewal costs, so ongoing cost matters.
- The previous plan (static HTML, CSS and JavaScript) cannot provide an editable
  catalog or an admin panel.

## Decision

Reuse the web stack of `duplaweb`:

- **Next.js** (App Router) with **React** and **TypeScript** for the site.
- **Tailwind CSS** for styling.
- **Supabase** for Postgres, Auth and Storage, with row-level security (RLS):
  the public reads the catalog; only the admin writes.
- **Vercel** for hosting, with a deploy on every merge to `main`.
- **Vitest** and **Playwright** for tests, following the RLS-first plan in
  `duplaweb`'s `TESTING.md`, with Supabase running locally for integration tests.
- **Migrations from day one** (`supabase/migrations/`), not SQL pasted into the
  dashboard.

The admin panel is part of the app (a protected `/panel` area, as in
`duplaweb`), not a separate CMS product.

Mobile apps keep Expo and Firebase. This ADR covers websites only.

## Options Considered

### Option A: Next.js, Supabase, Vercel (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: the admin panel and image handling are built in-house |
| Cost | Likely two paid plans for a business site (to verify, see below) |
| Scalability | More than enough for a small shop |
| Team familiarity | High: same stack as `duplaweb` |

**Pros:** nothing new to learn; patterns, auth, RLS tests and deploy flow already
exist in `duplaweb`; full control of design, the gallery and the WhatsApp message
builder; design-to-product links are an ordinary join table; she owns the
accounts and the data.

**Cons:** the admin is code we write and maintain; image upload and optimization
are on us; hosting is paid; Next.js moves fast.

### Option B: Astro with Sanity

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: two new technologies |
| Cost | Free tiers likely cover a small site (to verify) |
| Scalability | More than enough |
| Team familiarity | Low |

**Pros:** a ready-made editing UI for a non-technical owner; first-class
references between documents; fast static pages.

**Cons:** two technologies and two providers that no other project uses, which
goes against the one-stack goal; content lives in a vendor system.

### Option C: Store platform (Shopify, or Tiendanube)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Monthly fee, plus transaction fees on some plans (to verify) |
| Scalability | High |
| Team familiarity | None |

**Pros:** admin, cart, hosting, SSL and SEO built in; fastest launch.

**Cons:** limited design freedom; a weak gallery with design-to-product relations;
the WhatsApp quote flow is not what these platforms are built for; a new provider.

### Option D: WordPress with WooCommerce

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Cost | Paid hosting |
| Scalability | Adequate |
| Team familiarity | None |

**Pros:** familiar admin, many plugins.

**Cons:** ongoing updates and security maintenance, usually heavier and slower, a
new language and platform for the developer.

### Option E: Static HTML, CSS and JavaScript (the earlier plan)

**Rejected:** no admin panel and no editable catalog, which are core requirements.

## Trade-off Analysis

The real choice is between **a stack the developer already owns** (A) and **less
code to write** (B, C). Javiera's strongest requirements are the gallery linked to
products, the WhatsApp quote flow and ownership of the site. Those favor a custom
build, and A is the custom build with no new technology. B has the better ready-made
editor, but a second tool per project is what the owner wants to avoid, and the admin
needed here is small CRUD: products, categories, designs, availability and photos.
C launches fastest but fits the quote-first, gallery-first brief worst. D adds a
platform nobody here maintains.

The price of A is paid hosting. The owner accepts this in return for one stack.

## Consequences

**Easier**
- Reusing auth, RLS tests, the `/panel` pattern and the Vercel deploy flow from `duplaweb`.
- Agents can work in a stack they already know from the other repo.
- The catalog, gallery and their relations live in one Postgres schema.

**Harder**
- We build and maintain the admin panel, and must teach Javiera to use it.
- Images need an upload path, size limits and optimization (Supabase Storage with
  Next.js image optimization). The current screenshots are about 5 MB each.
- Ongoing cost (below) is passed to the client or absorbed by the owner.
- Next.js changes between versions. `duplaweb`'s `AGENTS.md` tells agents to read
  the bundled docs before writing code; the same note should carry over here.

**To revisit**
- Cart and online payment (out of the first stage).
- Moving DNS to Vercel and away from the registrar's DNS, as `duplaweb`'s README
  suggests.
- Whether a lighter admin (or Supabase's own table editor) is enough for the first
  release.

## Costs and platform terms — to verify

These are recalled, not checked against the providers' current pages. Verify before
quoting anything to the client:

- Vercel's free (Hobby) plan is intended for non-commercial use; a business site
  likely needs a paid plan (about US$20 a month).
- Supabase's free plan pauses projects after a period of inactivity, which would take
  a quiet shop's site down; a paid plan avoids it (about US$25 a month).
- The domain `marcandoando.cl` is registered at NIC Chile, in the client's name
  (bought by Javiera, 2026-10). `.cl` domains expire and must be renewed; check
  NIC Chile's current renewal period and price before quoting her.

## Action Items

1. [ ] Verify the Vercel and Supabase plan terms and prices, and decide who pays.
2. [ ] Draft `specs/000-overview.md` (vision, scope, constraints) citing this ADR.
3. [ ] Draft the content model spec: products, categories, variants, designs,
       themes, courses, and how designs link to products.
4. [ ] Scaffold the app, Supabase project and Vercel project in their own issues,
       with migrations and a local-Supabase test setup from the first commit.
5. [ ] Carry the Next.js agent note from `duplaweb`'s `AGENTS.md` into this repo's
       `AGENTS.md` when the app is scaffolded.
6. [ ] Create the Supabase and Vercel accounts in the client's name (or a clear
       handover plan), as the requirements ask for ownership.
7. [ ] Connect `marcandoando.cl` to Vercel. Decide where DNS lives (NIC Chile's
       own DNS, or delegate the nameservers to Vercel as `duplaweb`'s README
       suggests), and which email provider serves `@marcandoando.cl`. Keep the
       website records and the email records separate, and do not change the
       email records when editing the website's. The owner handles access to
       the NIC Chile account; never put registrar credentials in the repo or
       in chat.
