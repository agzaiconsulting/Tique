import Link from 'next/link';
import { cn } from '@/lib/cn';

export type TabKey = 'inicio' | 'productos' | 'precios' | 'perfil';

interface TabBarProps {
  active: TabKey;
}

const tabs: { key: TabKey; label: string; href: string; icon: React.ReactNode }[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    href: '/inicio',
    icon: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    key: 'productos',
    label: 'Productos',
    href: '/productos',
    icon: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8.5-8.5 8.5z" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
    ),
  },
  {
    key: 'precios',
    label: 'Precios',
    href: '/precios',
    icon: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    ),
  },
  {
    key: 'perfil',
    label: 'Perfil',
    href: '/perfil',
    icon: (
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

export function TabBar({ active }: TabBarProps) {
  return (
    <nav aria-label="Navegación principal" className="fixed bottom-0 inset-x-0 z-50 font-jakarta">
      <div className="relative h-[104px] mx-auto max-w-[480px]">
        {/* Bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[84px] bg-tq-bar-bg border-t border-tq-line rounded-t-[24px] grid grid-cols-5 items-start pt-[10px] px-[6px]"
          style={{ boxShadow: '0 -8px 24px rgba(20,48,36,0.06)' }}
        >
          {tabs.slice(0, 2).map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 text-[11px] min-h-[48px] pt-1 no-underline',
                'transition-transform duration-150 active:scale-[0.92]',
                active === tab.key
                  ? 'text-tq-ink font-extrabold'
                  : 'text-tq-ink2 font-medium'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          ))}

          {/* Central placeholder – label sits under the FAB */}
          <div className="flex justify-center pt-[46px] text-[11px] font-bold text-tq-ink select-none">
            Escanear
          </div>

          {tabs.slice(2).map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 text-[11px] min-h-[48px] pt-1 no-underline',
                'transition-transform duration-150 active:scale-[0.92]',
                active === tab.key
                  ? 'text-tq-ink font-extrabold'
                  : 'text-tq-ink2 font-medium'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>

        {/* FAB — Escanear */}
        <Link
          href="/escanear"
          aria-label="Escanear ticket"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[72px] h-[72px] rounded-[26px] bg-tq-mint text-tq-mint-ink flex items-center justify-center transition-transform duration-200 hover:-translate-y-[3px] active:scale-[0.94]"
          style={{ boxShadow: '0 12px 24px rgba(16,160,110,0.35), 0 0 0 6px var(--tq-fab-ring)' }}
        >
          <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
            <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
            <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
            <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
            <path d="M8 9h8" />
            <path d="M8 12h8" />
            <path d="M8 15h5" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
