# Tique

Escanea tickets de supermercado con IA, identifica los productos contra un diccionario compartido y controla tu gasto real.

Producto de **AGZAI**.

---

## Stack

- **Next.js 15** (App Router) + TypeScript estricto + Tailwind CSS v4
- **Supabase**: Postgres + Auth (magic link) + Storage privado + RLS
- **Google Cloud Vision**: extracción de texto del ticket
- **Anthropic (Haiku)**: normalización de productos desconocidos
- **Vitest**: tests unitarios

---

## Requisitos previos

- Node.js 20+
- Una cuenta de [Supabase](https://supabase.com) (el plan gratuito es suficiente para empezar)
- Una API key de [Google Cloud Vision](https://cloud.google.com/vision) con la facturación activada (el tier gratuito cubre ~1000 tickets/mes)
- Una API key de [Anthropic](https://console.anthropic.com)

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y rellenar las variables de entorno
cp .env.example .env.local

# 3. Aplicar las migraciones en tu proyecto de Supabase
#    Opción A — Supabase Cloud: copia y pega el SQL en el SQL Editor del dashboard
#    Opción B — Supabase local (Docker): supabase db push

# 4. Configurar Auth en Supabase (ver sección Auth más abajo)

# 5. Arrancar en desarrollo
npm run dev
```

Visita `http://localhost:3000`. El middleware te redirige a `/login` si no hay sesión.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (pública, va al cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (**solo servidor**, bypassa RLS) |
| `GOOGLE_VISION_API_KEY` | API key de Google Cloud Vision (**solo servidor**) |
| `ANTHROPIC_API_KEY` | API key de Anthropic (**solo servidor**) |
| `ANTHROPIC_MODEL` | Modelo a usar (por defecto `claude-haiku-4-5-20251001`) |
| `MOCK_EXTERNAL` | `1` = usar fixtures en `/fixtures/` sin llamar a Vision ni Anthropic |

Las variables sin `NEXT_PUBLIC_` **nunca llegan al navegador**. No añadas claves secretas con ese prefijo.

---

## Configuración de Auth en Supabase

1. En el dashboard: **Authentication → URL Configuration**
2. Establece **Site URL** a `http://localhost:3000` (desarrollo) o tu dominio en producción
3. Añade `http://localhost:3000/login/confirmar` a **Additional Redirect URLs**

El flujo es: el usuario introduce su email → recibe un enlace mágico → hace clic → es redirigido a `/login/confirmar?code=...` → se intercambia el código por una sesión → entra a `/subir`.

---

## Desarrollo con MOCK_EXTERNAL=1

Con `MOCK_EXTERNAL=1` en `.env.local`, las llamadas a Google Vision y Anthropic se sustituyen por respuestas guardadas en `/fixtures/`. Esto permite desarrollar y ejecutar tests sin gastar créditos ni necesitar claves reales.

Los fixtures se añaden en la **Fase 1**.

---

## Tests

```bash
npm test          # pasa todos los tests
npm run test:watch  # modo watch
```

Los tests de lógica (OCR, diccionario, IA) viven en `src/lib/*/`.

---

## Lint y tipos

```bash
npm run lint       # ESLint + tsc --noEmit
npm run typecheck  # solo tipos
```

---

## Coste aproximado por ticket

| Servicio | Tier gratuito | Coste tras el límite |
|---|---|---|
| Google Cloud Vision | 1000 unidades/mes | ~1,50 $/1000 |
| Anthropic Haiku | — | ~$0,001–0,003 por consulta de normalización |
| Supabase Storage | 1 GB | $0,021/GB |

Una vez procesado el ticket, la imagen se borra (RF-15b), así que el almacenamiento en Storage es transitorio.

---

## Seguridad

### Restringir la API key de Google Cloud Vision
En la consola de Google Cloud: **APIs & Services → Credentials → tu API key → Application restrictions**. Limita al IP del servidor de producción (o a ninguna IP durante desarrollo, pero con restricción de API).

### Límite de gasto en Anthropic
En la consola de Anthropic: **Settings → Billing → Spend limits**. Establece un límite mensual acorde al volumen esperado de tickets.

### Qué nunca va a logs
- Claves de API
- Imágenes de tickets
- Emails de usuarios

---

## Rutas de la app

| Ruta | Descripción |
|---|---|
| `/login` | Autenticación por magic link |
| `/subir` | Subida de ticket (foto o PDF); lanza el pipeline |
| `/tickets` | Lista de tickets del usuario |
| `/tickets/[id]` | Revisión y confirmación de un ticket |
| `/diccionario` | Gestión del diccionario compartido (alias → producto) |

### API

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/tickets` | Recibe imagen, ejecuta pipeline, crea ticket y líneas |
| `GET` | `/api/tickets/[id]/estado` | Estado actual del ticket |
| `POST` | `/api/tickets/[id]/confirmar` | Confirma ticket, actualiza alias, borra imagen |
| `PATCH` | `/api/ticket-lineas/[id]` | Confirma o rechaza una línea individual |
| `PATCH` | `/api/alias/[id]` | Confirma, ignora o restaura un alias del diccionario |

---

## Fases de desarrollo

| Fase | Contenido | Estado |
|---|---|---|
| 0 — Base | Proyecto, tokens, Supabase, migraciones, RLS, login | ✅ Completada |
| 1 — Lógica | `lib/ocr`, `lib/dictionary`, `lib/ai` + tests + MOCK_EXTERNAL | ✅ Completada |
| 2 — Subida y proceso | `/subir`, `POST /api/tickets`, pipeline completo | ✅ Completada |
| 3 — Revisión | `/tickets`, `/tickets/[id]`, confirmaciones por línea | ✅ Completada |
| 4 — Diccionario | `/diccionario` con filtros por estado/cadena y edición inline | ✅ Completada |
| 5 — Cierre | Accesibilidad, estados vacíos (procesando/error), README | ✅ Completada |
