import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  radius?: 'main' | 'default';
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, className, radius = 'default', as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-tq-card shadow-tq-card',
        radius === 'main' ? 'rounded-[28px]' : 'rounded-[24px]',
        className
      )}
    >
      {children}
    </Tag>
  );
}
