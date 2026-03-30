'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

/**
 * Switch UI minimal (style shadcn/Radix-like) sans dépendance Radix dédiée.
 * Rendu : un bouton avec `role="switch"` et un curseur (knob) animé.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1',
        )}
      />
    </button>
  );
}

