'use client';

import type React from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { BudgetDensityToggle } from '@/features/budgets/components/budget-density-toggle';
import { BudgetDetailDashboard } from '@/features/budgets/components/budget-detail-dashboard';
import { BudgetExplorerTable } from '@/features/budgets/components/budget-explorer-table';
import { BudgetExplorerToolbar } from '@/features/budgets/components/budget-explorer-toolbar';
import type {
  BudgetExplorerFilters,
  ExplorerNode,
} from '@/features/budgets/types/budget-explorer.types';
import type { BudgetExplorerPilotageBindings } from '@/features/budgets/components/budget-explorer-table';
import type { BudgetPilotageDensity } from '@/features/budgets/types/budget-pilotage.types';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import type { BudgetCockpitResponse } from '@/features/budgets/types/budget-dashboard.types';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';
import {
  BUDGET_SUIVI_VIEWS,
  budgetDetailTabUsesExplorerGrid,
  type BudgetDetailTabId,
  type BudgetSuiviView,
} from '@/features/budgets/types/budget-detail-tabs.types';
import { BudgetDetailTabs } from './budget-detail-tabs';
import { BudgetComparisonsPanel } from './budget-comparisons-panel';
import { BudgetHistoriquePanel } from './budget-historique-panel';
import { BudgetReallocationsPanel } from './budget-reallocations-panel';

export interface BudgetDetailWorkspaceExplorer {
  /** Les libellés de mois de l'exercice sont chargés : la grille peut s'afficher. */
  isReady: boolean;
  filters: BudgetExplorerFilters;
  setFilters: React.Dispatch<React.SetStateAction<BudgetExplorerFilters>>;
  density: BudgetPilotageDensity;
  onDensityChange: (density: BudgetPilotageDensity) => void;
  nodes: ExplorerNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandAllEnvelopes: () => void;
  onCollapseAllEnvelopes: () => void;
  isFilteredEmpty: boolean;
  pilotage: BudgetExplorerPilotageBindings;
}

export interface BudgetDetailWorkspaceOverview {
  kpi: BudgetSummaryKpi | undefined;
  dashboard: BudgetCockpitResponse | null | undefined;
  defaultTaxRate: number | null;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
  exerciseStartDateIso?: string | null;
  exerciseEndDateIso?: string | null;
  plannedAmounts12?: readonly number[] | null;
  isLoading: boolean;
  isError: boolean;
}

export interface BudgetDetailWorkspaceProps {
  budgetId: string;
  tab: BudgetDetailTabId;
  onTabChange: (tab: BudgetDetailTabId) => void;
  suiviView: BudgetSuiviView;
  onSuiviViewChange: (view: BudgetSuiviView) => void;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  setTaxDisplayMode: (mode: TaxDisplayMode) => void;
  isTaxLoading?: boolean;
  onBudgetLineClick: (lineId: string) => void;
  explorer: BudgetDetailWorkspaceExplorer;
  overview: BudgetDetailWorkspaceOverview;
  lines: BudgetLine[];
  onCreateSnapshot: () => void;
  onCreateReallocation: () => void;
}

/**
 * Zone 3 du cockpit (RFC-FE-BUD-032 §4.1) : onglets métier + contenu associé.
 * Chaque onglet gère son propre cadre : jamais de `Card` parente autour d'un contenu
 * qui en contient déjà une (anti cadre-dans-cadre).
 */
export function BudgetDetailWorkspace({
  budgetId,
  tab,
  onTabChange,
  suiviView,
  onSuiviViewChange,
  currency,
  taxDisplayMode,
  setTaxDisplayMode,
  isTaxLoading,
  onBudgetLineClick,
  explorer,
  overview,
  lines,
  onCreateSnapshot,
  onCreateReallocation,
}: BudgetDetailWorkspaceProps) {
  const usesGrid = budgetDetailTabUsesExplorerGrid(tab);
  /** La grille 12 mois n'est pas exploitable sous `md` : densité condensée imposée. */
  const isMobile = useIsMobile();
  const monthlyDensityAvailable = !isMobile;
  const effectiveDensity: BudgetPilotageDensity = monthlyDensityAvailable
    ? explorer.density
    : 'condense';

  const gridContent = !explorer.isReady ? (
    <div className="p-6">
      <LoadingState rows={2} />
    </div>
  ) : (
    <BudgetExplorerTable
      nodes={explorer.nodes}
      expandedIds={explorer.expandedIds}
      onToggleExpand={explorer.onToggleExpand}
      onExpandAllEnvelopes={explorer.onExpandAllEnvelopes}
      onCollapseAllEnvelopes={explorer.onCollapseAllEnvelopes}
      onBudgetLineClick={onBudgetLineClick}
      emptyMessage="Aucune enveloppe."
      emptyFilteredMessage="Aucun résultat pour ces filtres."
      isFilteredEmpty={explorer.isFilteredEmpty}
      pilotage={{
        ...explorer.pilotage,
        density: tab === 'previsionnel' ? effectiveDensity : 'condense',
        canEditPlanning:
          explorer.pilotage.canEditPlanning && effectiveDensity === 'mensuel',
      }}
    />
  );

  /** Le segment de nature s'applique aussi au tableau de la vue d'ensemble. */
  const natureFilter = explorer.filters.expenseType;
  const overviewLines = natureFilter
    ? overview.lines.filter((line) => line.expenseType === natureFilter)
    : overview.lines;

  const overviewContent = overview.isError ? (
    <Alert variant="destructive">
      <AlertTitle>Synthèse indisponible</AlertTitle>
      <AlertDescription>
        Impossible de charger les indicateurs de pilotage de ce budget.
      </AlertDescription>
    </Alert>
  ) : overview.isLoading && !overview.kpi ? (
    <LoadingState rows={3} />
  ) : overview.kpi ? (
    <BudgetDetailDashboard
      kpi={overview.kpi}
      dashboard={overview.dashboard}
      currency={currency}
      taxDisplayMode={taxDisplayMode}
      defaultTaxRate={overview.defaultTaxRate}
      envelopes={overview.envelopes}
      lines={overviewLines}
      exerciseStartDateIso={overview.exerciseStartDateIso}
      exerciseEndDateIso={overview.exerciseEndDateIso}
      plannedAmounts12={overview.plannedAmounts12}
      budgetId={budgetId}
      onBudgetLineClick={onBudgetLineClick}
    />
  ) : (
    <p className="text-sm text-muted-foreground">
      Aucune donnée de synthèse pour ce budget.
    </p>
  );

  return (
    <section className="starium-module space-y-4">
      {tab !== 'overview' ? (
        <BudgetDetailTabs tab={tab} onTabChange={onTabChange} />
      ) : null}

      <div
        role="tabpanel"
        id={`budget-detail-panel-${tab}`}
        aria-labelledby={`budget-detail-tab-${tab}`}
        tabIndex={-1}
      >
        {tab === 'overview' ? overviewContent : null}

        {usesGrid ? (
          <Card className="starium-panel">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col gap-3">
                {tab === 'suivi' ? (
                  <div className="starium-tab-group self-start" role="group" aria-label="Sous-vue du suivi">
                    {BUDGET_SUIVI_VIEWS.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        aria-pressed={suiviView === view.id}
                        onClick={() => onSuiviViewChange(view.id)}
                        className={cn(
                          'starium-tab-btn min-h-11 sm:min-h-9',
                          suiviView === view.id && 'starium-tab-btn--active',
                        )}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {tab === 'previsionnel' ? (
                  <>
                    {monthlyDensityAvailable ? (
                      <BudgetDensityToggle
                        density={explorer.density}
                        onDensityChange={explorer.onDensityChange}
                      />
                    ) : null}
                    {effectiveDensity === 'condense' ? (
                      <Alert>
                        <AlertDescription>
                          {monthlyDensityAvailable
                            ? 'Mode condensé en lecture seule — passez en mensuel pour éditer (les 12 mois sont envoyés au serveur à chaque enregistrement).'
                            : 'Vue condensée en lecture seule sur petit écran — la saisie mois par mois est disponible sur écran large.'}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </>
                ) : null}

                <BudgetExplorerToolbar
                  filters={explorer.filters}
                  setFilters={explorer.setFilters}
                  taxDisplayMode={taxDisplayMode}
                  setTaxDisplayMode={setTaxDisplayMode}
                  isTaxLoading={isTaxLoading}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">{gridContent}</CardContent>
          </Card>
        ) : null}

        {tab === 'comparaisons' ? (
          <BudgetComparisonsPanel budgetId={budgetId} onCreateSnapshot={onCreateSnapshot} />
        ) : null}

        {tab === 'reallocations' ? (
          <Card className="starium-panel">
            <CardContent>
              <BudgetReallocationsPanel
                budgetId={budgetId}
                lines={lines}
                onCreateRequest={onCreateReallocation}
              />
            </CardContent>
          </Card>
        ) : null}

        {tab === 'historique' ? (
          <Card className="starium-panel">
            <CardContent>
              <BudgetHistoriquePanel budgetId={budgetId} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
