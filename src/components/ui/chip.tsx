import { cn } from '@/lib/cn';

type ChipVariant =
  | 'neutral'
  | 'mint'
  | 'coral'
  | 'frescos'
  | 'despensa'
  | 'bebidas'
  | 'limpieza'
  | 'higiene'
  | 'otros';

interface ChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
}

const variantClasses: Record<ChipVariant, string> = {
  neutral:  'bg-tq-chip text-tq-ink2',
  mint:     'bg-tq-mint-soft text-tq-mint-text',
  coral:    'bg-tq-coral-soft text-tq-coral-text',
  frescos:  'bg-[#DDF5EA] text-[#0B7A57]',
  despensa: 'bg-[#E8F0FF] text-[#1D4ED8]',
  bebidas:  'bg-[#FFF1D6] text-[#8A5A00]',
  limpieza: 'bg-[#EEE8FF] text-[#5B3FC4]',
  higiene:  'bg-[#FDE7F3] text-[#9D2A6B]',
  otros:    'bg-[#EEF3F0] text-[#3E4C46]',
};

export function Chip({ children, variant = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-[10px] py-[6px] text-xs font-semibold',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
