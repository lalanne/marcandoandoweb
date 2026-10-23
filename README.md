# Marcando Ando — Sitio web

Sitio web de **Marcando Ando**, un emprendimiento chileno que personaliza ropa y accesorios: poleras, polerones, tazones, botellas, calcetines, estuches, jockeys, delantales, esferas navideñas y más. Los clientes piden su propio diseño, nombre, curso o idea.

- Instagram: [@marcando_ando](https://www.instagram.com/marcando_ando/)
- Pedidos: WhatsApp (`https://w.app/VMJF8o`) o DM de Instagram

## Objetivo

Mostrar los productos y trabajos reales, y hacer muy fácil pedir una personalización (principalmente por WhatsApp). El sitio está en **español** y los precios en **pesos chilenos (CLP)**.

## Secciones previstas

1. **Hero:** logo, frase principal y botón de WhatsApp.
2. **Productos:** poleras, polerones, tazones, botellas, calcetines, estuches, esferas navideñas, delantales, etc., con precio "desde".
3. **Galería:** trabajos reales.
4. **Cómo pedir:** enviar la idea → diseño y maqueta → estampado → entrega o retiro.
5. **Colegios y grupos:** uniformes, botellas, etiquetas, poleras de generación y "alianzas", con descuento por cantidad.
6. **Temporadas:** Navidad, Día del Padre, Mundial, etc.
7. **Contacto:** WhatsApp, Instagram y formulario que abre WhatsApp con el mensaje prellenado.

## Marca

| Color    | Hex       |
| -------- | --------- |
| Rosado   | `#E8647F` |
| Amarillo | `#F0B242` |
| Turquesa | `#4FB0B0` |
| Morado   | `#9565C4` |
| Azul noche | `#141824` |
| Crema    | `#FBF5E9` |

Estilo: alegre, redondeado y hecho a mano, como el logo (letras gruesas y redondeadas, trazos de colores). Los hex se estimaron a partir del logo y pueden ajustarse.

## Stack

HTML, CSS y JavaScript estáticos, sin build. Es rápido, barato de alojar y fácil de editar por el equipo.

## Estructura

```
marcandoandoweb/
├── assets/        # logo e imágenes (originales: capturas de Instagram)
├── README.md
└── CLAUDE.md
```

Cuando se cree el sitio se añadirán `index.html`, `css/` y `js/`.

## Desarrollo

Para ver el sitio en local basta con abrir `index.html` o servir la carpeta:

```bash
python3 -m http.server 8000
```

Luego abre <http://localhost:8000>.

## Pendientes

- Confirmar el número completo de WhatsApp.
- Conseguir fotos de producto en buena calidad. Las actuales son capturas de pantalla de Instagram.
- Confirmar con el cliente el uso de fotos con rostros de menores y escudos de colegios.
- Decidir si se muestran precios o solo "consulta por tu diseño".
- Optimizar las imágenes de `assets/` (pesan unos 5 MB cada una).
