'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { CockpitSurfaceCard } from './budget-cockpit-primitives';

export function BudgetDashboardEmptyState() {
  return (
    <CockpitSurfaceCard
      title="Aucun budget à afficher"
      description="Sélectionnez un client avec des exercices et budgets, ou créez-les depuis la liste des budgets."
      icon={Inbox}
      accent="default"
      className="border-dashed"
      data-testid="budget-dashboard-empty"
    >
      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        Aucun budget disponible pour ce client. Créez un exercice et un budget,
        ou sélectionnez un autre client actif.
      </p>
    </CockpitSurfaceCard>
  );
}
