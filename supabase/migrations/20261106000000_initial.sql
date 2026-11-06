-- ============================================================
-- Tique — Esquema inicial
-- ============================================================

create extension if not exists pg_trgm;

-- ----------------------------------------------------------------
-- tickets
-- ----------------------------------------------------------------
create table tickets (
  id           uuid    primary key default gen_random_uuid(),
  user_id      uuid    not null references auth.users(id) on delete cascade,
  cadena       text,                        -- Mercadona | Gadis | Froiz | Eroski | Fruteria | Otro
  fecha        date,
  total        numeric(10,2),
  cuadra       boolean,
  avisos       text[]  not null default '{}',
  estado       text    not null default 'procesando'
                 check (estado in ('procesando','revision','confirmado','error')),
  imagen_path  text    not null,            -- ruta en el bucket privado (user_id/filename)
  ocr_json     jsonb,                       -- respuesta cruda de Vision; evita reprocesar
  error        text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- productos  (diccionario compartido)
-- ----------------------------------------------------------------
create table productos (
  id              uuid    primary key default gen_random_uuid(),
  nombre          text    not null,
  marca           text,
  categoria       text
                    check (categoria in (
                      'Lácteos','Carne','Pescado','Fruta y verdura','Panadería',
                      'Charcutería','Conservas','Bebidas','Limpieza','Higiene',
                      'Congelados','Dulces y snacks','Droguería','Otros'
                    )),
  cantidad        numeric,                  -- tamaño de un envase
  unidad          text    check (unidad in ('g','kg','ml','l','u')),
  unidades_pack   int     not null default 1,
  creado_por      uuid    references auth.users(id),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- alias  (texto de ticket normalizado → producto)
-- ----------------------------------------------------------------
create table alias (
  id              uuid    primary key default gen_random_uuid(),
  cadena          text    not null,
  norm            text    not null,
  producto_id     uuid    references productos(id),
  estado          text    not null default 'pendiente'
                    check (estado in ('pendiente','sugerido_ia','confirmado','ignorado')),
  fuente          text    check (fuente in ('usuario','ia','importado')),
  confianza       numeric,                  -- 0..1
  fmt             text,                     -- formato visto en el ticket
  precio_min      numeric,
  precio_max      numeric,
  n_confirmaciones int    not null default 0,
  sugerencia      jsonb,                    -- respuesta completa de la IA
  ejemplo         text,                     -- texto original de ejemplo
  unique (cadena, norm)
);

create index alias_trgm on alias using gin (norm gin_trgm_ops);

-- ----------------------------------------------------------------
-- ticket_lineas
-- ----------------------------------------------------------------
create table ticket_lineas (
  id              uuid    primary key default gen_random_uuid(),
  ticket_id       uuid    not null references tickets(id) on delete cascade,
  orden           int     not null,
  texto_original  text    not null,
  norm            text,
  alias_id        uuid    references alias(id),
  producto_id     uuid    references productos(id),
  precio          numeric(10,2) not null,   -- importe de la línea
  precio_ref      numeric(10,2),            -- unitario o €/kg
  cant            numeric,
  kg              numeric,
  eurkg           numeric,
  fmt             text,
  estado          text    not null default 'sin_identificar'
                    check (estado in ('auto','sugerida','confirmada','sin_identificar','descartada')),
  motivo_descarte text
);

-- ----------------------------------------------------------------
-- confirmaciones
-- ----------------------------------------------------------------
create table confirmaciones (
  id          uuid    primary key default gen_random_uuid(),
  alias_id    uuid    not null references alias(id) on delete cascade,
  producto_id uuid    references productos(id),
  user_id     uuid    not null references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ================================================================
-- RLS
-- ================================================================

-- tickets: cada usuario solo ve y modifica los suyos
alter table tickets enable row level security;
create policy "tickets_propios" on tickets
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ticket_lineas: acceso a través de la propiedad del ticket
alter table ticket_lineas enable row level security;
create policy "lineas_propias" on ticket_lineas
  for all
  using  (exists (select 1 from tickets where id = ticket_id and user_id = auth.uid()))
  with check (exists (select 1 from tickets where id = ticket_id and user_id = auth.uid()));

-- productos: lectura para autenticados; escritura solo con clave de servicio (bypassa RLS)
alter table productos enable row level security;
create policy "productos_lectura" on productos
  for select
  using (auth.role() = 'authenticated');

-- alias: lectura para autenticados; escritura solo con clave de servicio
alter table alias enable row level security;
create policy "alias_lectura" on alias
  for select
  using (auth.role() = 'authenticated');

-- confirmaciones: el usuario inserta y lee las suyas
alter table confirmaciones enable row level security;
create policy "confirmaciones_propias" on confirmaciones
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ================================================================
-- Storage — bucket privado
-- ================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tickets',
  'tickets',
  false,
  52428800,  -- 50 MB
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do nothing;

-- Los archivos se suben bajo la ruta user_id/filename
create policy "tickets_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tickets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tickets_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tickets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tickets_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tickets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- Función de búsqueda aproximada de alias
-- ================================================================

create or replace function buscar_alias(
  p_cadena  text,
  p_norm    text,
  p_umbral  real default 0.82
)
returns table (
  id          uuid,
  norm        text,
  producto_id uuid,
  estado      text,
  confianza   numeric,
  precio_min  numeric,
  precio_max  numeric,
  similitud   real
)
language sql stable
security definer   -- se llama desde el servidor; los alias son de lectura pública
as $$
  select
    a.id,
    a.norm,
    a.producto_id,
    a.estado,
    a.confianza,
    a.precio_min,
    a.precio_max,
    similarity(a.norm, p_norm)::real as similitud
  from alias a
  where a.cadena = p_cadena
    and similarity(a.norm, p_norm) >= p_umbral
  order by similitud desc;
$$;
