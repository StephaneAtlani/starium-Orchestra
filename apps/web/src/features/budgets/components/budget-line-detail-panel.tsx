'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetLineFormPage } from './pages/budget-line-form-page';

interface BudgetLineDetailPanelProps {
  budgetId: string;
  lineId: string;
  onClose?: () => void;
}

export function BudgetLineDetailPanel({ budgetId, lineId, onClose }: BudgetLineDetailPanelProps) {
  // Debug rendu panneau
  // eslint-disable-next-line no-console
  console.debug('[BudgetLineDetailPanel] render', { budgetId, lineId });
  return (
    <Card className="rounded-none border-x-0 border-b-0">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium">Détail de la ligne budgétaire</CardTitle>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Fermer
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-[360px] overflow-y-auto">
          <BudgetLineFormPage
            mode="edit"
            budgetId={budgetId}
            lineId={lineId}
            variant="embedded"
            onCloseEmbedded={onClose}
          />
        </div>
      </CardContent>
    </Card>
  );
}

