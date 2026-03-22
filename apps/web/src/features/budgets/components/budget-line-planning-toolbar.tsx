'use client';

import React from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanningCalculatorTool = 'GROWTH' | 'QUANTITY_X_UNIT_PRICE';

interface BudgetLinePlanningToolbarProps {
  canEdit: boolean;
  selectedTool: PlanningCalculatorTool;
  onSelectTool: (tool: PlanningCalculatorTool) => void;
  className?: string;
}

export function BudgetLinePlanningToolbar({
  canEdit,
  selectedTool,
  onSelectTool,
  className,
}: BudgetLinePlanningToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 mr-1 text-xs font-medium text-muted-foreground">
          <Calculator className="size-3.5" />
          <span>Calculatrice de planning</span>
        </span>
        <button
          type="button"
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium',
            selectedTool === 'GROWTH'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted',
          )}
          onClick={() => onSelectTool('GROWTH')}
        >
          Croissance
        </button>
        <button
          type="button"
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium',
            selectedTool === 'QUANTITY_X_UNIT_PRICE'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted',
          )}
          onClick={() => onSelectTool('QUANTITY_X_UNIT_PRICE')}
        >
          Qté × prix unitaire
        </button>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Les calculs sont appliqués sur les 12 mois de la ligne selon la configuration choisie.
      </div>
    </div>
  );
}

