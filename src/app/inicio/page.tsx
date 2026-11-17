import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { TabBar } from '@/components/ui/tab-bar';
import { GRUPOS, mapGrupo, type Grupo } from '@/lib/grupos';

export const dynamic = 'force-dynamic';

/* ── Supermarket tile colors ── */

const SUPER_TILES: Record<string, { bg: string; text: string }> = {
  Mercadona: { bg: 'rgba(52,211,153,0.18)', text: 'var(--tq-mint-text)' },
  Lidl:      { bg: 'rgba(96,165,250,0.2)',  text: '#1D4ED8' },
  Día:       { bg: 'rgba(251,191,36,0.22)', text: '#8A5A00' },
  Carrefour: { bg: 'rgba(245,158,11,0.18)', text: '#D97706' },
  Eroski:    { bg: 'rgba(239,68,68,0.15)',  text: '#B91C1C' },
  Gadis:     { bg: 'rgba(139,92,246,0.15)', text: '#6D28D9' },
  Froiz:     { bg: 'rgba(20,184,166,0.15)', text: '#0F766E' },
};

function tileStyle(cadena: string | null) {
  if (cadena && SUPER_TILES[cadena]) return SUPER_TILES[cadena];
  return { bg: 'rgba(100,116,139,0.15)', text: '#475569' };
}

/* ── Formatting helpers ── */

const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Donut computation ── */

interface Segment {
  grupo: Grupo;
  total: number;
  color: string;
  dasharray: string;
  dashoffset: string;
}

function buildSegments(grouped: Partial<Record<Grupo, number>>, total: number): Segment[] {
  const C = 339.29; // 2π × 54
  const GAP = 2.5;
  let offset = 0;
  const segs: Segment[] = [];
  for (const [grupo, { color, order }] of (Object.entries(GRUPOS) as [Grupo, typeof GRUPOS[Grupo]][]).sort((a, b) => a[1].order - b[1].order)) {
    const amount = grouped[grupo] ?? 0;
    if (amount <= 0) continue;
    const len = (amount / total) * C;
    segs.push({
      grupo,
      total: amount,
      color,
      dasharray: `${len.toFixed(2)} ${C}`,
      dashoffset: `${(-offset).toFixed(2)}`,
    });
    offset += len + GAP;
  }
  return segs;
}

/* ── Empty state ── */

function InicioVacio() {
  return (
    <div className="min-h-screen bg-tq-bg font-jakarta flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center max-w-[480px] mx-auto w-full gap-5">
        <div className="w-20 h-20 rounded-[26px] bg-tq-mint-soft flex items-center justify-center">
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tq-mint-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
            <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" /><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
            <path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-extrabold tracking-[-0.5px]">Escanea tu primer ticket</h1>
          <p className="text-[14px] text-tq-ink2 leading-relaxed">
            Fotografía un ticket de supermercado y Tique extraerá los productos, el total y la fecha automáticamente.
          </p>
        </div>
        <Link
          href="/escanear"
          className="w-full h-14 rounded-[18px] bg-tq-mint text-tq-mint-ink text-base font-bold flex items-center justify-center gap-2.5 no-underline transition-transform active:scale-[0.97]"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
            <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" /><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
            <path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" />
          </svg>
          Escanear ticket
        </Link>
        <p className="text-xs text-tq-ink2">También puedes subir una foto o un PDF</p>
      </main>
      <TabBar active="inicio" />
    </div>
  );
}

/* ── Page ── */

export default async function InicioPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /* ── Dates ── */
  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStart = `${year}-${pad(month)}-01`;
  const today      = `${year}-${pad(month)}-${pad(day)}`;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevMonthStart = `${prevYear}-${pad(prevMonth)}-01`;
  const prevToday      = `${prevYear}-${pad(prevMonth)}-${pad(day)}`;

  /* ── Parallel queries ── */
  const [thisMonthRes, prevMonthRes, recentRes] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, cadena, fecha, total')
      .gte('fecha', monthStart)
      .lte('fecha', today)
      .in('estado', ['confirmado', 'revision']),

    supabase
      .from('tickets')
      .select('total')
      .gte('fecha', prevMonthStart)
      .lte('fecha', prevToday)
      .in('estado', ['confirmado', 'revision']),

    supabase
      .from('tickets')
      .select('id, cadena, fecha, total, ticket_lineas(id)')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const thisMonthTickets = thisMonthRes.data ?? [];
  const recentTickets    = recentRes.data ?? [];

  /* Empty state */
  if (recentTickets.length === 0) return <InicioVacio />;

  /* ── This-month stats ── */
  const totalGasto   = thisMonthTickets.reduce((s, t) => s + (t.total ?? 0), 0);
  const ticketCount  = thisMonthTickets.length;
  const avgTicket    = ticketCount > 0 ? totalGasto / ticketCount : 0;

  const superCount: Record<string, number> = {};
  thisMonthTickets.forEach(t => { if (t.cadena) superCount[t.cadena] = (superCount[t.cadena] ?? 0) + 1; });
  const topSuperEntry = Object.entries(superCount).sort((a, b) => b[1] - a[1])[0];

  const prevTotal   = (prevMonthRes.data ?? []).reduce((s, t) => s + (t.total ?? 0), 0);
  const vsPercent   = prevTotal > 0 ? ((totalGasto - prevTotal) / prevTotal) * 100 : null;
  const vsDiff      = prevTotal > 0 ? Math.abs(totalGasto - prevTotal) : null;

  /* ── Category breakdown ── */
  const thisIds = thisMonthTickets.map(t => t.id);
  let segments: Segment[] = [];

  if (thisIds.length > 0) {
    const { data: lineas } = await supabase
      .from('ticket_lineas')
      .select('precio, productos(categoria)')
      .in('ticket_id', thisIds)
      .in('estado', ['auto', 'sugerida', 'confirmada'])
      .not('producto_id', 'is', null);

    if (lineas && lineas.length > 0) {
      const grouped: Partial<Record<Grupo, number>> = {};
      lineas.forEach(l => {
        const cat = (l.productos as unknown as { categoria: string } | null)?.categoria ?? 'Otros';
        const grupo = mapGrupo(cat);
        grouped[grupo] = (grouped[grupo] ?? 0) + (l.precio ?? 0);
      });
      segments = buildSegments(grouped, totalGasto);
    }
  }

  /* ── Formatting for display ── */
  const nombre   = (user.user_metadata?.name ?? user.user_metadata?.full_name ?? '').split(' ')[0] || 'Hola';
  const fechaStr = capitalize(now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  const rangoStr = `1–${day} ${MONTHS_ES[month - 1]}`;
  const mesStr   = MONTH_NAMES[month - 1];

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-tq-bg font-jakarta">
      <main className="mx-auto max-w-[480px] px-5 pt-14 pb-[140px] flex flex-col gap-4">

        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-tq-ink2">{fechaStr}</span>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.6px]">Hola, {nombre}</h1>
          </div>
          <Link
            href="/tickets"
            aria-label="Ver historial de tickets"
            className="w-11 h-11 rounded-[14px] border border-tq-line bg-tq-card text-tq-ink flex items-center justify-center no-underline transition-transform active:scale-[0.98] hover:-translate-y-px"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </Link>
        </header>

        {/* Spending card */}
        {ticketCount > 0 ? (
          <section className="tq-in bg-tq-card rounded-[28px] shadow-tq-card flex flex-col gap-3 pt-[22px] px-5 pb-[18px]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-tq-ink2">Gasto de {mesStr}</span>
              <Chip>{rangoStr}</Chip>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[46px] font-extrabold tracking-[-1.8px] leading-none">
                {fmtEur(totalGasto)}
              </span>
              {vsPercent !== null && (
                <span className={`inline-flex items-center gap-[3px] text-sm font-bold px-[10px] py-[6px] rounded-full ${vsPercent <= 0 ? 'text-tq-mint-text bg-tq-mint-soft' : 'text-tq-coral-text bg-tq-coral-soft'}`}>
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    {vsPercent <= 0
                      ? <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>
                      : <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>
                    }
                  </svg>
                  {vsPercent > 0 ? '+' : ''}{vsPercent.toFixed(0)} %
                </span>
              )}
            </div>

            {vsDiff !== null && (
              <p className="m-0 text-[13px] text-tq-ink2">
                {vsPercent! <= 0
                  ? `${fmtEur(vsDiff)} menos que en las mismas fechas de ${MONTH_NAMES[prevMonth - 1]}`
                  : `${fmtEur(vsDiff)} más que en las mismas fechas de ${MONTH_NAMES[prevMonth - 1]}`
                }
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 pt-[14px] mt-0.5 border-t border-tq-line">
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-extrabold tracking-[-0.4px]">{ticketCount}</span>
                <span className="text-xs text-tq-ink2">tickets</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-extrabold tracking-[-0.4px]">{fmtEur(avgTicket)}</span>
                <span className="text-xs text-tq-ink2">ticket medio</span>
              </div>
              {topSuperEntry ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-lg font-extrabold tracking-[-0.4px] truncate">{topSuperEntry[0]}</span>
                  <span className="text-xs text-tq-ink2">más usado · {topSuperEntry[1]} {topSuperEntry[1] === 1 ? 'vez' : 'veces'}</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          /* No tickets this month */
          <section className="tq-in bg-tq-card rounded-[28px] shadow-tq-card p-5">
            <p className="text-[15px] font-semibold text-tq-ink2 text-center py-2">
              Todavía no hay tickets en {mesStr}.
            </p>
            <Link
              href="/escanear"
              className="mt-3 flex items-center justify-center gap-2 w-full h-12 rounded-[16px] bg-tq-mint text-tq-mint-ink text-sm font-bold no-underline transition-transform active:scale-[0.97]"
            >
              Escanear primer ticket del mes
            </Link>
          </section>
        )}

        {/* Category donut — only if we have category data */}
        {segments.length > 0 && (
          <Card as="section" className="tq-in tq-d1 p-5">
            <h2 className="m-0 text-[17px] font-bold mb-2.5">Gasto por categoría</h2>
            <div className="flex items-center gap-[18px]">
              <div className="relative w-[132px] h-[132px] flex-none">
                <svg
                  width="132"
                  height="132"
                  viewBox="0 0 140 140"
                  role="img"
                  aria-label={`Gráfico de categorías: ${segments.map(s => s.grupo).join(', ')}`}
                >
                  <g transform="rotate(-90 70 70)" fill="none" strokeWidth="18">
                    <circle cx="70" cy="70" r="54" stroke="var(--tq-track)" />
                    {segments.map(seg => (
                      <circle
                        key={seg.grupo}
                        cx="70" cy="70" r="54"
                        stroke={seg.color}
                        strokeDasharray={seg.dasharray}
                        strokeDashoffset={seg.dashoffset}
                      />
                    ))}
                  </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[21px] font-extrabold tracking-[-0.5px]">
                    {Math.round(totalGasto)} €
                  </span>
                  <span className="text-[11px] font-semibold text-tq-ink2">
                    {segments.length} {segments.length === 1 ? 'categoría' : 'categorías'}
                  </span>
                </div>
              </div>
              <ul className="list-none m-0 p-0 flex-1 flex flex-col gap-2 text-[13px]">
                {segments.map(seg => (
                  <li key={seg.grupo} className="flex items-center gap-2">
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: seg.color }} />
                    <span className="flex-1 font-semibold">{seg.grupo}</span>
                    <span className="font-bold">{fmtEur(seg.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Recent tickets */}
        <section className="tq-in tq-d2 flex flex-col gap-2.5">
          <div className="flex justify-between items-center px-1 pt-1">
            <h2 className="m-0 text-[17px] font-bold">Últimos tickets</h2>
            <Link href="/tickets" className="text-[13px] font-bold text-tq-mint-text no-underline py-2">
              Ver todos
            </Link>
          </div>
          <div className="bg-tq-card rounded-[24px] py-1 px-4 shadow-tq-card">
            {recentTickets.map((t, i) => {
              const tile = tileStyle(t.cadena);
              const initial = (t.cadena ?? '?').charAt(0).toUpperCase();
              const nLineas = Array.isArray((t as { ticket_lineas?: unknown[] }).ticket_lineas)
                ? (t as { ticket_lineas: unknown[] }).ticket_lineas.length
                : null;
              return (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className={`flex items-center gap-3 py-3 no-underline text-tq-ink transition-opacity active:opacity-70 ${i < recentTickets.length - 1 ? 'border-b border-tq-line' : ''}`}
                >
                  <span
                    className="w-11 h-11 rounded-[14px] flex-none flex items-center justify-center text-[17px] font-extrabold"
                    style={{ background: tile.bg, color: tile.text }}
                  >
                    {initial}
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{t.cadena ?? 'Ticket'}</span>
                    <span className="text-xs text-tq-ink2">
                      {t.fecha ? fmtDate(t.fecha) : '—'}
                      {nLineas !== null && nLineas > 0 ? ` · ${nLineas} productos` : ''}
                    </span>
                  </span>
                  <span className="text-base font-extrabold">
                    {t.total != null ? fmtEur(t.total) : '—'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA when no tickets this month */}
        {ticketCount === 0 && (
          <Link
            href="/escanear"
            className="tq-in tq-d3 flex gap-3.5 items-center no-underline text-tq-ink bg-tq-mint-soft rounded-[24px] p-4 transition-transform active:scale-[0.98]"
          >
            <span className="w-11 h-11 rounded-[14px] bg-tq-mint flex-none flex items-center justify-center text-tq-mint-ink">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
                <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" /><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
                <path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" />
              </svg>
            </span>
            <span className="flex-1 flex flex-col gap-[3px]">
              <span className="text-[11px] font-extrabold text-tq-mint-text uppercase tracking-[0.7px]">Empieza el mes</span>
              <span className="text-[15px] font-bold leading-[1.3]">Escanea tu primer ticket de {mesStr}</span>
            </span>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-tq-ink2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        )}

      </main>
      <TabBar active="inicio" />
    </div>
  );
}
