import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmtFecha(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function fmtEuros(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m ?? '1') - 1]} ${y}`;
}

const ESTADO_STYLES: Record<string, { label: string; cls: string }> = {
  procesando: { label: 'Procesando', cls: 'bg-tq-chip text-tq-ink2' },
  revision:   { label: 'Revisar',    cls: 'bg-amber-100 text-amber-600' },
  confirmado: { label: 'Confirmado', cls: 'bg-tq-mint-soft text-tq-mint-text' },
  error:      { label: 'Error',      cls: 'bg-tq-coral-soft text-tq-coral-text' },
};

const SUPER_TILES: Record<string, { bg: string; text: string }> = {
  Mercadona: { bg: 'rgba(52,211,153,0.18)',  text: 'var(--tq-mint-text)' },
  Lidl:      { bg: 'rgba(96,165,250,0.2)',   text: '#1D4ED8' },
  Día:       { bg: 'rgba(251,191,36,0.22)',  text: '#8A5A00' },
  Carrefour: { bg: 'rgba(245,158,11,0.18)',  text: '#D97706' },
  Eroski:    { bg: 'rgba(239,68,68,0.15)',   text: '#B91C1C' },
  Gadis:     { bg: 'rgba(139,92,246,0.15)',  text: '#6D28D9' },
  Froiz:     { bg: 'rgba(20,184,166,0.15)',  text: '#0F766E' },
};

function tileStyle(cadena: string | null) {
  if (cadena && SUPER_TILES[cadena]) return SUPER_TILES[cadena];
  return { bg: 'rgba(100,116,139,0.12)', text: '#475569' };
}

type Ticket = {
  id: string;
  cadena: string | null;
  fecha: string | null;
  total: number | null;
  estado: string;
  created_at: string;
};

function TicketCard({ ticket }: { ticket: Ticket }) {
  const badge = ESTADO_STYLES[ticket.estado] ?? ESTADO_STYLES.procesando!;
  const style = tileStyle(ticket.cadena);
  const initial = (ticket.cadena?.[0] ?? '?').toUpperCase();

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="bg-tq-card rounded-[20px] shadow-tq-card p-4 flex items-center gap-3 no-underline transition-transform active:scale-[0.98]"
    >
      {/* Supermarket bubble */}
      <div
        className="w-11 h-11 rounded-[14px] flex-none flex items-center justify-center text-base font-extrabold"
        style={{ background: style.bg, color: style.text }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-tq-ink truncate">{ticket.cadena ?? 'Ticket'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-tq-ink2">{ticket.fecha ? fmtFecha(ticket.fecha) : '—'}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Total + chevron */}
      <div className="flex items-center gap-1.5 shrink-0">
        {ticket.total != null && (
          <span className="font-mono text-[15px] font-semibold text-tq-ink">
            {fmtEuros(ticket.total)}
          </span>
        )}
        <svg
          aria-hidden="true"
          width="18" height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-tq-ink2 flex-none"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}

export default async function TicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, cadena, fecha, total, estado, created_at')
    .order('created_at', { ascending: false });

  // Group by month
  const grouped = new Map<string, Ticket[]>();
  for (const t of (tickets ?? []) as Ticket[]) {
    const key = (t.fecha ?? t.created_at).slice(0, 7);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }
  const months = [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="min-h-screen bg-tq-bg font-jakarta flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-14 pb-4">
        <Link
          href="/inicio"
          aria-label="Volver al inicio"
          className="w-10 h-10 rounded-[14px] border border-tq-line bg-tq-card text-tq-ink flex items-center justify-center no-underline transition-transform active:scale-[0.95]"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-0.5px]">Mis tickets</h1>
      </header>

      <main className="flex-1 px-5 pb-10 flex flex-col gap-6 max-w-[480px] mx-auto w-full">
        {months.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-[20px] bg-tq-chip flex items-center justify-center">
              <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-tq-ink2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold text-tq-ink">Sin tickets aún</p>
              <p className="text-[13px] text-tq-ink2 mt-1">Escanea tu primer ticket para empezar.</p>
            </div>
            <Link
              href="/escanear"
              className="h-12 px-6 rounded-[16px] bg-tq-mint text-tq-mint-ink text-sm font-bold flex items-center justify-center no-underline transition-transform active:scale-[0.97]"
            >
              Escanear ticket
            </Link>
          </div>
        ) : (
          months.map(([monthKey, monthTickets]) => (
            <section key={monthKey}>
              <h2 className="text-xs font-bold text-tq-ink2 uppercase tracking-[0.08em] mb-3">
                {monthLabel(monthKey)}
              </h2>
              <div className="flex flex-col gap-2.5">
                {monthTickets.map(t => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
