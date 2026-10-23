# 002 — Launch 0: first public release

**Status:** draft

Sources: [spec 000](000-overview.md), [`docs/requirements.md`](../docs/requirements.md)
("Req §N"), [ADR-0001](../docs/adr/0001-web-stack.md). Issue #15. Interpretations
are labelled **(interpretation)**.

## Why this exists

The owner wants something live on Sunday 2026-10-25: *useful, with fewer
features, functional and without errors* (owner, 2026-10-23). The full v1 in spec
000 (admin, database, catalog, gallery) does not fit in two days. Launch 0 is a
small, static-content site that gets `marcandoando.cl` online and turns visitors
into WhatsApp conversations. v1 replaces it later, spec by spec.

Spec numbering: this spec takes number 002, so the numbers proposed in spec 000's
"Proposed next specs" table shift by one when those specs are drafted. That table
is explicitly not committed.

## Scope

One page, in Chilean Spanish (informal "tú"), built with the stack of ADR-0001 but
**without Supabase**: Next.js, TypeScript and Tailwind, deployed on Vercel. Content
is fixed in the code. There is no admin, no database, no login.

| Section | Content |
|---------|---------|
| **Header** | Logo and links that scroll to the sections |
| **Hero** | Logo or main collage image, the tagline "Marcamos tus ideas", a short line saying what Marcando Ando personalizes, and a "Cotizar por WhatsApp" button (Req §3A) |
| **What we personalize** | The product types as simple cards: poleras, polerones, botellas, estuches, calcetines, regalos, productos escolares, adornos navideños. Each card has a photo, a name and, only where the owner confirms it, a "desde" price. Each card links to WhatsApp with a message naming that product |
| **Real work** | A gallery of 8–12 real photos with Spanish `alt` text. Only photos approved for publication (see Privacy) |
| **How to order** | Three short steps: tell us your idea, we send you a quote, we make it |
| **Schools and groups** | A short block for courses, generations and teams, with a WhatsApp button (Req §3E, reduced) |
| **Footer** | WhatsApp, Instagram `@marcando_ando`, and the email only if the owner confirms one |
| **Floating button** | A WhatsApp button always visible on the page (Req §6) |

Not in launch 0: admin panel, catalog or product pages, gallery by theme, search
and filters, offers, contact form, cart, analytics beyond what Vercel provides.

## Constraints

Inherited from spec 000 and `CLAUDE.md`, and restated where they bite:

- **Real data only.** Prices are shown only if they are on the owner's Instagram
  and the owner confirms they are current. Nothing is invented. A missing fact is
  left out of the live page, not shown as a placeholder.
- **Privacy.** No photo showing a minor's face or a school crest. The owner chooses
  the photos and confirms that none of them does.
- **WhatsApp link.** `https://wa.me/56982661835`, confirmed by the owner on
  2026-10-23. Every ordering button uses it, with a pre-filled message.
- **Performance.** Images are compressed (WebP or AVIF, sensible dimensions), not
  the ~5 MB screenshots. Lazy loading except in the hero.
- **Accessibility.** Semantic HTML, `lang="es"`, Spanish `alt` on every image,
  good contrast, buttons reachable by keyboard.
- **Responsive.** Works on phone, tablet and computer. The layout is phone first as
  a working assumption (spec 000).
- **Brand.** Logo and palette from `CLAUDE.md`, colors as CSS variables on `:root`.
- **Ownership.** The Vercel project is under the owner's existing account for now;
  the handover to Javiera is part of v1 (spec 000). No credentials in the repo.

## Acceptance criteria

**Content**

1. Given the page loads, when the visitor looks at the top of it, then the logo, the
   tagline and a "Cotizar por WhatsApp" button are visible without scrolling on a
   360 px wide screen.
2. Given the page, when it is read, then every section in the Scope table is present
   and in the stated order, and all visible text is Spanish.
3. Given any ordering button or the floating button, when it is activated, then it
   opens `https://wa.me/56982661835` with a pre-filled Spanish message.
4. Given a product card, when its button is activated, then the pre-filled message
   names that product type.
5. Given the Instagram link, when it is activated, then it opens
   `https://www.instagram.com/marcando_ando`.
6. Given the footer, when the owner has not confirmed an email, then no email or
   placeholder appears.
7. Given any price on the page, when it is checked against the owner's confirmation
   list, then it matches; a price not on the list is a defect.

**Quality**

8. Given every image, when the page is checked, then it has non-empty Spanish `alt`
   text, and none is larger than 300 KB.
9. Given the page on a mobile connection profile, when it is measured, then the
   largest content is shown in under 2.5 s and the layout does not shift visibly.
10. Given the page, when it is opened at 360, 768 and 1280 px, then there is no
    horizontal scroll and nothing overlaps the floating button's tap target.
11. Given the page, when navigated with the keyboard only, then every link and
    button can be reached and shows a visible focus.
12. Given the page, when an automated accessibility check runs, then it reports no
    serious or critical violations.
13. Given the page, when it loads in production, then the browser console shows no
    errors and no request fails.

**Delivery**

14. Given `marcandoando.cl` and `www.marcandoando.cl`, when opened, then both serve
    the page over HTTPS with a valid certificate, and `www` redirects to the apex
    (or the reverse, one canonical address).
15. Given the page's head, when inspected, then it has a title, a description, Open
    Graph tags with a preview image, a favicon and `lang="es"`.
16. Given a merge to `main`, when the deploy finishes, then production is updated and
    the check in `land-pr` can confirm it is Ready.

## Verification plan

Layers follow `tdd-change` and `duplaweb`'s `TESTING.md`; there is no database, so
no Supabase tests.

| # | Criterion | Layer |
|---|-----------|-------|
| 3, 4 | WhatsApp link and message builder | Unit (Vitest): a pure function that builds the URL and the encoded message |
| 1, 2, 5, 6, 10, 11, 13 | Content, layout, keyboard, console | End to end (Playwright) at 360, 768 and 1280 px |
| 7 | Prices match the confirmation list | Unit: prices come from one data file; test compares against the list the owner approved |
| 8 | Images | Script check in CI: alt text present, file size under 300 KB |
| 9, 12 | Performance, accessibility | Lighthouse and axe, run on the preview deploy |
| 14, 15, 16 | DNS, SSL, metadata, deploy | Manual checklist on the live site, plus the Vercel deploy status |

Final manual check before announcing: open the live site on a real phone, tap every
button, and send one real WhatsApp message to the business number.

## Dependencies and blockers

Code is not the critical path; these are:

| Item | Who | Needed by |
|------|-----|-----------|
| Node upgrade on the developer machine (Node 16 is too old for current Next.js) | Owner | Before scaffolding |
| Photos chosen for the gallery (8–12), without minors' faces or crests, clean files rather than Instagram screenshots | Owner and Javiera | Saturday |
| Prices to show (or none), confirmed current | Javiera | Saturday |
| Contact email, or decision to omit | Javiera | Saturday |
| Vercel plan: confirm that the account used for `duplaweb` may host a business site, and its terms (ADR-0001, "to verify") | Owner | Saturday |
| DNS: point `marcandoando.cl` and `www` to Vercel at NIC Chile, keeping any email records untouched (ADR-0001 action 7) | Owner | Saturday night, DNS can take hours to propagate |

## Decisions the owner confirmed (2026-10-23)

- "Live" means useful and without errors, with fewer features.
- WhatsApp is `https://wa.me/56982661835`.
- Real photos without children's faces or school crests may be used.
- The Vercel account used for `duplaweb` hosts this site.
- The owner can change the DNS at NIC Chile this weekend.

## Open questions

1. Which photos? The owner picks 8–12; I can prepare them (resize, convert, write
   `alt` text) once the files are in a folder.
2. Show "desde" prices on the cards, or none at launch? The Instagram prices are
   t-shirts from $7.000, hoodies from $9.900, bottles from $7.000, pencil cases from
   $5.500, socks $7.000; they appear in `CLAUDE.md` as seen, not as confirmed.
3. Is a preview image for social sharing (Open Graph) the logo, or a collage?
4. Does the "Cotizar" message ask the visitor anything (name, product, quantity), or
   is it a fixed greeting? Proposed: a fixed greeting that names the product and
   asks them to tell their idea.

## Handover to v1

When v1 is ready, this page is replaced, not extended: the home page of spec 006
takes its place, and the content here moves into the database through the admin.
Nothing in launch 0 should make that harder; its copy and images are kept in
single data files for that reason.
