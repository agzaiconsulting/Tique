# Especificación de requisitos — Tique

Producto de AGZAI · Documento de requisitos

*Versión original: 28 de septiembre de 2026 · Actualizado: 6 de noviembre de 2026*

## Índice

- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. Objetivo y alcance](#2-objetivo-y-alcance)
- [3. Usuarios y casos de uso](#3-usuarios-y-casos-de-uso)
- [4. Requisitos funcionales](#4-requisitos-funcionales)
- [5. Requisitos no funcionales](#5-requisitos-no-funcionales)
- [6. Arquitectura técnica propuesta](#6-arquitectura-técnica-propuesta)
- [7. Roadmap por fases](#7-roadmap-por-fases)
- [8. Métricas de éxito](#8-métricas-de-éxito)
- [9. Riesgos y decisiones abiertas](#9-riesgos-y-decisiones-abiertas)
- [10. Modelo de negocio](#10-modelo-de-negocio)
- [11. Análisis de competencia](#11-análisis-de-competencia)

---

## 1. Resumen ejecutivo

Tique es una app móvil que permite escanear tickets de supermercado (foto de un ticket físico o subida de un archivo digital) y, mediante un modelo de visión IA, extrae automáticamente el comercio, la fecha, el importe y cada línea de producto comprada. A diferencia de un gestor de gastos genérico, Tique se centra específicamente en la compra de supermercado: normaliza los productos detectados para poder comparar su precio a lo largo del tiempo y entre distintas cadenas (Mercadona, Carrefour, Día, Lidl, Alcampo y cualquier otro supermercado).

El producto se concibe como un servicio que AGZAI ofrece a sus clientes (negocios o particulares), con un dashboard que muestra en qué se gasta, cuánto sube o baja el precio de cada producto habitual, y en qué supermercado sale más barato comprarlo.

---

## 2. Objetivo y alcance

**Objetivo del MVP:** validar que un usuario puede escanear un ticket de supermercado, obtener sus productos correctamente identificados sin apenas corrección manual, y ver cómo evoluciona el precio de esos productos en el tiempo y frente a otras cadenas.

**Incluye (dentro de alcance):**

- Escaneo de tickets de supermercado por foto (físicos) o archivo (digitales: PDF, imagen)
- Extracción automática con IA: comercio, fecha, importe total y líneas de producto
- Normalización de productos para poder compararlos entre tickets y cadenas
- Dashboard de gasto total, por categoría y por supermercado
- Dashboard de precios por producto, con tendencia y comparativa entre supermercados
- Cualquier cadena de supermercado, sin limitar a una lista cerrada

**Queda fuera del MVP (fases posteriores o descartado):**

- Tickets que no sean de supermercado (gasolineras, restaurantes, farmacias, etc.) — se deja documentado como posible fase futura, pero no forma parte del alcance actual
- Web app / dashboard de escritorio (fase 2, ver Roadmap)
- Multi-tenant para gestionar varios clientes de AGZAI desde un panel único (fase 3)
- Integraciones con listas de la compra o sugerencias de ahorro automáticas
- Motor de lectura propio (self-hosted) — el MVP usa una API externa (ver sección 6); migrar a un modelo propio queda documentado como evolución natural, no como requisito del MVP

---

## 3. Usuarios y casos de uso

**Perfil de usuario:** persona o familia que hace la compra de supermercado de forma habitual y quiere entender y controlar ese gasto, sin llevar una hoja de cálculo manual. No requiere conocimientos técnicos.

**Casos de uso principales:**

1. **Escanear un ticket físico:** el usuario acaba de salir del supermercado, abre la app, hace una foto del ticket y en segundos ve los productos detectados listos para confirmar.
2. **Registrar una compra online:** el usuario recibe la factura de una compra online (PDF o email) y la sube directamente desde el archivo, sin necesidad de foto.
3. **Corregir un dato mal leído:** la IA puede fallar en algo (un precio borroso, un producto mal identificado); el usuario revisa y corrige antes de guardar, y esa corrección ayuda a mejorar futuras lecturas del mismo producto.
4. **Consultar el gasto del mes:** el usuario abre la app para ver cuánto lleva gastado este mes, comparado con el anterior, y en qué categorías.
5. **Comparar el precio de un producto:** el usuario quiere saber si la leche que compra habitualmente ha subido de precio, y en qué supermercado le sale más barata ahora mismo.
6. **Decidir dónde comprar:** antes de ir a comprar, el usuario consulta qué supermercado tiene mejor precio medio para su cesta habitual.

---

## 4. Requisitos funcionales

### 4.1 Captura de tickets

| ID | Requisito |
|---|---|
| `RF-01` | El usuario puede hacer una foto de un ticket físico directamente desde la app |
| `RF-02` | El usuario puede subir un archivo (PDF o imagen) como ticket digital |
| `RF-02b` | La app acepta capturas y PDF del ticket digital que algunas cadenas ofrecen en su app y los trata con prioridad sobre la foto, porque su texto es limpio (en las pruebas, 7 de 7 capturas de Mercadona cuadraron). Si el PDF contiene texto, se lee directamente sin OCR (por validar). La app recomienda subir el ticket digital cuando la cadena lo ofrece. Se aplican las mismas comprobaciones que a una foto (RF-08c) |
| `RF-02c` | Decisión: la app no usa el código de barras ni el QR del ticket para obtener los productos. Esos códigos identifican el ticket o verifican la factura (en Verifactu: NIF, número, fecha e importe), pero no incluyen las líneas; estas están en los servidores de la cadena, asociadas a la cuenta del cliente |
| `RF-03` | La app permite repetir la foto si sale borrosa o incompleta antes de enviarla a procesar |
| `RF-04` | El usuario ve un indicador de progreso mientras el ticket se está analizando |
| `RF-04b` | Antes de leer la foto, la app usa el escáner de documentos del propio móvil para recortar y enderezar el ticket y dejar fuera el fondo (propuesta pendiente de validar en la app) |

### 4.2 Extracción de datos (IA)

| ID | Requisito |
|---|---|
| `RF-05` | El sistema extrae automáticamente: nombre del supermercado, fecha, importe total y cada línea de producto con su precio |
| `RF-06` | El sistema asigna una categoría de gasto (alimentación, hogar, etc.) a cada ticket y, cuando aplica, a cada línea de producto |
| `RF-07` | El sistema muestra un nivel de confianza de la lectura, para que el usuario sepa qué tickets conviene revisar con más atención |
| `RF-08` | Si el sistema no puede leer un campo (precio ilegíble, ticket dañado), lo deja en blanco para que el usuario lo complete, en vez de inventar un valor |
| `RF-08b` | El sistema reconstruye las filas del ticket a partir de la posición de cada palabra en la imagen, no del orden del texto que devuelve el OCR: en las pruebas, el mismo motor devolvió producto, cantidad y precio en bloques separados y en orden distinto según el ticket |
| `RF-08c` | Antes de mostrar el ticket, el sistema comprueba que la suma de las líneas (descuentos incluidos) coincide con el total impreso, que cantidad × precio unitario = importe y que kilos × precio por kg = importe. Si alguna comprobación falla, el ticket pasa a revisión manual y no se guarda como correcto |
| `RF-08d` | En los productos al peso (fruta, verdura, carne, pescado) el sistema guarda los kilos y el precio por kg además del importe, para comparar entre supermercados y fechas por kg |
| `RF-08e` | La lectura tolera fotos inclinadas o giradas (90° o 180°) y texto de fondo ajeno al ticket (mesa, mantel, otro ticket) sin que afecte a los importes |

### 4.3 Normalización de productos

| ID | Requisito |
|---|---|
| `RF-09` | El sistema consulta primero un diccionario compartido (texto crudo + supermercado → producto normalizado); si no hay coincidencia, el modelo de visión propone un nombre normalizado (ej. "LECHE PASC.1L" → "Leche entera Pascual 1L") junto con un nivel de confianza |
| `RF-10` | El diccionario de normalización es global por supermercado, no por usuario: cuando alguien confirma o corrige un producto, esa asociación queda disponible para todos los usuarios que compren el mismo producto en el mismo supermercado, sin compartir precios ni datos personales entre ellos |
| `RF-11` | El usuario puede corregir manualmente la normalización de un producto si la IA se ha equivocado |
| `RF-12` | Cada confirmación o corrección de un usuario incrementa el contador de confianza de esa entrada del diccionario; a partir de un umbral (ej. 3 confirmaciones coincidentes) la entrada se marca como fiable y se aplica automáticamente sin pedir confirmación a futuros usuarios |
| `RF-12b` | La búsqueda en el diccionario tolera pequeñas variaciones de texto (espacios, caracteres mal reconocidos por OCR) mediante comparación aproximada, para no crear entradas duplicadas del mismo producto |
| `RF-12c` | Si la confianza de la lectura es baja y no hay coincidencia fiable en el diccionario, el ticket se guarda con el importe correcto pero el producto queda marcado como "sin identificar"; no se incluye en las comparativas de precio por producto hasta que alguien lo identifique |
| `RF-12d` | El catálogo público de la tienda online de cada supermercado (nombre de producto, formato, precio) se usa como fuente de sugerencias automáticas de alta confianza: cruzando supermercado, similitud de texto con la abreviatura del ticket y proximidad del precio de catálogo con el precio del ticket. Estas sugerencias se marcan como "propuesta automática" y no entran en el diccionario confirmado hasta que un usuario las valida |
| `RF-12e` | Cada entrada del diccionario guarda el rango de precios habitual del producto. Si una línea llega con un precio muy alejado de ese rango (ej. "AGUA S/GAS" a 0,22 € en 2023 y a 1,50 € en 2024 en el mismo supermercado), el sistema no aplica la entrada automáticamente y pide confirmación, porque el mismo texto puede corresponder a formatos distintos |

### 4.4 Revisión y guardado

| ID | Requisito |
|---|---|
| `RF-13` | Antes de guardar, el usuario ve una pantalla de revisión con los datos extraídos (comercio, fecha, importe, categoría, líneas de producto) y puede editarlos |
| `RF-14` | El usuario puede eliminar un ticket guardado por error |
| `RF-15` | El usuario puede ver el detalle completo de un ticket guardado (comercio, fecha, importe, líneas de producto); tras la confirmación, la imagen original ya no está disponible (ver RF-15b) |
| `RF-15b` | En cuanto el usuario confirma que los datos extraídos de un ticket son correctos, el sistema borra la imagen original (foto o archivo) del almacenamiento; no se conserva ninguna copia. Solo persisten los datos extraídos (comercio, fecha, importe, líneas de producto normalizadas) |

### 4.5 Dashboard de gasto

| ID | Requisito |
|---|---|
| `RF-16` | El usuario ve el gasto total del mes en curso y cómo se compara con el mes anterior |
| `RF-17` | El usuario ve el gasto desglosado por categoría y por supermercado |
| `RF-18` | El usuario ve una lista de tickets filtrable por categoría y ordenada por fecha |

### 4.6 Dashboard de productos y precios

| ID | Requisito |
|---|---|
| `RF-19` | El usuario ve una lista de los productos que compra habitualmente, con su precio medio y tendencia (sube / baja / estable) frente al periodo anterior |
| `RF-20` | El usuario puede buscar un producto concreto para ver su histórico de precio |
| `RF-21` | El usuario ve, para cada producto, en qué supermercado sale actualmente más barato |
| `RF-22` | El usuario ve una comparativa del precio de un mismo producto entre los distintos supermercados donde lo ha comprado |

### 4.7 Cuenta y datos

| ID | Requisito |
|---|---|
| `RF-23` | El usuario se registra e inicia sesión de forma segura (email/contraseña o proveedor externo) |
| `RF-24` | Los datos de un usuario son privados y no visibles para otros usuarios |
| `RF-25` | El usuario puede exportar su historial de tickets o gasto (ej. a Excel/CSV) |

---

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| `RNF-01` | **Coste por ticket:** el coste de procesar cada ticket debe mantenerse próximo a cero, tanto para AGZAI como para el cliente final, priorizando servicios con nivel gratuito sobre modelos de pago por uso (ver sección 6) |
| `RNF-02` | **Tiempo de respuesta:** el análisis de un ticket debe completarse en menos de 10 segundos en condiciones normales |
| `RNF-03` | **Privacidad:** los tickets contienen datos de consumo personal; deben almacenarse cifrados y no compartirse entre usuarios ni clientes |
| `RNF-04` | **Cumplimiento RGPD:** al tratarse de datos personales de usuarios en España/UE, el tratamiento y almacenamiento debe cumplir RGPD (consentimiento, derecho de acceso y borrado) |
| `RNF-05` | **Disponibilidad:** la app debe funcionar de forma fiable en conexiones móviles estándar (3G/4G/5G/WiFi), con reintento automático si falla la subida de una foto |
| `RNF-06` | **Escalabilidad multi-cliente:** la arquitectura debe soportar dar de alta nuevos clientes de AGZAI sin rehacer el sistema, aunque el MVP se valide primero con un único cliente/usuario |
| `RNF-07` | **Precisión de lectura:** la extracción de importe total debe acertar en al menos el 90% de los tickets legíbles sin corrección manual (métrica a validar en el MVP, ver sección 8) |
| `RNF-08` | **Usabilidad:** el flujo completo (foto → revisión → guardado) debe poder completarse en menos de 30 segundos para un usuario sin experiencia previa con la app |
| `RNF-09` | **Minimización de datos:** no se retiene ninguna imagen de ticket tras la confirmación del usuario (ver RF-15b); esto reduce tanto el coste de almacenamiento como la superficie de exposición de datos personales, en línea con el principio de minimización de RGPD |

---

## 6. Arquitectura técnica propuesta

El ticket pasa por seis pasos: la app móvil captura la foto o el archivo, un servicio de IA extrae el texto y las líneas de producto, el sistema normaliza cada producto a un nombre comparable, el usuario revisa y confirma los datos, todo se guarda en la base de datos, y desde ahí se alimenta el dashboard.

### Stack propuesto

| Capa | Tecnología |
|---|---|
| App móvil | React Native o Flutter (a decidir) |
| Backend / API | Next.js 15 (API routes) desplegado en Vercel |
| Base de datos y almacenamiento | Supabase (Postgres); Storage solo como zona temporal de la imagen durante el análisis, borrada al confirmar (RF-15b) |
| Autenticación | Supabase Auth |

### Motor de extracción de datos

| Fase | Enfoque | Coste | Cuándo |
|---|---|---|---|
| Fase 1 (MVP) | API externa con nivel gratuito (ej. Google Cloud Vision) + parseo y normalización propios | Gratuito hasta el límite del nivel gratuito (~1000 tickets/mes); bajo coste a partir de ahí | Desde el lanzamiento |
| Fase 2 (futuro) | Modelo de visión propio, autoalojado (ej. Qwen2-VL) | Coste fijo de servidor, marginal ~0€ por ticket | Cuando el volumen de tickets lo justifique frente al coste de infraestructura |

Esta decisión se documenta como abierta: el MVP arranca con la Fase 1 porque es más rápida de montar y suficiente mientras el volumen sea bajo-medio, pero la arquitectura debe permitir sustituir el motor de extracción sin rediseñar el resto del sistema.

El diccionario de normalización (sección 4.3) vive como una tabla independiente en la misma base de datos (Postgres), separada de los tickets de cada usuario: guarda únicamente supermercado + texto crudo → producto normalizado + contador de confianza, nunca precios ni datos personales. Esto permite que las correcciones de un usuario beneficien a todos los demás sin comprometer su privacidad.

Como fuente secundaria para poblar el diccionario (RF-12d), un proceso periódico puede extraer el catálogo público de la tienda online de cada supermercado (nombre, formato, precio). Esta vía tiene un riesgo legal similar al de la API no oficial de Mercadona (sección de riesgos): los términos de uso de estas webs suelen prohibir la extracción automatizada, por lo que se trata como una sugerencia de apoyo, nunca como la fuente única o la justificación para prescindir de la confirmación del usuario.

### Validación del motor de lectura con tickets reales

| Prueba | Material | Resultado |
|---|---|---|
| Capturas digitales de Mercadona | 7 tickets, 73 líneas de producto | 7 de 7 cuadran; sin errores de carácter en los 5 comparados con la imagen |
| Fotos y capturas de varias cadenas (Gadis, Froiz, Eroski, Mercadona) y una frutería | 20 imágenes, unos 16 tickets distintos | 16 de 20 imágenes cuadran; 15 de los 16 tickets cuadran en al menos una foto |
| Casos que no cuadran | Recorte parcial de un ticket, una foto con dos tickets, un ticket largo muy curvado | Los tres quedan marcados por la comprobación de la suma; ninguno se daría por bueno |

**Motor usado:** Google Cloud Vision (detección de texto en documentos), con las coordenadas de cada palabra para reconstruir las filas. La API exige una cuenta de facturación activa aunque el uso quede dentro del nivel gratuito; las 20 pruebas consumieron 20 unidades. Limitación conocida: la comprobación de la suma no detecta dos precios intercambiados entre productos.

---

## 7. Roadmap por fases

| Fase | Contenido | Duración estimada (dedicación parcial) |
|---|---|---|
| Fase 1 — MVP (app móvil) | Captura, extracción IA (Google Vision), normalización básica, revisión manual, dashboard de gasto y de precios por producto, un único usuario/cliente piloto | 8-10 semanas |
| Fase 2 — Web dashboard | Versión web del dashboard (gasto y precios), pensada para analizar datos con más comodidad que en móvil; la captura de tickets sigue siendo vía app | +3-4 semanas |
| Fase 3 — Producto multi-cliente | Arquitectura multi-tenant para dar de alta varios clientes de AGZAI de forma independiente, paneles de administración, facturación | +4-6 semanas |
| Fase 4 — Motor propio | Migración del motor de extracción a un modelo de visión autoalojado, cuando el volumen de tickets haga rentable el cambio frente al coste de la API externa | Sin fecha fija — depende del volumen de tickets |
| Fuera de roadmap (a valorar) | Ampliar el alcance a tickets de otros comercios (gasolineras, restaurantes...), una vez validado el caso de supermercados | — |

---

## 8. Métricas de éxito

| Métrica | Objetivo para validar el MVP |
|---|---|
| Precisión de lectura del importe total | ≥ 90% de tickets legíbles sin corrección manual |
| Precisión de normalización de producto | ≥ 80% de líneas de producto identificadas correctamente sin corrección |
| Tiempo medio del flujo completo | < 30 segundos desde la foto hasta el ticket guardado |
| Coste medio por ticket procesado | Dentro del nivel gratuito del servicio de OCR elegido |
| Uso recurrente | El usuario piloto sigue usando la app de forma habitual (varias veces por semana) pasado el primer mes |

---

## 9. Riesgos y decisiones abiertas

| Riesgo / decisión | Detalle | Mitigación propuesta |
|---|---|---|
| Normalización de productos entre cadenas | Cada supermercado abrevia el texto del producto de forma distinta (RF-09/RF-10); es el mayor riesgo técnico del proyecto | Construir un diccionario de normalización compartido por supermercado (no por usuario): la IA propone, el usuario confirma con un toque, y esa asociación queda disponible para todos los demás usuarios que compren el mismo producto en la misma cadena (detalle del mecanismo en la sección 4.3); los productos sin identificar se marcan como tal y quedan fuera de las comparativas hasta resolverse |
| Riesgo legal de usar catálogos públicos de supermercados | Extraer el catálogo de la tienda online de un supermercado para generar sugerencias (RF-12d) suele chocar con sus términos de uso, igual que la API no oficial de Mercadona | Usarlo solo como sugerencia de apoyo de alta confianza, nunca como fuente única; vigilar cambios de términos y tener un plan de contingencia basado solo en el diccionario confirmado por usuarios si hay que retirarlo |
| Fotos de mala calidad (curvadas, recortadas, con fondo con texto o con dos tickets) | En una prueba con 20 imágenes reales, 16 cuadraron a la primera; fallaron recortes, una foto con dos tickets y un ticket largo muy curvado | Escáner de documentos del móvil antes de leer; comprobación de la suma (RF-08c) que manda a revisión manual lo que no cuadra; indicación en pantalla de fotografiar un solo ticket, plano y entero |
| Límite del nivel gratuito de OCR | Si el volumen de tickets crece, se puede superar el límite gratuito de la API externa y empezar a generar coste | Monitorizar el consumo desde el inicio; tener documentada la migración a motor propio (Fase 4) como plan de salida |
| Calidad de la foto del ticket | Papel térmico desgastado o mal iluminado puede reducir la precisión de lectura | Guía visual en la app para hacer la foto correctamente; posibilidad de repetir la foto (RF-03); revisión manual siempre disponible (RF-13) |
| Elección de framework móvil | Pendiente decidir entre React Native y Flutter | Definir antes de iniciar el desarrollo, valorando la familiaridad del equipo y la reutilización de lógica con el resto del stack (TypeScript) |
| Validación con cliente real | El documento asume un despliegue como producto de AGZAI, pero no se ha definido aún qué cliente será el piloto | Confirmar el cliente/caso de uso piloto antes de iniciar el desarrollo del MVP |

---

## 10. Modelo de negocio

**Modelo:** suscripción freemium.

| Plan | Precio | Incluye |
|---|---|---|
| Gratis | 0€ | ~15-20 tickets/mes, dashboard básico, 1 supermercado a la vez |
| Premium individual | 4,99€/mes | Tickets ilimitados, comparación entre supermercados, histórico completo, exportación |
| Premium compartido (2 personas) | 7€/mes | Todo lo de Premium individual, cuenta compartida entre 2 personas |
| Persona adicional (a partir de la 3ª) | +2€/mes por persona | Se suma a la cuota compartida; una familia de 4 paga 11€/mes (7€ + 2×2€) |

La progresión de precios es coherente: el segundo miembro cuesta 2,01€ adicionales sobre el plan individual, y cada miembro extra a partir del tercero mantiene ese mismo incremento de 2€. Esto hace que compartir cuenta sea siempre más barato que sumar planes individuales por separado (11€/mes para 4 personas frente a 19,96€ si cada una tuviera su propio Premium), lo que incentiva el uso familiar sin canibalizar el ingreso por usuario.

**Margen neto real (no solo el precio de venta):** las comisiones de las tiendas de aplicaciones y de la pasarela de pago reducen lo que realmente se ingresa por suscripción.

| Concepto | Impacto |
|---|---|
| Comisión App Store / Google Play | 15% (programas de pequeña empresa, <1M$/año) a 30% (estándar) sobre cada suscripción cobrada dentro de la app |
| Pasarela de pago externa (ej. Stripe, si se cobra fuera del store) | ~1,4% + 0,25€ por transacción |
| Margen neto aproximado sobre Premium individual (4,99€) | Entre 3,30€ y 4,20€/mes, según la comisión aplicable, antes de descontar el coste de infraestructura y OCR |

Esta cifra debe tenerse en cuenta al validar si el precio de 4,99€/7€ es suficiente para cubrir costes operativos a medida que crece el número de usuarios.

**Por qué freemium y no pago desde el primer ticket:** el coste marginal por usuario gratuito es bajo mientras se mantenga dentro del nivel gratuito de la API de OCR (sección 6), lo que permite que los usuarios prueben la app sin fricción; el límite mensual de tickets del plan gratuito empuja de forma natural a los usuarios más activos (el público más comprometido) hacia el plan de pago.

**Vía de ingresos futura (fuera del MVP):** datos de precios agregados y anonimizados, vendidos a fabricantes o analistas de consumo. Requiere masa crítica de usuarios y un proceso serio de anonimización y transparencia antes de plantearse; se documenta como oportunidad futura, no como parte del alcance actual.

---

## 11. Análisis de competencia

| App | Enfoque | ¿Escanea tickets? | ¿Compara precios entre supermercados? | Modelo |
|---|---|---|---|---|
| Soysuper | Lista de la compra comparada en 9 cadenas | No (añade productos por nombre o código de barras) | Sí, precios de catálogo actuales | Gratis |
| FindItApp | Comparador centrado en Levante, Cataluña y grandes ciudades | Sí, código de barras en tienda | Sí, precios de catálogo actuales | Gratis |
| OCU Market | Comparador con información nutricional (Nutri-Score) | Sí | Sí | Desde 6€/mes (gratis muy limitado) |
| Yuka | Escáner de salud de producto, sugiere alternativas | Sí (producto, no ticket) | No | Gratis, Premium opcional |
| dijit.app | OCR de tickets y facturas para contabilidad | Sí | No | B2B (cadenas y franquicias, no consumidor final) |
| Okticket / Captio / Sabbatic | Gestión de notas de gastos de viaje y empresa | Sí | No | B2B (gastos corporativos) |

**Dónde encaja Tique:** ninguno de los comparadores de precios existentes (Soysuper, FindItApp, OCU Market) construye el precio a partir de lo que el usuario compra de verdad — comparan el precio de catálogo actual del producto, no tu historial real de compra. Las apps que sí leen tickets por OCR (dijit.app, Okticket, Captio) están orientadas a empresas y contabilidad, no a un consumidor que quiere ver si su compra habitual sube o baja de precio. Tique combina ambas cosas — lectura automática del ticket real + comparación de precio del producto entre supermercados — un hueco que hoy no cubre ningún competidor directo.

**Riesgo a tener en cuenta:** Soysuper y FindItApp son gratuitas y ya cubren varias cadenas con comparación de precios, aunque con un mecanismo distinto (catálogo, no ticket). La propuesta de valor de Tique debe apoyarse en la precisión de "tu precio real pagado" frente al precio de catálogo, y en el análisis de tu propio gasto — no en ser "otro comparador más", porque en ese terreno ya hay alternativas gratuitas consolidadas.
