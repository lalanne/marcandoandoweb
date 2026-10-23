# Marcando Ando — Website

Website for **Marcando Ando**, a Chilean business that personalizes clothing and accessories: t-shirts (*poleras*), hoodies (*polerones*), mugs (*tazones*), bottles, socks, pencil cases, caps, aprons, Christmas ornaments and more. Customers ask for their own design, name, course or idea.

- Instagram: [@marcando_ando](https://www.instagram.com/marcando_ando/)
- Orders: WhatsApp (`https://w.app/VMJF8o`) or Instagram DM

## Goal

Show the products and real work, and make it very easy to ask for a personalization (mainly through WhatsApp). The site is written in **Spanish** and prices are in **Chilean pesos (CLP)**. Everything else in this repo (code, docs, issues, PRs) is in English.

## Planned sections

1. **Hero:** logo, main tagline and a WhatsApp button.
2. **Products:** t-shirts, hoodies, mugs, bottles, socks, pencil cases, Christmas ornaments, aprons, etc., with a "from" price.
3. **Gallery:** real work.
4. **How to order:** send your idea → design and mockup → printing → delivery or pick-up.
5. **Schools and groups:** uniforms, bottles, labels, class-generation t-shirts and matching "alianza" shirts, with quantity discounts.
6. **Seasons:** Christmas, Father's Day, the World Cup, etc.
7. **Contact:** WhatsApp, Instagram and a form that opens WhatsApp with a pre-filled message.

## Brand

| Color      | Hex       |
| ---------- | --------- |
| Pink       | `#E8647F` |
| Yellow     | `#F0B242` |
| Teal       | `#4FB0B0` |
| Purple     | `#9565C4` |
| Night blue | `#141824` |
| Cream      | `#FBF5E9` |

Style: playful, rounded and hand-made, like the logo (chunky rounded letters, colored strokes). The hex values were estimated from the logo and can be adjusted.

## Stack

Next.js (App Router), React, TypeScript and Tailwind CSS, with Supabase (Postgres, Auth, Storage) as the backend and Vercel for hosting. It is the same web stack as `duplaweb`, so one set of tools covers all the projects. The client needs an editable catalog and an admin panel, which a static site cannot give. See [ADR-0001](docs/adr/0001-web-stack.md) for the decision and the alternatives that were considered.

## Structure

```
marcandoandoweb/
├── assets/        # logo and images (the originals are Instagram screenshots)
├── README.md
└── CLAUDE.md
```

`index.html`, `css/` and `js/` will be added when the site is built.

## Development

There is no app yet. Setup and run commands will be added when it is scaffolded. Work is planned in `specs/` and tracked as GitHub issues.

## Open items

- Confirm the full WhatsApp number.
- Get good-quality product photos. The current ones are Instagram screenshots.
- Confirm with the client that they may use photos showing minors' faces and school crests.
- Decide whether to show prices or only "ask for your design".
- Optimize the images in `assets/` (about 5 MB each).
