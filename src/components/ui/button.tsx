import { cn } from '@/lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses = {
  primary:   'bg-tq-mint text-tq-mint-ink hover:opacity-90',
  secondary: 'bg-tq-chip text-tq-ink hover:bg-tq-line',
  ghost:     'bg-transparent text-tq-ink2 hover:text-tq-ink hover:bg-tq-chip',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm font-semibold rounded-[14px] min-h-[36px]',
  md: 'px-5 py-3 text-sm font-bold rounded-[17px] min-h-[44px]',
  lg: 'px-6 py-3.5 text-base font-bold rounded-[18px] min-h-[52px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 cursor-pointer',
        'transition-transform duration-150 active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
