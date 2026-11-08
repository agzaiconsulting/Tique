create or replace function ranking_productos(limite int default 30)
returns table (
  producto_id  uuid,
  nombre       text,
  marca        text,
  categoria    text,
  total_compras bigint,
  por_cadena   jsonb
)
language sql stable security definer as $$
  with por_cadena as (
    select
      tl.producto_id,
      t.cadena,
      count(*)                            as compras,
      min(tl.precio)                      as precio_min,
      max(tl.precio)                      as precio_max,
      round(avg(tl.precio)::numeric, 2)   as precio_avg
    from ticket_lineas tl
    join tickets t on t.id = tl.ticket_id
    where tl.estado in ('auto', 'sugerida', 'confirmada')
      and tl.producto_id is not null
      and t.cadena is not null
    group by tl.producto_id, t.cadena
  ),
  totales as (
    select
      producto_id,
      sum(compras) as total_compras,
      jsonb_agg(
        jsonb_build_object(
          'cadena',     cadena,
          'precio_min', precio_min,
          'precio_max', precio_max,
          'precio_avg', precio_avg,
          'compras',    compras
        ) order by compras desc
      ) as por_cadena
    from por_cadena
    group by producto_id
    order by total_compras desc
    limit limite
  )
  select
    tot.producto_id,
    p.nombre,
    p.marca,
    p.categoria,
    tot.total_compras,
    tot.por_cadena
  from totales tot
  join productos p on p.id = tot.producto_id
  order by tot.total_compras desc;
$$;
