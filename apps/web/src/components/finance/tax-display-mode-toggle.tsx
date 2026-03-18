'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';

function ToggleButton({
  mode,
  active,
  onClick,
}: {
  mode: TaxDisplayMode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="h-7"
      aria-pressed={active}
      data-testid={`tax-toggle-${mode}`}
    >
      {mode}
    </Button>
  );
}

export function TaxDisplayModeToggle(props?: {
  taxDisplayMode?: TaxDisplayMode;
  setTaxDisplayMode?: (next: TaxDisplayMode) => void;
  isLoading?: boolean;
}) {
  const hook = useTaxDisplayMode();
  const taxDisplayMode = props?.taxDisplayMode ?? hook.taxDisplayMode;
  const setTaxDisplayMode = props?.setTaxDisplayMode ?? hook.setTaxDisplayMode;
  const isLoading = props?.isLoading ?? hook.isLoading;

  return (
    <div className="flex items-center gap-2" data-testid="tax-display-mode-toggle">
      <span className="text-xs text-muted-foreground">Affichage</span>
      <div className="flex items-center rounded-md border bg-background p-0.5">
        <ToggleButton
          mode="HT"
          active={taxDisplayMode === 'HT'}
          onClick={() => setTaxDisplayMode('HT')}
        />
        <ToggleButton
          mode="TTC"
          active={taxDisplayMode === 'TTC'}
          onClick={() => setTaxDisplayMode('TTC')}
        />
      </div>
      {isLoading && <span className="text-xs text-muted-foreground">…</span>}
    </div>
  );
}

