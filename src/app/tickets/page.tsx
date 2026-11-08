import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  procesando: { label: 'Procesando', cls: 'bg-tinta/10 text-tinta/60' },
  revision:   { label: 'Revisar',    cls: 'bg-laton/15 text-laton' },
  confirmado: { label: 'Confirmado', cls: 'bg-verde/15 text-verde' },
  error:      { label: 'Error',      cls: 'bg-pimenton/15 text-pimenton' },
};

function fmtFecha(fecha: string | null) {
  if (!fecha) return null;
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function fmtEuros(n: number | null) {
  if (n == null) return null;
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default async function TicketsPage() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, cadena, fecha, total, estado, created_at')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-tinta">Mis tickets</h1>
        <div className="flex gap-2">
          <Link
            href="/diccionario"
            className="rounded-md border border-linea px-3 py-1.5 text-sm font-medium text-tinta/60 hover:border-tinta/30 transition-colors"
          >
            Diccionario
          </Link>
          <Link
            href="/subir"
            className="rounded-md bg-verde px-3 py-1.5 text-sm font-medium text-papel hover:opacity-90 transition-opacity"
          >
            + Subir
          </Link>
        </div>
      </div>

      {!tickets?.length ? (
        <div className="rounded-xl border border-linea bg-white/30 px-6 py-12 text-center">
          <p className="text-tinta/50 text-sm mb-4">Aún no tienes tickets guardados.</p>
          <Link
            href="/subir"
            className="inline-block rounded-md bg-verde px-4 py-2 text-sm font-medium text-papel hover:opacity-90 transition-opacity"
          >
            Subir el primero
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => {
            const badge = ESTADO_BADGE[t.estado] ?? ESTADO_BADGE.procesando!;
            return (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center justify-between rounded-xl border border-linea bg-white/30 px-4 py-3.5 hover:border-tinta/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-tinta truncate">
                      {t.cadena ?? 'Ticket'}
                    </p>
                    <p className="text-xs text-tinta/50 mt-0.5">
                      {fmtFecha(t.fecha) ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {t.total != null && (
                      <span className="font-mono text-sm font-medium text-tinta">
                        {fmtEuros(t.total)}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-tinta/30 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
