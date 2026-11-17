import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TabBar } from '@/components/ui/tab-bar';
import { GRUPOS, GRUPOS_ORDER, mapGrupo, type Grupo } from '@/lib/grupos';

export const dynamic = 'force-dynamic';

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

interface ProdAgregado {
  id: string;
  nombre: string;
  marca: string | null;
  grupo: Grupo;
  compras: number;
  ultimoPrecio: number;
  ultimaFecha: string | null;
  ultimaCadena: string | null;
}

export default async function ProductosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: lineas } = await supabase
    .from('ticket_lineas')
    .select('precio, productos(id, nombre, marca, categoria), tickets(fecha, cadena)')
    .in('estado', ['auto', 'sugerida', 'confirmada'])
    .not('producto_id', 'is', null);

  // Aggregate by product
  const map = new Map<string, ProdAgregado>();

  for (const l of lineas ?? []) {
    const prod = (l.productos as unknown as { id: string; nombre: string; marca: string | null; categoria: string } | null);
    if (!prod?.id) continue;
    const ticket = (l.tickets as unknown as { fecha: string | null; cadena: string | null } | null);

    if (!map.has(prod.id)) {
      map.set(prod.id, {
        id: prod.id,
        nombre: prod.nombre ?? '—',
        marca: prod.marca ?? null,
        grupo: mapGrupo(prod.categoria ?? 'Otros'),
        compras: 0,
        ultimoPrecio: 0,
        ultimaFecha: null,
        ultimaCadena: null,
      });
    }

    const agg = map.get(prod.id)!;
    agg.compras += 1;
    if (!agg.ultimaFecha || (ticket?.fecha && ticket.fecha > agg.ultimaFecha)) {
      agg.ultimoPrecio = l.precio ?? 0;
      agg.ultimaFecha = ticket?.fecha ?? null;
      agg.ultimaCadena = ticket?.cadena ?? null;
    }
  }

  // Group by GRUPOS
  const byGrupo: Partial<Record<Grupo, ProdAgregado[]>> = {};
  for (const p of map.values()) {
    if (!byGrupo[p.grupo]) byGrupo[p.grupo] = [];
    byGrupo[p.grupo]!.push(p);
  }
  for (const grupo of GRUPOS_ORDER) {
    byGrupo[grupo]?.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  const hasProducts = map.size > 0;

  return (
    <div className="min-h-screen bg-tq-bg font-jakarta flex flex-col">
      {/* Header */}
      <header className="px-5 pt-14 pb-4">
        <h1 className="text-[22px] font-extrabold tracking-[-0.5px]">Mis productos</h1>
        <p className="text-[13px] text-tq-ink2 mt-0.5">Productos que has comprado</p>
      </header>

      <main className="flex-1 px-5 pb-32 max-w-[480px] mx-auto w-full">
        {!hasProducts ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-[20px] bg-tq-chip flex items-center justify-center">
              <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-tq-ink2">
                <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8.5-8.5 8.5z" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold text-tq-ink">Sin productos aún</p>
              <p className="text-[13px] text-tq-ink2 mt-1">
                Escanea tickets y confirma los productos para verlos aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {GRUPOS_ORDER.filter(g => (byGrupo[g]?.length ?? 0) > 0).map(grupo => (
              <section key={grupo}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full flex-none" style={{ background: GRUPOS[grupo].color }} />
                  <h2 className="text-xs font-bold text-tq-ink uppercase tracking-[0.08em]">{grupo}</h2>
                  <span className="text-xs text-tq-ink2">({byGrupo[grupo]!.length})</span>
                </div>

                {/* Product list card */}
                <div className="bg-tq-card rounded-[20px] shadow-tq-card overflow-hidden">
                  {byGrupo[grupo]!.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-tq-line' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-tq-ink truncate">{p.nombre}</p>
                        {p.marca && (
                          <p className="text-[12px] text-tq-ink2 mt-0.5">{p.marca}</p>
                        )}
                        {(p.ultimaCadena || p.ultimaFecha) && (
                          <p className="text-[11px] text-tq-ink2 mt-0.5">
                            {[p.ultimaCadena, fmtDate(p.ultimaFecha)].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[14px] font-bold text-tq-ink font-mono">
                          {fmtEur(p.ultimoPrecio)}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-tq-chip text-tq-ink2">
                          ×{p.compras}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <TabBar active="productos" />
    </div>
  );
}
