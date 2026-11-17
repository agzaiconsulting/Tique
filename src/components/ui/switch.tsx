'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, id, className }: SwitchProps) {
  const reactId = useId();
  const labelId = `${id ?? reactId}-label`;
  const switchId = id ?? reactId;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span id={labelId} className="flex-1 text-sm font-medium text-tq-ink">
        {label}
      </span>
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative w-12 h-7 rounded-full cursor-pointer',
          'transition-colors duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tq-mint',
          checked ? 'bg-tq-mint' : 'bg-tq-track'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white',
            'shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
