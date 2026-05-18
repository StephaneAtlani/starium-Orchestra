'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type CheckboxProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

/** Case à cocher minimal (style shadcn) sans dépendance Radix dédiée. */
export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        checked && 'border-primary bg-primary text-primary-foreground',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/80',
        className,
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </button>
  );
}
