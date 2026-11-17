# Tique

App móvil (mobile-first, 390px) para escanear tickets de supermercado.
Stack: Next.js 15 (App Router), TypeScript, Tailwind, Supabase.

## Diseño
- La UI sigue design/DESIGN.md (tokens, pantallas, rutas).
  Léelo antes de crear o cambiar cualquier pantalla.
- Maquetas de referencia en design/screens/*.dc.html:
  son la fuente de verdad visual, no código a copiar.
- Textos en español de España; importes como "312,40 €".

## Reglas del producto
- Nunca guardar la imagen del ticket: se borra al confirmar.
- Escanear siempre accesible a un toque (botón central de la TabBar).

## Comandos
- npm run dev / npm run build / npm run lint