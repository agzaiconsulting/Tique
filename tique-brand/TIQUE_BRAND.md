# Tique — Identidad visual

Usa esta guía para aplicar el logo y la paleta de Tique en la app (Next.js + Tailwind).

## Archivos
- `tique-icon.svg` — icono principal (vectorial). Fuente de verdad para favicon, logo en la UI e icono de la app.
- `tique-icon-1024.png` — icono 1024×1024 para App Store / Google Play / PWA. Genera a partir de él los tamaños que hagan falta (192, 512, apple-touch-icon 180, favicon 32/16).

El SVG ya trae el fondo verde y las esquinas redondeadas (rx 116 sobre 512). Para los iconos de iOS/Android, que aplican su propia máscara, exporta una versión con el fondo a sangre (rect sin `rx`).

## Paleta
| Token | Hex | Uso |
|---|---|---|
| `brand` | `#0F5C47` | Color principal: fondo del icono, botones primarios, wordmark, cabeceras |
| `brand-dark` | `#0A3F31` | Hover/pressed del primario |
| `accent` | `#C4F25A` | Acento lima: estados de éxito, badges, highlights (siempre con texto `brand` encima, nunca texto blanco) |
| `surface` | `#F3F8F4` | Fondo general de la app |
| `ink` | `#0F2E25` | Texto principal |
| `muted` | `#3F6B5C` | Texto secundario |
| `border` | `#D3E3DA` | Bordes y separadores |

Tailwind (`tailwind.config` o `@theme` en v4):
```js
colors: {
  brand: { DEFAULT: '#0F5C47', dark: '#0A3F31' },
  accent: '#C4F25A',
  surface: '#F3F8F4',
  ink: '#0F2E25',
  muted: '#3F6B5C',
  border: '#D3E3DA',
}
```

## Tipografía
- **Sora** (Google Fonts), cargada con `next/font/google`.
- Wordmark: `tique` en minúsculas, Sora 800, `letter-spacing: -0.045em`, color `brand` (blanco sobre fondo `brand`).
- UI: Sora 400/600 para el texto y 700 para los títulos.

## Logo (lockup)
Icono + wordmark en horizontal, con el icono a la altura aproximada de la x del texto (×0,85 del tamaño de la fuente) y un hueco de ~0,2× el tamaño de la fuente. Sobre fondo oscuro (`brand`): wordmark en blanco y el icono tal cual.
