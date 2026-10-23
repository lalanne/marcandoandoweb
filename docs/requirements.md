# Client requirements — Marcando Ando website

Source: text sent by Javiera, CEO of Marcando Ando, received 2026-10-23.
The original is in Spanish and is reproduced verbatim in the second half of this
document. The first half is an English summary and the open questions. If the
two disagree, the original wins. Specs in `specs/` are derived from this
document and refer back to it.

Reference site she likes: <https://uniformesgirasol.cl/> (not yet reviewed).

## Summary (English)

**Goal.** A website for Marcando Ando ("Marcamos tus ideas") that shows the
catalog of personalized products and finished work, and makes quoting and
buying easy. It should feel creative, close, happy and personal.

**Visual identity.** Use the official logo and the brand colors: pink, teal,
yellow, purple and navy. Prefer white or light backgrounds so products stand
out. Cheerful, modern and tidy, not overloaded. Real photos of real products.

**Home page.** Logo; navigation (products, quote, offers, finished work,
contact); a main collage image of personalized products; a prominent
"Cotizar por WhatsApp" button at the bottom left; at the end, a link to
Instagram, a contact email (she does not have one yet) and WhatsApp again.

**Catalog.** Ten categories: bottles, t-shirts, hoodies, pencil cases, socks,
school products, gifts, products for courses and graduating classes,
products for special dates, clothing labels. New categories and products can
be added without redesigning the site. Each product has a name, real photos,
a description, a reference or "from" price, personalization options (for
example a mockup saying "your logo or design here") and size, color and
material information where relevant. Prices are editable from the admin.

**Product page.** Photos, available designs, detailed description, price,
personalization options (including the print size), minimum quantities if any
and a quote button. A product can have several variants (for example a bottle
with different designs, names, colors and themes).

**Gallery of designs and finished work** (especially important). Finished
products, individual graphic designs, grouped by theme: schools and courses,
personalized gifts, sports teams, Christmas and other special dates. New
designs are added constantly. Each design can relate to one or more catalog
products (for example a class design used on a bottle, a pencil case, a
t-shirt or a hoodie).

**Schools and courses section.** Gifts for teachers and classmates, products
for school generations, bottles with names, pencil cases, class t-shirts and
hoodies, designs for school activities, graduations and farewells. Parents
and course representatives should easily find ideas for group gifts.

**Functional requirements.** Responsive (phone, tablet, computer); simple
navigation; catalog by category; product search; filters by product type and
theme; direct WhatsApp buttons; Instagram integration; admin panel to add
products and edit prices, photos and descriptions; new categories; updatable
gallery; image optimization for fast loading; basic SEO; own domain; SSL.

**Quotes and orders.** First stage: the site works mainly as a catalog and
quoting channel, and a cart "only if it is not complex". The customer picks a
product and is sent to WhatsApp. The message should be pre-filled with product
name, chosen variant or design, quantity and requested personalization.
Example: "Hola, quisiera cotizar 20 botellas personalizadas para mi curso. Me
interesa el diseño que aparece en la web."

**Contact.** WhatsApp +56 9 8266 1835 (`https://wa.me/56982661835`), Instagram
`Marcando_ando`, a floating WhatsApp button, a direct Instagram link and an
optional contact form.

**Administration.** She must not depend on the designer for each change. The
admin must let her add and delete products, change prices, photos and
descriptions, create categories, highlight products, add designs to the
gallery and mark products as available or temporarily unavailable. The
developer must also teach her to use it.

**Technical and commercial scope requested.** Design and development, mobile
adaptation, domain setup, hosting, SSL certificate, forms and contact links,
speed optimization, basic SEO, training to manage the site, delivery of
access and ownership of the site, and information about maintenance and
renewal costs.

## Open questions

These need an answer from Javiera or a decision by the developer before the
related spec can be approved.

1. **Contact email.** She says she does not have one yet. Needed for the
   footer and the optional contact form.
2. **Domain name.** ~~Which one, and who registers it?~~ **Resolved
   2026-10-23:** Javiera registered `marcandoando.cl` at NIC Chile, in her
   name. Still open: where its DNS is hosted and which email provider to use
   (see ADR-0001, action item 7).
3. **WhatsApp link.** The requirements give `wa.me/56982661835`; Instagram
   uses a `w.app/VMJF8o` short link. Confirm which is the canonical one.
4. **Price example.** "Botella metálica, 600 mil" is probably a typo
   (6.000?). Confirm real prices; all prices in CLP.
5. **Cart.** She wants it "only if it is not complex". ~~Decide whether it is in
   the first release.~~ **Decided by the owner 2026-10-23:** not in v1; catalog
   plus WhatsApp quotes only, cart revisited after launch (spec 000).
6. **"Ofertas" menu item.** The menu lists offers, but nothing else describes
   an offers section. **Working answer 2026-10-23 (owner):** a product flag
   with old and new price, shown in a filtered view (spec 000). Still needs
   Javiera to confirm what she means (discounted products, seasonal promotions).
7. **Admin users.** ~~One admin (Javiera), or several people?~~ **Decided by the
   owner 2026-10-23:** one admin role in v1.
8. **Photos.** Real product photos are needed at good quality. The ones we
   have are Instagram screenshots. Who supplies them and how?
9. **Photos of minors and school crests.** Many existing photos show children
   and school crests. Is it acceptable to publish them? Under what terms?
10. **Costs and ownership.** Hosting, domain renewal and maintenance costs
    (Vercel and Supabase paid plans are likely needed for a business site,
    to be verified), who pays, and how ownership of the accounts is handed
    over.
11. **Reference site.** What exactly does she like about uniformesgirasol.cl
    (look, catalog structure, school focus, ordering flow)? We have not been
    able to open it yet.
12. **Original text.** Section 4 has no heading in the original; the list that
    starts with "La web debe contar con:" appears to be that section
    (functional requirements). Confirm.

## Original text (Spanish, verbatim)

REQUERIMIENTOS PARA EL DESARROLLO DE LA WEB

Marcando_ando – "Marcamos tus ideas"

1. Objetivo de la página web

Crear una página web para Marcando_ando que permita exhibir nuestro catálogo de productos personalizados, mostrar los diseños realizados y facilitar la cotización y compra de productos.

La web debe transmitir creatividad, cercanía, alegría y personalización.

Queremos que los clientes puedan:

- Catalogo de productos con fotografías y diseños reales e inspirarse con trabajos realizados.
- Solicitar productos personalizados (Carrito)
- Contactarnos directamente por WhatsApp o Instagram.

La página debe ser visualmente atractiva, moderna, intuitiva y fácil de administrar.

2. Identidad visual

La web debe respetar la identidad de Marcando_ando.

- Utilizar nuestro logo oficial.
- Incorporar los colores de nuestra marca: rosado, turquesa, amarillo, morado y azul marino.
- Preferir fondos blancos o claros para destacar los productos.
- Mantener una estética alegre, moderna y ordenada.
- Utilizar fotografías reales de nuestros productos.
- Evitar que la página se vea sobrecargada.

La identidad visual debe ser consistente en todas las secciones.

3. Estructura de la página web

A. Página de inicio

Debe incluir:

- Logo de Marcando_ando.
- Menú de navegación (productos, cotización, ofertas, trabajos realizados contacto)
- Imagen principal atractiva con productos personalizados (cualquiera hora, buscaré un collage)
- Botón destacado abajo a la izquierda de "Cotizar por WhatsApp".
- Acceso a Instagram al final junto con un correo que no tengo aún + WhatsApp de nuevo

B. Catálogo de productos

1. Botellas personalizadas.
2. Poleras personalizadas.
3. Polerones personalizados.
4. Estuches personalizados.
5. Calcetines personalizados.
6. Productos escolares.
7. Regalos personalizados.
8. Productos para cursos y generaciones.
9. Productos para fechas especiales.
10. Etiquetas para ropa

El catálogo debe permitir agregar nuevas categorías y productos sin necesidad de rediseñar la página.

Cada producto debe contar con:

- Nombre del producto.
- Fotografías reales.
- Descripción.
- Precio referencial o precio desde.
- Opciones de personalización (onda un montaje de "tu logo o tu diseño aquí)
- Información sobre tamaños, colores y materiales, cuando corresponda. (Botella metálica, 600 mil por ejemplo)

Los precios deben ser editables desde el administrador de la web.

C. Ficha individual de producto

Al seleccionar un producto, el cliente debe poder acceder a una página con mayor información.

Debe incluir:

- Fotografías del producto.
- Diferentes diseños disponibles.
- Descripción detallada.
- Precio.
- Opciones de personalización (indicar el tamaño del estampado sirve)
- Información sobre cantidades mínimas, si corresponde.
- Botón de cotización.

La ficha debe permitir mostrar diferentes variantes de un mismo producto.

Por ejemplo, una botella puede tener diferentes diseños, nombres, colores y temáticas.

D. Galería de diseños y trabajos realizados

Esta sección es especialmente importante.

Queremos mostrar los diseños que hemos creado y los productos que hemos realizado para nuestros clientes.

La galería debe permitir:

- Mostrar fotografías de productos terminados.
- Mostrar diseños gráficos individuales.
- Agrupar los trabajos por temática.
- Mostrar diseños para colegios y cursos.
- Mostrar regalos personalizados.
- Mostrar productos para equipos deportivos.
- Mostrar productos para Navidad y otras fechas especiales.
- Incorporar nuevos diseños constantemente.

Idealmente, cada diseño debe poder relacionarse con uno o más productos del catálogo.

Por ejemplo, un diseño de una generación escolar podría utilizarse en una botella, un estuche, una polera o un polerón.

E. Sección de productos para colegios y cursos

Crear una sección especial para colegios, cursos y generaciones.

Debe permitir mostrar:

- Regalos para profesores.
- Regalos para compañeros.
- Productos para generaciones escolares.
- Botellas personalizadas con nombres.
- Estuches personalizados.
- Poleras y polerones de curso.
- Diseños para actividades escolares.
- Productos para licenciaturas y despedidas.

La idea es que los apoderados o representantes de los cursos puedan encontrar fácilmente ideas para regalos grupales.

La web debe contar con:

- Diseño responsive, adaptable a celulares, tablets y computadores.
- Navegación sencilla.
- Catálogo organizado por categorías.
- Buscador de productos.
- Filtros por tipo de producto y temática.
- Botones de contacto directo por WhatsApp.
- Integración con Instagram.
- Panel de administración para agregar productos.
- Posibilidad de modificar precios, fotografías y descripciones.
- Posibilidad de agregar nuevas categorías.
- Galería actualizable.
- Optimización de imágenes para una carga rápida.
- Configuración básica de SEO.
- Dominio propio.
- Certificado de seguridad SSL.

5. Cotizaciones y pedidos

En una primera etapa, queremos que la web funcione principalmente como catálogo y canal de cotización y solo si no es complejo, carrito

El cliente debe poder seleccionar un producto y ser dirigido a WhatsApp para realizar su consulta.

Idealmente, el mensaje de WhatsApp debe incluir automáticamente:

- Nombre del producto.
- Variante o diseño seleccionado.
- Cantidad.
- Personalización solicitada.

Ejemplo:

"Hola, quisiera cotizar 20 botellas personalizadas para mi curso. Me interesa el diseño que aparece en la web".

De esta manera, podremos gestionar los pedidos de forma personalizada.

6. Información de contacto

Incluir:

- WhatsApp: +56 9 8266 1835
- Instagram: Marcando_ando
- Botón flotante de WhatsApp.
- Enlace directo a Instagram.
- Formulario de contacto opcional.

Enlace directo a WhatsApp:

https://wa.me/56982661835

7. Administración de la página

Necesitamos que la web sea fácil de administrar y que no dependamos del diseñador para cada modificación.

El administrador debe permitir:

- Agregar productos.
- Eliminar productos.
- Modificar precios.
- Cambiar fotografías.
- Actualizar descripciones.
- Crear categorías.
- Destacar productos.
- Agregar nuevos diseños a la galería.
- Marcar productos como disponibles o temporalmente no disponibles.

También necesitamos que el diseñador nos explique cómo utilizar el administrador.

8. Consideraciones técnicas

Solicitamos que la propuesta incluya:

- Diseño y desarrollo de la página.
- Adaptación para dispositivos móviles.
- Configuración del dominio.
- Hosting.
- Certificado SSL.
- Configuración de formularios y enlaces de contacto.
- Optimización de velocidad.
- Configuración básica de SEO.
- Capacitación para administrar la web.
- Entrega de accesos y propiedad de la página.
- Información sobre costos de mantención y renovación.
