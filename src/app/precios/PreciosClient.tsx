'use client';

import { useState, useMemo } from 'react';
import { TabBar } from '@/components/ui/tab-bar';
import { GRUPOS, GRUPOS_ORDER, type Grupo } from '@/lib/grupos';

export interface PrecioEntry {
  key: string;
  nombre: string;
  marca: string | null;
  grupo: Grupo;
  precio: number;
  fecha: string | null;
  cadena: string | null;
}

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function PrecioRow({ p, showCategory = false }: { p: PrecioEntry; showCategory?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-tq-ink truncate">{p.nombre}</p>
        {p.marca && <p className="text-[12px] text-tq-ink2 mt-0.5">{p.marca}</p>}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {showCategory && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: GRUPOS[p.grupo].color }} />
              <span className="text-[11px] text-tq-ink2">{p.grupo}</span>
            </span>
          )}
          <p className="text-[11px] text-tq-ink2">
            {[p.cadena, fmtDate(p.fecha)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <span className="text-[16px] font-bold text-tq-ink font-mono shrink-0">{fmtEur(p.precio)}</span>
    </div>
  );
}

export function PreciosClient({ precios }: { precios: PrecioEntry[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [abiertos, setAbiertos] = useState<Set<Grupo>>(new Set());

  function toggleGrupo(g: Grupo) {
    setAbiertos(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  const busquedaNorm = busqueda.toLowerCase().trim();

  const byGrupo = useMemo(() => {
    const result: Partial<Record<Grupo, PrecioEntry[]>> = {};
    for (const p of precios) {
      if (!result[p.grupo]) result[p.grupo] = [];
      result[p.grupo]!.push(p);
    }
    return result;
  }, [precios]);

  const filtrados = useMemo(() => {
    if (!busquedaNorm) return null;
    return precios.filter(p =>
      p.nombre.toLowerCase().includes(busquedaNorm) ||
      (p.marca?.toLowerCase().includes(busquedaNorm) ?? false)
    );
  }, [precios, busquedaNorm]);

  const grupos = GRUPOS_ORDER.filter(g => (byGrupo[g]?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-tq-bg font-jakarta flex flex-col">
      {/* Header */}
      <header className="px-5 pt-14 pb-3">
        <h1 className="text-[22px] font-extrabold tracking-[-0.5px]">Precios</h1>
        {precios.length > 0 && (
          <p className="text-[13px] text-tq-ink2 mt-0.5">Últimos precios registrados</p>
        )}

        {/* Search */}
        <div className="relative mt-3">
          <svg
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tq-ink2 pointer-events-none"
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Buscar productos…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-11 rounded-[14px] bg-tq-card border border-tq-line pl-10 pr-4 text-sm text-tq-ink placeholder:text-tq-ink2 focus:outline-none focus:border-tq-mint transition-colors"
          />
        </div>
      </header>

      <main className="flex-1 px-5 pb-32 max-w-[480px] mx-auto w-full">
        {precios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-[20px] bg-tq-chip flex items-center justify-center">
              <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-tq-ink2">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold text-tq-ink">Sin precios aún</p>
              <p className="text-[13px] text-tq-ink2 mt-1">Escanea y confirma tickets para registrar precios.</p>
            </div>
          </div>
        ) : filtrados ? (
          /* ── Search results ── */
          filtrados.length === 0 ? (
            <p className="text-sm text-tq-ink2 py-10 text-center">
              Sin resultados para «{busqueda}»
            </p>
          ) : (
            <div className="bg-tq-card rounded-[20px] shadow-tq-card overflow-hidden">
              {filtrados.map((p, i) => (
                <div key={p.key} className={i > 0 ? 'border-t border-tq-line' : ''}>
                  <PrecioRow p={p} showCategory />
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Accordion by category ── */
          <div className="flex flex-col gap-3">
            {grupos.map(grupo => {
              const isOpen = abiertos.has(grupo);
              const items = byGrupo[grupo]!;
              return (
                <section key={grupo} className="bg-tq-card rounded-[20px] shadow-tq-card overflow-hidden">
                  <button
                    onClick={() => toggleGrupo(grupo)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors active:bg-tq-chip/40"
                  >
                    <span className="w-3 h-3 rounded-full flex-none" style={{ background: GRUPOS[grupo].color }} />
                    <span className="flex-1 text-[15px] font-bold text-tq-ink">{grupo}</span>
                    <span className="text-[13px] text-tq-ink2 font-medium">{items.length}</span>
                    <svg
                      aria-hidden="true"
                      width="18" height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-tq-ink2 flex-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {isOpen && items.map((p, i) => (
                    <div key={p.key} className="border-t border-tq-line">
                      <PrecioRow p={p} />
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </main>

      <TabBar active="precios" />
    </div>
  );
}
