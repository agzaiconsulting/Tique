import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

type CadenaPrecio = {
  cadena: string;
  precio_min: number;
  precio_max: number;
  precio_avg: number;
  compras: number;
};

type ProductoRanking = {
  producto_id: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  total_compras: number;
  por_cadena: CadenaPrecio[];
};

const CATEGORIA_COLOR: Record<string, string> = {
  'Lácteos':          'bg-blue-50 text-blue-600',
  'Carne':            'bg-red-50 text-red-600',
  'Pescado':          'bg-cyan-50 text-cyan-600',
  'Fruta y verdura':  'bg-green-50 text-green-600',
  'Panadería':        'bg-amber-50 text-amber-700',
  'Charcutería':      'bg-orange-50 text-orange-600',
  'Conservas':        'bg-yellow-50 text-yellow-700',
  'Bebidas':          'bg-purple-50 text-purple-600',
  'Limpieza':         'bg-teal-50 text-teal-600',
  'Higiene':          'bg-pink-50 text-pink-600',
  'Congelados':       'bg-indigo-50 text-indigo-600',
  'Dulces y snacks':  'bg-rose-50 text-rose-600',
  'Droguería':        'bg-lime-50 text-lime-700',
  'Otros':            'bg-gray-50 text-gray-500',
};

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const service = createServiceClient();

  const { data, error } = await service.rpc('ranking_productos', { limite: 30 });

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-pimenton">Error al cargar el ranking: {error.message}</p>
      </main>
    );
  }

  const productos = (data ?? []) as ProductoRanking[];

  return (
    <main className="min-h-screen pb-8">
      <div className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/tickets" className="text-tinta/50 hover:text-tinta transition-colors" aria-label="Volver">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="font-display text-xl text-tinta flex-1">Lo más comprado</h1>
          <span className="text-xs text-tinta/40">Top {productos.length}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
        {productos.length === 0 ? (
          <div className="rounded-xl border border-linea bg-white/30 px-6 py-12 text-center">
            <p className="text-sm text-tinta/50">Aún no hay suficientes datos.</p>
          </div>
        ) : (
          productos.map((p, i) => {
            const colorClass = CATEGORIA_COLOR[p.categoria ?? 'Otros'] ?? CATEGORIA_COLOR['Otros'];
            return (
              <div key={p.producto_id} className="rounded-xl border border-linea bg-white/40 p-4">
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <span className="mt-0.5 w-7 text-right text-sm font-mono text-tinta/30 shrink-0">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Nombre + categoría */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-tinta text-sm leading-snug">
                        {p.nombre}
                        {p.marca && (
                          <span className="font-normal text-tinta/50"> · {p.marca}</span>
                        )}
                      </span>
                      {p.categoria && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                          {p.categoria}
                        </span>
                      )}
                    </div>

                    {/* Veces comprado */}
                    <p className="text-xs text-tinta/40 mb-2">
                      {p.total_compras} {p.total_compras === 1 ? 'vez' : 'veces'} comprado
                    </p>

                    {/* Precios por supermercado */}
                    <div className="space-y-1">
                      {p.por_cadena.map((c) => (
                        <div key={c.cadena} className="flex items-center gap-2 text-xs">
                          <span className="w-24 shrink-0 text-tinta/60 font-medium">{c.cadena}</span>
                          {c.precio_min === c.precio_max ? (
                            <span className="text-tinta">{fmt(c.precio_min)}</span>
                          ) : (
                            <span className="text-tinta">
                              {fmt(c.precio_min)}
                              <span className="text-tinta/40 mx-1">–</span>
                              {fmt(c.precio_max)}
                              <span className="text-tinta/40 ml-1">(media {fmt(c.precio_avg)})</span>
                            </span>
                          )}
                          <span className="ml-auto text-tinta/30">{c.compras}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
