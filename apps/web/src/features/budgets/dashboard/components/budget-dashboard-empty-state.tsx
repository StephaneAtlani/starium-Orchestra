'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function BudgetDashboardEmptyState() {
  return (
    <Card className="border-border bg-card" data-testid="budget-dashboard-empty">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Aucun budget disponible pour ce client. Créez un exercice et un budget,
        ou sélectionnez un autre client actif.
      </CardContent>
    </Card>
  );
}
