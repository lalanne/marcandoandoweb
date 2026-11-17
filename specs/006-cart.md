# 006 — Shopping Cart ("Carrito")

**Status:** draft

Sources: [Req §1 and §5](../docs/requirements.md) ("Solicitar productos
personalizados (Carrito)"; "solo si no es complejo, carrito"), open question 5,
[spec 000](000-overview.md) (decision 1), [spec 001](001-content-model.md) (Product,
prices), [spec 002](002-launch-0.md) (product page, header, WhatsApp messages,
catalog cache, criteria 55 to 66 and 97 to 102), [ADR-0001](../docs/adr/0001-web-stack.md).
Issue #171. Interpretations and assumptions to confirm are labelled
**(interpretation)**.

## Why this exists

Javiera asks for a shopping cart. On 2026-10-23 the owner left it out of v1 and
planned to revisit it after launch (spec 000, decision 1). The site has launched, and
this spec is that revisit.

Today a customer can ask about one product at a time: "Pedir por WhatsApp" on a
product page opens WhatsApp with a message that names that product. Customers who
want several things (a hoodie, two bottles and socks for a course) have to send
several messages or type the list themselves. A cart lets them pick several products,
each with its color, size, quantity and personalization, check the list and its price,
and send it all in **one** WhatsApp message.

## Decisions (owner, 2026-11-16)

This is the **first version** of the cart.

1. **It ends in WhatsApp.** There is no online payment, checkout, order record or
   customer account. "Enviar pedido por WhatsApp" opens WhatsApp with the whole list
   pre-filled; the conversation, the final price and the payment stay in WhatsApp as
   today.
2. **A total when possible, otherwise an estimate.** When every item in the cart has a
   price, the cart shows a **total**. When any item has no price, it shows an
   **estimate**, and tells the customer plainly that it is an estimate, not the
   total.
3. **No uploads.** The customer cannot attach an image or a file to an item; they send
   it in WhatsApp.
4. **No cart on the company pages.** `/empresas` and the pages of Empresas items keep
   their quote buttons as they are.
5. **Quantity discounts, packs and minimums are handled in WhatsApp.** The cart
   multiplies the price per unit shown on the site by the quantity, nothing more.

**Second round (owner, 2026-11-16), after the design canvas**
(https://claude.ai/artifact/LFf2H8GtPiTaF5tSdD5Q1t):

6. **Personalization stays:** one optional free-text field per item.
7. **"Pedir por WhatsApp" stays on the product page**, for a single product, as a
   **white secondary** button under "¿Solo quieres este producto?". "Agregar al
   carrito" becomes the yellow main button.
8. **The limits are accepted:** 20 lines, 1 to 999 per line, 200 characters of
   personalization.
9. **The wording is accepted as drafted** in this spec. Javiera can ask for changes
   later as copy edits.
10. **The look is the canvas's:** the "Arma tu pedido" box on the product page, the
    round cart button with a pink badge in the header, the cart page with one card per
    line, and the three total cases.

## Scope

| In | Out |
|----|-----|
| "Agregar al carrito" on the product page of every available Personas product and pack, with its color, size, quantity and an optional personalization text | Online payment, checkout, invoices, receipts (decision 1) |
| A cart link in the header of the people's pages, with the number of items | Customer accounts, saved carts across devices, order history, orders stored in the database |
| A cart page, `/carrito`: change quantities, remove items, empty the cart, see the total or the estimate | Image or file uploads (decision 3) |
| "Enviar pedido por WhatsApp": one pre-filled message with every item and the total or estimate | A cart on `/empresas` or Empresas items (decision 4) |
| The cart kept in the visitor's browser, surviving reloads | Quantity discounts, pack prices, minimum quantities, wholesale prices (decision 5) |
| Items that were unpublished, made unavailable or changed since they were added are flagged, not sent | Stock control, shipping costs, delivery dates |
| | Adding to the cart from a card on the home page (the card's action stays "Ver") |

## How it works

### Where the cart lives

- **In the visitor's browser** (`localStorage`), on that device and browser only. It
  needs no account, no cookie sent to the server and no database table. Nothing the
  visitor types in the cart (quantities, personalization) is sent to the site's server
  or to any analytics; it leaves the browser only inside the WhatsApp message the
  visitor chooses to send.
- **What is stored per item:** the product's slug, the chosen color name and size
  label (when the product has them), the quantity and the personalization text. Not
  the name or the price: those are read from the catalog when the cart is shown, so a
  price the admin changes shows up in the cart (see "Stale items").
- **Same item twice.** Adding a product with the same color, size and personalization
  as an item already in the cart adds to that item's quantity instead of making a new
  line.
- **Limits** (decision 8): at most 20 lines, a quantity from 1 to 999 per line, and a
  personalization of at most 200 characters. They keep the WhatsApp message to a
  length WhatsApp opens reliably. Reaching a limit shows a Spanish message and changes
  nothing.
- **No expiry.** The cart stays until the visitor removes its items or empties it.
  "Enviar" does not empty it, because the site cannot know whether the message was
  sent (see the cart page).
- **"Enviar" is remembered.** Pressing "Enviar pedido por WhatsApp" stores a flag with
  the cart, so the cart page can ask "¿Ya enviaste tu pedido?" when the visitor comes
  back. Any change to the cart (add, change a quantity, remove) clears the flag;
  emptying the cart clears it too.
- **Several tabs.** A change made in one tab of the same browser (add, change, remove,
  empty) shows in the other open tabs' header count and cart page without a reload
  (the browser's `storage` event).
- **The stored format has a version number**, so a later version of the cart can read
  or discard an older one; an unknown or invalid version counts as damaged (empty
  cart).
- **Unreadable storage.** If the browser blocks storage (some private modes) or the
  stored cart is damaged, the cart starts empty and the site works as before; nothing
  crashes. If storage is blocked, "Agregar al carrito" says the cart cannot be used in
  this browser and points to "Pedir por WhatsApp".

### On the product page

On `/productos/<slug>` of a published, available **Personas** product or pack, after
the characteristics and the description, a white box with a dark outline titled
**"Arma tu pedido"** (decision 10) holds, in this order:

- **Color · elige uno**: one choice among the product's colors, each a pill with its
  swatch and its name written; the chosen one has a thicker outline, a pale yellow fill
  and a check mark. Shown only when the product has colors, and then **required**.
- **Talla o tamaño · elige una**: one choice among the product's sizes, as pills; the
  chosen one is yellow with a thicker outline. Shown only when it has sizes, and then
  **required**. Colors and sizes are toggle buttons (`aria-pressed`) or radio buttons,
  so a screen reader hears which one is chosen.
- **Cantidad**: 1 by default, with "−" and "+" buttons and the number between them.
  The number can also be typed; anything that is not a whole number from 1 to 999 shows
  "Escribe una cantidad entre 1 y 999." and adds nothing. "−" is disabled at 1.
- **Personalización (opcional)**: a text field with the hint "Nombre, curso, frase o
  idea. Las imágenes nos las mandas por WhatsApp." and a counter ("5 de 200").
- **"Agregar al carrito"**: the yellow main button with the cart icon. Pressing it
  without a required color or size shows a Spanish error next to that field, moves
  focus to the first one, and adds nothing. On success a confirmation line appears
  under the button, "Agregado al carrito" with a check mark and a "Ver carrito" link,
  announced politely; the header count goes up; the visitor stays on the page and the
  choices stay as they were, so the same item can be added again or changed.

After the box, the line "¿Solo quieres este producto?" and **"Pedir por WhatsApp"**
as a **white secondary** button (decision 7), with the same message as today (spec 002,
criterion 55). Only its look changes: before this spec it was the yellow main button.
- An **unavailable** product shows "no disponible por ahora" and neither button, as
  today (criterion 59). An **Empresas** item's page has no cart controls (decision 4).
- **Without JavaScript** the cart controls are not shown (they need the browser's
  storage); "Pedir por WhatsApp" still works.

### The header

- On the people's pages (home, collection views, Personas product pages, `/carrito`)
  the header shows a cart link to `/carrito`, after "Admin" on the logo's row: a round
  white button (48 px, dark outline and offset shadow, like the site's buttons; yellow
  on `/carrito` itself) with a cart icon, and a pink badge with the number of items.
  Its accessible name is "Carrito, 3 productos" ("Carrito, 1 producto"; "Carrito,
  vacío" when empty, with no badge). It is always shown, also when the cart is empty
  (decision 10).
- **The count** is the sum of the quantities of **every** stored line, including lines
  left out of the order (see "Stale items"): they are still in the cart until the
  visitor removes them, and the cart page explains why they are left out.
- The count is read in the browser after the page loads, so the header stays served
  from the cache (spec 002, criteria 97 to 102). Until it is read, the badge is empty
  and the header does not change height or jump.
- `/empresas`, Empresas product pages, `/entrar` and `/panel` show no cart link.

### The cart page, `/carrito`

- Title "Tu carrito", in the people's look. Not in the sitemap, and marked `noindex`.
- **Empty:** "Tu carrito está vacío." and a link "Ver productos" to `/#productos`.
- **Each line** is a white card with a dark outline: the cover photo, the name (a link
  to its product page), the chosen color and size, the personalization, the price per
  unit ("$7.000 c/u", or "Precio por cotizar" when the product has none), the line's
  subtotal when it has a price ("Por cotizar" otherwise), a quantity control ("−", the
  number, "+"; "−" disabled at 1) and "Quitar". A line left out of the order (see
  "Stale items") has a dashed outline, a faded photo, the reason and "No se incluye en
  el pedido.", no quantity control, and a "Quitar" button.
- Under the list, the total box, then "Enviar pedido por WhatsApp" (yellow main
  button), "Vaciar carrito" and "← Seguir viendo productos" (to `/#productos`).
- **Total or estimate** (decision 2), under the list:
  - **Every line has a price:** "Total: $21.900", followed by the note "Precios por
    unidad. Los descuentos por cantidad y al por mayor se conversan por WhatsApp."
  - **Some lines have a price, some do not:** "Total estimado: $14.000", followed by
    "Esto no es el total: 1 producto no tiene precio publicado y se cotiza por
    WhatsApp." (with the right singular or plural), and the same note on discounts.
  - **No line has a price:** no amount, only "El precio se cotiza por WhatsApp."
  - The amount is the sum of price per unit times quantity of the lines that have a
    price, in CLP with a dot as thousands separator.
- **"Enviar pedido por WhatsApp"** opens `https://wa.me/56982661835` with the message
  below. After it is pressed, the page shows "¿Ya enviaste tu pedido? Vaciar carrito".
- **"Vaciar carrito"** is always available when the cart has items, and asks for
  confirmation ("¿Vaciar el carrito? Se quitan todos los productos.") before emptying.
- The page reads the catalog from the same cache as the rest of the site (spec 002,
  criteria 97 to 102): the published Personas products' names, prices, photos,
  colors, sizes and availability are built into it, and the browser matches the
  stored items against them. Visiting it never reads the database.

### Stale items

When the cart is shown, each stored item is checked against the current catalog:

| What changed | What the cart shows | In the total and the message? |
|---|---|---|
| The product was unpublished, deleted, or moved to Empresas | "Este producto ya no está en el catálogo." and "Quitar" | No |
| The product is unavailable | "No disponible por ahora." and "Quitar" | No |
| The chosen color or size is no longer offered | "El color Rosado ya no está disponible. Quítalo y elige otro en la página del producto." (or the size) | No |
| The price changed, was added or was removed | The current price | Yes, with the current price |
| The name or photos changed | The current name and photos | Yes |

When some lines are left out, the "Enviar" button says how many are left out ("2
productos no se incluyen en el pedido"). When every line is left out, "Enviar" is
disabled with that explanation.

### The WhatsApp message

In the customer's voice, like the other messages (spec 002). For a cart with two
lines and a total:

```
Hola, Marcando Ando. Quiero hacer este pedido:

1. Polerón escolar
   Color: Azul marino · Talla: 12 · Cantidad: 2
   Personalización: "4°B 2026"
   $9.900 c/u · Subtotal: $19.800

2. Botella metálica
   Cantidad: 1
   Precio por cotizar

Total estimado: $19.800 (1 producto por cotizar)
Las imágenes y los detalles te los mando por acá.
```

- The total line follows the same three cases as the cart page: "Total: $X", "Total
  estimado: $X (N producto(s) por cotizar)", or "Precio por cotizar".
- Lines without a color, size or personalization leave that part out.
- Stale lines (table above) are not included.
- The message is URL-encoded into the `text` parameter of the WhatsApp link.

## Seed and test data

`supabase/seed.sql` (fake data only, never applied to production) gets what the tests
need, if it does not have it already: a Personas product with a price, colors and
sizes; one with a price and no colors or sizes; one with no price; a pack; an
unavailable product; and an Empresas item. Tests that change a product to make a cart
line stale do it in the test and call `refreshCatalog` (`tests/e2e/supabase.ts`), as
`CLAUDE.md` says.

## Acceptance criteria

**Adding to the cart**

1. Given a published, available Personas product with colors Rosado and Celeste, sizes
   "4" and "6" and a price of 7000, when a visitor opens its page, then after the
   characteristics and the description they see the "Arma tu pedido" box with a color
   choice, a size choice, a quantity of 1, an optional personalization field and an
   "Agregar al carrito" button; after the box, "¿Solo quieres este producto?" and a
   white "Pedir por WhatsApp" button whose message is unchanged (spec 002, criterion
   55 keeps passing).
2. Given that page, when the visitor presses "Agregar al carrito" without choosing a
   color or a size, then a Spanish error shows next to each missing choice, focus
   moves to the first one, and nothing is added.
3. Given that page, when the visitor chooses Rosado and "6", sets the quantity to 2,
   types "Sofía" and presses "Agregar al carrito", then a line "Agregado al carrito"
   with a "Ver carrito" link appears under the button and is announced politely, the
   header count reads 2, and the visitor stays on the page with the choices kept.
4. Given a product with no colors and no sizes, when its page opens, then it shows no
   color or size choice and the product can be added with only a quantity.
5. Given an item already in the cart, when the visitor adds the same product with the
   same color, size and personalization, then the cart has one line whose quantity is
   the sum; with any of them different, it has a new line.
6. Given an unavailable product, an Empresas item, or a product page opened without
   JavaScript, when the page loads, then there are no cart controls; the unavailable
   product shows no order button (criterion 59), the Empresas item shows its quote
   button (spec 002, criterion 75) and without JavaScript "Pedir por WhatsApp" still
   works.
7. Given the limits (20 lines, quantity 1 to 999, personalization of 200 characters),
   when the visitor tries to go past one, then a Spanish message explains it and the
   cart does not change.

**Header**

8. Given a people's page (home, a collection view, a Personas product page,
   `/carrito`) at 360 and 1280 px, when it loads, then the header has a cart link to
   `/carrito` with the number of items (the sum of the quantities of every stored line,
   left-out lines included) and the accessible name "Carrito, N productos" ("Carrito,
   1 producto", "Carrito, vacío" with no badge); the header does not change height
   when the count appears, and there is no horizontal scroll.
9. Given `/empresas`, an Empresas product page, `/entrar` or `/panel`, when it loads,
   then there is no cart link.

**The cart page**

10. Given an empty cart, when `/carrito` loads, then it shows "Tu carrito está vacío."
    and a "Ver productos" link to `/#productos`, and no total and no "Enviar" button.
11. Given a cart with items, when `/carrito` loads, then each line shows the photo, the
    name linking to its product page, the color, the size, the personalization, the
    price per unit or "Precio por cotizar", the subtotal when there is a price, a
    quantity control and "Quitar".
12. Given a line, when the visitor uses "−" or "+" or presses "Quitar", then the
    quantity, the subtotal, the total and the header count update at once; "−" at 1 is
    disabled, and removing the last line shows the empty cart.
13. Given a cart with items, when the visitor presses "Vaciar carrito", then a
    confirmation is asked; on confirming the cart is empty, on cancelling nothing
    changes.
14. Given a cart, when the page is reloaded or the visitor comes back later in the same
    browser, then the cart has the same lines; and given storage that is blocked or
    damaged, when a page loads, then the cart is empty and the page works without
    errors.

**Total or estimate**

15. Given a cart where every line has a price (7.000 × 2 and 7.900 × 1), when
    `/carrito` loads, then it shows "Total: $21.900" and the note on quantity
    discounts.
16. Given a cart where one line has a price (7.000 × 2) and one does not, when
    `/carrito` loads, then it shows "Total estimado: $14.000" and "Esto no es el total:
    1 producto no tiene precio publicado y se cotiza por WhatsApp."; with two lines
    without a price, the text is plural.
17. Given a cart where no line has a price, when `/carrito` loads, then it shows no
    amount, only "El precio se cotiza por WhatsApp."

**Sending**

18. Given a cart with lines, when the visitor presses "Enviar pedido por WhatsApp",
    then `https://wa.me/56982661835` opens with the message of "The WhatsApp message":
    every included line with its name, color, size, quantity, personalization, price or
    "Precio por cotizar", and the total line of the matching case (criteria 15 to 17).
19. Given the visitor has pressed "Enviar", when they come back to `/carrito` (also
    after a reload), then the cart still has its lines and the page offers "¿Ya
    enviaste tu pedido? Vaciar carrito"; when they then change the cart, the question
    is gone until "Enviar" is pressed again.

**Stale items**

20. Given a cart with a product that is then unpublished, deleted or moved to
    Empresas, when `/carrito` loads after the catalog is refreshed, then that line
    shows "Este producto ya no está en el catálogo." and "Quitar", and it is left out
    of the total and the message.
21. Given a cart with a product that is then made unavailable, or whose chosen color or
    size is removed, when `/carrito` loads, then the line says so (table in "Stale
    items") and is left out of the total and the message; "Enviar" says how many
    products are left out, and is disabled when all are.
22. Given a cart with a product whose price or name the admin then changes, when
    `/carrito` loads, then the line, the total and the message use the new price and
    name.

**Cache, privacy and quality**

23. Given `/carrito` and every page with the cart link, when they are requested, then
    no request reads the database (spec 002, criteria 97 to 101 keep passing), and
    saving a product in the panel refreshes `/carrito`'s catalog like the other pages.
24. Given a visitor using the cart, when they add, change and send items, then no
    request to the site's server or to a third party carries the cart's contents; they
    leave the browser only in the WhatsApp link.
25. Given `/carrito` and a product page with the cart controls at 360 and 1280 px, when
    used with the keyboard only, then every control can be reached with a visible focus
    and is at least 44 by 44 px, labels and messages are in informal Chilean Spanish,
    text contrast is at least 4.5:1, axe reports no serious or critical violations, and
    there is no horizontal scroll.
26. Given the sitemap and `/carrito`, when checked, then `/carrito` is not in the
    sitemap and has `noindex`.

**Added with the second round of decisions (2026-11-16)**

27. Given the quantity field on a product page or a cart line, when the visitor types
    5, then the quantity is 5; when they type 0, 1000, "dos" or leave it empty, then
    "Escribe una cantidad entre 1 y 999." shows and the cart does not change.
28. Given two tabs of the same browser on people's pages, when the visitor adds,
    changes or removes an item in one, then the other's header count and, if open,
    its cart page show the change without a reload.
29. Given a stored cart with an unknown version number, or one that is not valid,
    when a page loads, then the cart is empty, no error shows, and adding an item works
    and stores a valid cart.

## Verification plan

| # | Criterion | How |
|---|-----------|-----|
| 5, 7, 14 (damaged data), 27, 29 | Merge rule, limits, typed quantities, reading stored data and its version | Unit (Vitest): the pure cart functions (add, merge, change quantity, parse a typed quantity, remove, parse and validate stored data, the "sent" flag cleared on change) |
| 27, 28, 29 | Typed quantity, several tabs, unknown version | End to end: type valid and invalid quantities; two pages in one browser context; a stored value with another version |
| 15, 16, 17, 18, 20 to 22 (rules) | Total, estimate, stale items, message text | Unit: a pure function that takes the stored items and the catalog and returns the lines, which are left out and why, the total case and amount, and the message text; CLP formatting and singular/plural included |
| 1 to 4, 6 | Product page controls and errors | End to end (Playwright) at 360 and 1280 px on seeded products (with and without colors and sizes, unavailable, Empresas); one test with JavaScript disabled |
| 8, 9 | Header link and count | End to end at 360 and 1280 px, including no layout shift when the count appears and no link on the company pages, `/entrar` and `/panel` |
| 10 to 13, 19 | Cart page | End to end: add from product pages, change, remove, empty with confirm and cancel, come back after "Enviar" |
| 14 | Persistence | End to end: reload keeps the cart; a test with a damaged stored value and one with storage blocked |
| 18 | Sending | End to end: the "Enviar" link is read (not followed) and its decoded `text` matches the expected message for each total case |
| 20 to 22 | Stale items | End to end: change a seeded product directly in the database, call `refreshCatalog` (`tests/e2e/supabase.ts`) and load `/carrito` |
| 23 | Cache | End to end, as spec 002's cache tests: no database read on a request to `/carrito` or a page with the cart link, and the catalog test that goes through each panel action covers `/carrito` |
| 24 | Privacy | End to end: record every request while using the cart and check none carries the cart's contents, except the WhatsApp link |
| 25 | Accessibility | End to end with axe at 360 and 1280 px, keyboard-only walk-through |
| 26 | Not indexed | End to end: the sitemap and the page's `robots` meta |

No database, migration or row-level security change, so there are no integration
tests. Seed and fixtures use fake products only (see "Seed and test data"). Test
titles carry the criterion's ID, `[006-AC1]` to `[006-AC29]`, for the traceability
check. The changed look of "Pedir por WhatsApp" (white instead of yellow) is checked
in the criterion 1 test; spec 002's tests of that button check its message and
keep passing unchanged.

## Changes to other specs

In the same PR as this spec, so they take effect when it is approved:

- **Spec 000**, decision 1 and the v1 scope table: the cart is no longer out; it points
  here.
- **Spec 001**, "Customers, orders, carts, reviews": carts are kept in the browser
  (this spec); customers, orders and reviews stay out.
- **Spec 002**: dated amendment notes under the product page (cart controls before
  "Pedir por WhatsApp") and the header (the cart link on the people's pages), pointing
  here.
- **`docs/requirements.md`**, open question 5: the owner's decisions of 2026-11-16,
  below Javiera's text, which is not edited.

## Constraints

- No new service, library for state or payment provider (ADR-0001). Browser storage
  and the existing catalog cache only.
- WhatsApp stays the main call to action; the cart is a way to write a better first
  message, not a checkout.
- Visible text is informal Chilean Spanish ("tú"). Prices in CLP with a dot as
  thousands separator.
- Phone first; the cart page and the product page controls are designed at 360 px.

## Open questions

None. The five questions of the first draft were answered by the owner on 2026-11-16
(decisions 6 to 10): personalization kept, "Pedir por WhatsApp" kept as a white
secondary button, the limits and the wording accepted, the canvas's look adopted.
