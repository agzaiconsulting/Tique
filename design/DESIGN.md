# Tique — Guía de diseño para implementar

App para escanear tickets de supermercado y seguir el gasto y la evolución de precios. Público: particulares y parejas en España. Idioma: español (es-ES), moneda en euros con formato español (`312,40 €`, `−6 %`).

**Principio clave:** escanear un ticket es la acción principal y está siempre a un toque (botón central flotante de la barra inferior).

Las pantallas de referencia están en `screens/*.dc.html`. Son maquetas HTML con estilos inline y una pequeña clase JS (`renderVals()`) que contiene los datos de ejemplo y la lógica de interacción. **Úsalas como fuente de verdad visual** (medidas, colores, textos, datos), no como código a copiar: se reimplementan como componentes React + Tailwind.

> Sintaxis de las maquetas: `{{x}}` = valor calculado en `renderVals()`, `<sc-for list=… as=…>` = map, `<sc-if value=…>` = render condicional, `<dc-import name="TabBar">` = componente hijo (`TabBar.dc.html`).

---

## 1. Stack objetivo

- Next.js 15 (App Router) + TypeScript + Tailwind + Supabase.
- Mobile-first: diseño a **390 × 844**. En pantallas anchas, centrar una columna de máx. ~480 px.
- Se puede empaquetar después como PWA o con Capacitor; no usar nada que dependa de hover para funcionar.

## 2. Design tokens

### Colores (modo claro)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F5F7F6` | Fondo de pantalla |
| `card` | `#FFFFFF` | Tarjetas |
| `ink` | `#14201B` | Texto principal, botones oscuros |
| `ink-2` | `#56665F` | Texto secundario (pasa 4.5:1 sobre blanco y `bg`) |
| `line` | `#E4EAE7` | Bordes |
| `divider` | `#EEF2F0` | Separadores de lista |
| `track` | `#EDF2EF` | Fondo de barras de progreso |
| `chip` | `#EEF3F0` | Chips neutros |
| `mint` | `#34D399` | Acento: botón Escanear, CTA principal, barras positivas |
| `mint-ink` | `#073B27` | Texto sobre `mint` |
| `mint-soft` | `#DDF5EA` | Fondo de "ahorro / bajada" |
| `mint-text` | `#0B7A57` | Texto verde sobre blanco o `mint-soft` |
| `coral` | `#FF8A73` | Subidas de precio (relleno) |
| `coral-soft` | `#FFE8E1` | Fondo de alertas de subida |
| `coral-text` | `#B23F2A` | Texto de subidas, acciones destructivas |
| `review-soft` | `#FFF8E5` | Línea del ticket por revisar (fondo) |
| `review-ring` | `#F2C94C` | Borde de línea por revisar |
| `review-text` | `#7A4F00` | Texto "por revisar" |

**Regla semántica:** verde = positivo/ahorro/bajada · coral = subida de precio · amarillo = "revisa esto" (nunca usar coral para revisar).

### Modo oscuro (ver `Main.dc.html`, prop `dark`)

`bg #0E1412` · `card #18211E` · `ink #ECF3F0` · `ink-2 #A2B3AC` · `line #26322E` · `track #24302C` · `chip #212C28` · `mint-soft #123A2B` · `mint-text #5EE3AA` · `coral-soft #3B211A` · `coral-text #FF9F8A` · barra inferior `#141C19`.

### Colores de categoría (donut, chips, barras)

| Categoría | Gráfico | Chip fondo / texto |
|---|---|---|
| Frescos | `#34D399` | `#DDF5EA` / `#0B7A57` |
| Despensa | `#60A5FA` | `#E8F0FF` / `#1D4ED8` |
| Bebidas | `#FBBF24` | `#FFF1D6` / `#8A5A00` |
| Limpieza | `#A78BFA` | `#EEE8FF` / `#5B3FC4` |
| Higiene | `#F9A8D4` | `#FDE7F3` / `#9D2A6B` |
| Otros | `#B8C4BF` | `#EEF3F0` / `#3E4C46` |

Supermercados en el gráfico de líneas: Mercadona/"tú" `#0B7A57` (3 px, el más grueso) · Lidl `#3B82F6` · Día `#A78BFA` · Carrefour `#F59E0B`. El supermercado se muestra con una **inicial** en un cuadrado tintado (no logos reales).

### Tipografía

- **Plus Jakarta Sans** (Google Fonts, pesos 400–800). `font-variant-numeric: tabular-nums` en toda la app.
- **JetBrains Mono** 11 px solo para el texto original del ticket (`CAFE MOL NAT HCD 250`).
- Escala: total del mes 46/800 (tracking −1.8 px) · precio en ficha 40/800 · H1 26–28/800 · título de tarjeta 16–17/700 · cuerpo 14–15 · secundario 12–13 · etiquetas de la barra 11.

### Forma, sombra y espaciado

- Radios: tarjeta principal 26–28 · tarjetas 22–24 · botones 16–18 · iconos/tiles 12–14 · chips 999.
- Sombra de tarjeta: `0 1px 2px rgba(20,48,36,.04), 0 10px 28px rgba(20,48,36,.07)`.
- Padding de pantalla 20 px; separación entre tarjetas 16 px; padding interno 20 px.
- Objetivos táctiles ≥ 44 px.
- Iconos: lineales, trazo 1.8, `stroke-linecap/linejoin: round` (encajan con Lucide).

### Microinteracciones

- Entrada de tarjetas: fade + translateY(10px→0), 0.5 s `cubic-bezier(.2,.7,.2,1)`, escalonado ~60 ms.
- Barras (presupuesto, comparativas): crecen desde la izquierda al cargar (scaleX 0→1, ~1 s).
- Gráfico de líneas y sparklines: se "dibujan" (stroke-dashoffset).
- Pulsar: `scale(.97)` en botones y tarjetas enlazadas. Interruptores con rebote suave.
- Botón Escanear: hover/press con elevación; en estados vacíos, el CTA tiene un pulso suave.
- Respetar `prefers-reduced-motion`.

## 3. Navegación

Barra inferior (`TabBar.dc.html`): **Inicio · Productos · [Escanear] · Precios · Perfil**. El botón central (72 × 72, radio 26, `mint`, con un anillo del color del fondo que lo "recorta" de la barra) sobresale por arriba y abre la cámara. La pestaña activa va en `ink`/800 y las inactivas en `ink-2`/500.

Rutas sugeridas:

| Ruta | Maqueta |
|---|---|
| `/` | `Main.dc.html` (+ `InicioVacio.dc.html` si no hay tickets) |
| `/escanear` | `EscanearCamara.dc.html` → `EscanearLeyendo.dc.html` → `EscanearRevision.dc.html` |
| `/tickets` | `Tickets.dc.html` |
| `/tickets/[id]` | `TicketDetalle.dc.html` |
| `/productos` | `Productos.dc.html` (+ `ProductosVacio.dc.html`) |
| `/productos/[id]` | `Producto.dc.html` |
| `/precios` | `Precios.dc.html` |
| `/perfil` | `Perfil.dc.html` |

## 4. Pantallas

### Inicio (`Main.dc.html`, `InicioOscuro.dc.html`, `InicioVacio.dc.html`)
Saludo + fecha · tarjeta principal con el gasto del mes, la variación respecto al mismo día del mes anterior y 3 mini-stats (tickets, ticket medio, supermercado más usado) · donut por categoría con leyenda · "Tu IPC personal" (+4,8 % desde enero, barras mensuales, frase con el precio de la cesta en enero y hoy) · alerta de subida (tarjeta coral enlazada a la ficha del producto) · presupuesto mensual con barra y gasto diario disponible · últimos tickets ("Ver todos" → `/tickets`).
**Vacío:** ilustración + "Escanea tu primer ticket" + CTA principal + "Subir una foto o un PDF" + lo que verá el usuario al escanear.

### Escanear (3 pasos)
1. **Cámara:** fondo oscuro, marco guía con esquinas en `mint` y línea de barrido, chip "Ticket detectado · mantén el móvil quieto", modos *Ticket / Ticket largo*, botones *Subir foto* y *Subir PDF*, disparador central.
2. **Leyendo:** miniatura del ticket con haz de escaneo, barra de progreso y pasos (supermercado ✓, fecha y total ✓, extrayendo productos con spinner, normalizando nombres pendiente). Botón Cancelar.
3. **Revisión:** cabecera (súper, dirección, fecha, total, chips "12 productos", "N por revisar", "La suma cuadra con el total") · lista de líneas: texto original en monoespaciada → nombre normalizado, chip de categoría editable (al tocarlo se elige otra), cantidad o peso × precio/kg y precio · las líneas con baja confianza llevan fondo y borde amarillos, el motivo y un botón "Es correcto" · "Añadir una línea que falte" · pie fijo con el CTA "Confirmar ticket" y la nota "La imagen se elimina al confirmar".

### Historial y detalle de ticket
- **Tickets:** resumen del mes, buscador, filtro por miembro (Todos / Míos / De Javi), grupos por semana con subtotal, cada fila con la inicial del súper, fecha, nº de productos, total y quién lo escaneó.
- **Detalle:** **sin imagen** (aviso fijo: la foto se eliminó al confirmar) · cabecera con súper, fecha, total, forma de pago y quién lo escaneó · barra por categorías · líneas con categoría, cantidad, precio, etiqueta de variación respecto a la compra anterior (`+4 %` coral, `−3 %` verde, `Nuevo` neutro) y "Corregido por ti" · interruptor "Texto original" que muestra la línea OCR guardada · lo que habría costado en el súper más barato · editar / eliminar ticket.

### Productos y ficha
- **Lista:** buscador, chips de categoría (filtran la lista), ordenar por "Más comprados", filas con tile de categoría, nombre, súper · nº de compras, sparkline (coral si sube, verde si baja, gris si estable), último precio y pastilla de variación.
- **Ficha:** categoría, nombre, formato + €/kg, precio grande y "+22 % desde enero" · gráfico de líneas por supermercado con selector **3M / 6M / 1A** · mínimo / máximo / actual · tabla "Dónde está más barato" (equivalente de marca propia de cada súper, precio y €/kg, "Más barato" y "Tu compra") · ahorro estimado al año · tus compras de ese producto · botón "Seguir precio".

### Precios
"Tu cesta habitual cuesta X en Mercadona y Y en Lidl" con barras por supermercado (empiezan en 0) y la diferencia respecto al más barato · ahorro por compra y por mes · gasto por supermercado (barra apilada + lista) · ranking de lo que más ha subido desde enero · la mayor bajada.

### Perfil
Avatar + datos · planes como radio cards (Gratis / Premium 4,99 €/mes / Compartido 7 €/mes) · miembros del plan + invitar · presupuesto mensual · alertas con interruptores (subidas > 10 %, presupuesto al 80 %, resumen semanal) · exportar datos · privacidad ("Las fotos de tus tickets no se guardan") · cerrar sesión.

## 5. Accesibilidad

Elementos reales (`button`, `a`, `input` + `label`), `aria-label` en botones solo de icono, `role="switch"`/`aria-checked` en interruptores, `role="radio"` en planes, `aria-selected` en chips/segmentos, `role="progressbar"` en barras, `role="img"` + `aria-label` descriptivo en gráficos. Los colores de categoría siempre van acompañados de texto.

## 6. Datos de ejemplo

Los datos de las maquetas son coherentes entre pantallas (noviembre: 312,40 € en 14 tickets; Mercadona 8 / Lidl 4 / Día 1 / Carrefour 1; ticket del 14 nov de 42,15 € con 12 líneas). Sirven como seed de la base de datos y para los tests.
