import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DiccionarioClient from './DiccionarioClient';
import type { AliasItem } from './DiccionarioClient';

type SearchParams = Promise<{ cadena?: string; estado?: string }>;

const ESTADOS_FILTRO = [
  { valor: 'sugerido_ia', label: 'Por revisar' },
  { valor: 'confirmado',  label: 'Confirmados' },
  { valor: 'pendiente',   label: 'Sin sugerencia' },
  { valor: 'ignorado',    label: 'Ignorados' },
] as const;

export default async function DiccionarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { cadena, estado = 'sugerido_ia' } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('alias')
    .select(
      'id, cadena, norm, estado, n_confirmaciones, sugerencia, ejemplo, fmt, producto_id',
    )
    .eq('estado', estado)
    .order('n_confirmaciones', { ascending: false })
    .limit(200);

  if (cadena) query = query.eq('cadena', cadena);

  const { data: aliasRows } = await query;

  // Enriquecer con nombre del producto donde exista
  const productoIds = [
    ...new Set(
      (aliasRows ?? []).filter((a) => a.producto_id).map((a) => a.producto_id as string),
    ),
  ];
  const productoMap = new Map<string, string>();
  if (productoIds.length) {
    const { data: prods } = await supabase
      .from('productos')
      .select('id, nombre')
      .in('id', productoIds);
    for (const p of prods ?? []) productoMap.set(p.id as string, p.nombre as string);
  }

  // Cadenas disponibles (para el filtro)
  const { data: cadenasData } = await supabase
    .from('alias')
    .select('cadena')
    .not('cadena', 'is', null);
  const cadenas = [...new Set((cadenasData ?? []).map((r) => r.cadena as string))].sort();

  const items: AliasItem[] = (aliasRows ?? []).map((a) => ({
    id: a.id as string,
    cadena: a.cadena as string,
    norm: a.norm as string,
    estado: a.estado as AliasItem['estado'],
    nConfirmaciones: a.n_confirmaciones as number,
    sugerencia: a.sugerencia as AliasItem['sugerencia'],
    ejemplo: (a.ejemplo as string | null) ?? null,
    fmt: (a.fmt as string | null) ?? null,
    productoId: (a.producto_id as string | null) ?? null,
    productoNombre: a.producto_id ? productoMap.get(a.producto_id as string) ?? null : null,
  }));

  // Construye un UrlObject conservando los parámetros actuales
  function hrefDic(overrides: Record<string, string | undefined>) {
    const query: Record<string, string> = {};
    if (cadena) query.cadena = cadena;
    if (estado) query.estado = estado;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete query[k];
      else query[k] = v;
    }
    return { pathname: '/diccionario', query };
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/tickets" className="text-tinta/50 hover:text-tinta transition-colors" aria-label="Volver a mis tickets">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="font-display text-xl text-tinta flex-1">Diccionario</h1>
          <span className="text-xs text-tinta/40">{items.length} entradas</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Filtro por estado */}
        <div className="flex gap-2 flex-wrap">
          {ESTADOS_FILTRO.map((e) => (
            <Link
              key={e.valor}
              href={hrefDic({ estado: e.valor })}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                estado === e.valor
                  ? 'bg-tinta text-papel'
                  : 'border border-linea text-tinta/60 hover:border-tinta/30',
              ].join(' ')}
            >
              {e.label}
            </Link>
          ))}
        </div>

        {/* Filtro por cadena */}
        {cadenas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={hrefDic({ cadena: undefined })}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !cadena ? 'bg-verde/20 text-verde' : 'border border-linea text-tinta/60 hover:border-tinta/30',
              ].join(' ')}
            >
              Todas
            </Link>
            {cadenas.map((c) => (
              <Link
                key={c}
                href={hrefDic({ cadena: c })}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  cadena === c
                    ? 'bg-verde/20 text-verde'
                    : 'border border-linea text-tinta/60 hover:border-tinta/30',
                ].join(' ')}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {/* Lista */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-linea bg-white/30 px-6 py-12 text-center">
            <p className="text-sm text-tinta/50">No hay entradas con este filtro.</p>
          </div>
        ) : (
          <DiccionarioClient items={items} estadoActivo={estado} />
        )}
      </div>
    </main>
  );
}
