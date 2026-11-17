import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { TabBar } from '@/components/ui/tab-bar';

/* ── Mock data ── */

const user = 'Lucía';

const spending = {
  month: 'noviembre',
  dateRange: '1–17 nov',
  total: '312,40 €',
  vsLabel: '−6 %',
  vsText: '19,95 € menos que en las mismas fechas de octubre',
  ticketCount: 14,
  avgTicket: '22,31 €',
  topSuper: 'Mercadona',
  topSuperCount: 8,
};

const categories = [
  { name: 'Frescos',   amount: '104,20 €', color: '#34D399' },
  { name: 'Despensa',  amount: '98,60 €',  color: '#60A5FA' },
  { name: 'Bebidas',   amount: '38,90 €',  color: '#FBBF24' },
  { name: 'Limpieza',  amount: '27,40 €',  color: '#A78BFA' },
  { name: 'Higiene',   amount: '21,80 €',  color: '#F9A8D4' },
  { name: 'Otros',     amount: '21,50 €',  color: '#B8C4BF' },
];

// IPC monthly bar heights (px), Jan–Nov
const ipcBars = [6, 12, 17, 24, 27, 33, 36, 41, 44, 49, 52];

const tickets = [
  { supermarket: 'Mercadona', initial: 'M', tileBg: 'rgba(52,211,153,0.18)',  tileText: 'var(--tq-mint-text)', date: 'Sáb 14 nov', products: 12, amount: '42,15 €' },
  { supermarket: 'Lidl',      initial: 'L', tileBg: 'rgba(96,165,250,0.2)',   tileText: '#1D4ED8',              date: 'Vie 13 nov', products:  9, amount: '32,10 €' },
  { supermarket: 'Mercadona', initial: 'M', tileBg: 'rgba(52,211,153,0.18)',  tileText: 'var(--tq-mint-text)', date: 'Mié 11 nov', products: 17, amount: '58,40 €' },
  { supermarket: 'Día',       initial: 'D', tileBg: 'rgba(251,191,36,0.22)', tileText: '#8A5A00',              date: 'Lun 9 nov',  products:  9, amount: '25,90 €' },
];

/* ── Shared icons ── */

function IconBell() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/* ── Section components ── */

function PageHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-tq-ink2">Martes, 17 de noviembre</span>
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.6px]">Hola, {user}</h1>
      </div>
      <button
        aria-label="Notificaciones, 1 nueva"
        className="relative w-11 h-11 rounded-[14px] border border-tq-line bg-tq-card text-tq-ink flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-[0.98] hover:-translate-y-px"
      >
        <IconBell />
        <span
          aria-hidden="true"
          className="absolute top-[10px] right-[11px] w-2 h-2 rounded-full bg-tq-coral border-2 border-tq-card"
        />
      </button>
    </header>
  );
}

function SpendingCard() {
  return (
    <section className="tq-in bg-tq-card rounded-[28px] shadow-tq-card flex flex-col gap-3 pt-[22px] px-5 pb-[18px]">
      {/* Title row */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-tq-ink2">Gasto de {spending.month}</span>
        <Chip>{spending.dateRange}</Chip>
      </div>

      {/* Total + badge */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[46px] font-extrabold tracking-[-1.8px] leading-none">
          {spending.total}
        </span>
        <span className="inline-flex items-center gap-[3px] text-sm font-bold text-tq-mint-text bg-tq-mint-soft px-[10px] py-[6px] rounded-full">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M6 13l6 6 6-6" />
          </svg>
          {spending.vsLabel}
        </span>
      </div>

      <p className="m-0 text-[13px] text-tq-ink2">{spending.vsText}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 pt-[14px] mt-0.5 border-t border-tq-line">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-extrabold tracking-[-0.4px]">{spending.ticketCount}</span>
          <span className="text-xs text-tq-ink2">tickets</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-extrabold tracking-[-0.4px]">{spending.avgTicket}</span>
          <span className="text-xs text-tq-ink2">ticket medio</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-extrabold tracking-[-0.4px]">{spending.topSuper}</span>
          <span className="text-xs text-tq-ink2">más usado · {spending.topSuperCount} veces</span>
        </div>
      </div>
    </section>
  );
}

function CategoryDonut() {
  return (
    <Card as="section" className="tq-in tq-d1 p-5">
      <div className="flex justify-between items-center">
        <h2 className="m-0 text-[17px] font-bold">Gasto por categoría</h2>
        <Link href="/productos" className="text-[13px] font-bold text-tq-mint-text no-underline py-2">
          Ver detalle
        </Link>
      </div>

      <div className="flex items-center gap-[18px] mt-2.5">
        {/* Donut SVG */}
        <div className="relative w-[132px] h-[132px] flex-none">
          <svg
            width="132"
            height="132"
            viewBox="0 0 140 140"
            role="img"
            aria-label="Gráfico de anillo: Frescos 33 %, Despensa 32 %, Bebidas 11 %, Limpieza 8 %, Higiene 6 %, Otros 6 %"
          >
            <g transform="rotate(-90 70 70)" fill="none" strokeWidth="18">
              <circle cx="70" cy="70" r="54" stroke="var(--tq-track)" />
              <circle cx="70" cy="70" r="54" stroke="#34D399" strokeDasharray="109.47 339.29" strokeDashoffset="0" />
              <circle cx="70" cy="70" r="54" stroke="#60A5FA" strokeDasharray="106.07 339.29" strokeDashoffset="-111.97" />
              <circle cx="70" cy="70" r="54" stroke="#FBBF24" strokeDasharray="38.21 339.29"  strokeDashoffset="-220.54" />
              <circle cx="70" cy="70" r="54" stroke="#A78BFA" strokeDasharray="28.04 339.29"  strokeDashoffset="-261.25" />
              <circle cx="70" cy="70" r="54" stroke="#F9A8D4" strokeDasharray="21.25 339.29"  strokeDashoffset="-291.79" />
              <circle cx="70" cy="70" r="54" stroke="#B8C4BF" strokeDasharray="21.25 339.29"  strokeDashoffset="-315.54" />
            </g>
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-[21px] font-extrabold tracking-[-0.5px]">312 €</span>
            <span className="text-[11px] font-semibold text-tq-ink2">6 categorías</span>
          </div>
        </div>

        {/* Legend */}
        <ul className="list-none m-0 p-0 flex-1 flex flex-col gap-2 text-[13px]">
          {categories.map((cat) => (
            <li key={cat.name} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-[3px] flex-none"
                style={{ background: cat.color }}
              />
              <span className="flex-1 font-semibold">{cat.name}</span>
              <span className="font-bold">{cat.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function PersonalIPC() {
  return (
    <Card as="section" className="tq-in tq-d2 p-5">
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <h2 className="m-0 text-[17px] font-bold">Tu IPC personal</h2>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-tq-ink2">
              <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
            </svg>
          </div>
          <span className="text-[13px] text-tq-ink2">Tu cesta habitual · desde enero</span>
        </div>
        <span className="text-[32px] font-extrabold tracking-[-1px] text-tq-coral-text leading-none flex-none">
          +4,8 %
        </span>
      </div>

      {/* Bar chart */}
      <div aria-hidden="true" className="flex items-end gap-[6px] h-[56px] mt-4">
        {ipcBars.map((h, i) => (
          <span
            key={i}
            className="tq-bar flex-1"
            style={{
              height: `${h}px`,
              borderRadius: '5px 5px 3px 3px',
              background: i === ipcBars.length - 1 ? '#FF8A73' : 'var(--tq-coral-bar)',
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-tq-ink2 mt-1.5">
        <span>Ene</span>
        <span>Nov</span>
      </div>

      <p className="m-0 mt-3 text-[13px] leading-[1.45] text-tq-ink2">
        La compra que en enero te costaba 51,72 € hoy te cuesta{' '}
        <strong className="text-tq-ink font-bold">54,20 €</strong>.
      </p>
    </Card>
  );
}

function PriceAlert() {
  return (
    <Link
      href="/productos"
      className="tq-in tq-d3 flex gap-3.5 items-center no-underline text-tq-ink bg-tq-coral-soft rounded-[24px] p-4 transition-transform duration-150 active:scale-[0.98] hover:-translate-y-px"
    >
      {/* Icon tile */}
      <span className="w-11 h-11 rounded-[14px] bg-tq-coral flex-none flex items-center justify-center text-[#4A140A]">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" />
        </svg>
      </span>

      {/* Content */}
      <span className="flex-1 flex flex-col gap-[3px]">
        <span className="text-[11px] font-extrabold text-tq-coral-text uppercase tracking-[0.7px]">
          Alerta de precio
        </span>
        <span className="text-[15px] font-bold leading-[1.3]">
          El café molido Hacendado ha subido un 22 % desde enero
        </span>
        <span className="text-[13px] text-tq-ink2">
          3,40 € → 4,15 € · En Lidl está a 3,79 €
        </span>
      </span>

      <IconChevronRight />
    </Link>
  );
}

function BudgetCard() {
  return (
    <Card as="section" className="tq-in tq-d4 p-5">
      <div className="flex justify-between items-baseline">
        <h2 className="m-0 text-[17px] font-bold">Presupuesto mensual</h2>
        <span className="text-[13px] text-tq-ink2">
          <strong className="text-tq-ink text-base font-extrabold">312 €</strong> de 400 €
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-label="Presupuesto usado"
        aria-valuenow={78}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 rounded-full bg-tq-track mt-3.5 overflow-hidden"
      >
        <div className="tq-grow h-full rounded-full bg-tq-mint" style={{ width: '78%' }} />
      </div>

      <div className="flex justify-between mt-2.5 text-[13px]">
        <span className="font-bold">78 % usado</span>
        <span className="text-tq-ink2">Quedan 87,60 € · 13 días</span>
      </div>

      <p className="m-0 mt-2 text-[13px] font-semibold text-tq-mint-text">
        Vas bien: puedes gastar unos 6,74 € al día
      </p>
    </Card>
  );
}

function RecentTickets() {
  return (
    <section className="tq-in tq-d5 flex flex-col gap-2.5">
      <div className="flex justify-between items-center px-1 pt-1">
        <h2 className="m-0 text-[17px] font-bold">Últimos tickets</h2>
        <Link href="/tickets" className="text-[13px] font-bold text-tq-mint-text no-underline py-2">
          Ver todos
        </Link>
      </div>

      <div className="bg-tq-card rounded-[24px] py-1 px-4 shadow-tq-card">
        {tickets.map((t, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 ${i < tickets.length - 1 ? 'border-b border-tq-line' : ''}`}
          >
            {/* Supermarket tile */}
            <span
              className="w-11 h-11 rounded-[14px] flex-none flex items-center justify-center text-[17px] font-extrabold"
              style={{ background: t.tileBg, color: t.tileText }}
            >
              {t.initial}
            </span>
            {/* Info */}
            <span className="flex-1 flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{t.supermarket}</span>
              <span className="text-xs text-tq-ink2">
                {t.date} · {t.products} productos
              </span>
            </span>
            {/* Amount */}
            <span className="text-base font-extrabold">{t.amount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Page ── */

export default function InicioPage() {
  return (
    <div className="min-h-screen bg-tq-bg font-jakarta">
      <main className="mx-auto max-w-[480px] px-5 pt-14 pb-[140px] flex flex-col gap-4">
        <PageHeader />
        <SpendingCard />
        <CategoryDonut />
        <PersonalIPC />
        <PriceAlert />
        <BudgetCard />
        <RecentTickets />
      </main>
      <TabBar active="inicio" />
    </div>
  );
}
