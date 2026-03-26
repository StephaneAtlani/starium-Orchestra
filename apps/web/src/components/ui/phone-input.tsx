'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Champ téléphone aligné sur le design system (Input shadcn/base-ui).
 * Pas de dépendance externe : évite les échecs de résolution de module en CI / installs partiels.
 */
export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Erreur de validation : bordure destructive + aria-invalid */
  invalid?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  invalid,
  className,
  placeholder = 'Numéro',
  ...props
}: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={cn(
        invalid && 'border-destructive ring-3 ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}
