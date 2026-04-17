'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectScenarioApi } from '../types/project.types';
import { computeDelta } from './scenario-delta-utils';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
}

function DeltaCell({
  baselineRaw,
  comparedRaw,
}: {
  baselineRaw: unknown;
  comparedRaw: unknown;
}) {
  const d = computeDelta(baselineRaw, comparedRaw);
  if (d.kind === 'unavailable') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct =
    d.pct === null ? null : `${d.pct > 0 ? '+' : ''}${formatNumber(d.pct)} %`;
  const tone =
    d.trend === 'flat'
      ? 'text-muted-foreground'
      : d.trend === 'up'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-destructive';
  return (
    <div className={`text-xs tabular-nums ${tone}`}>
      <span>{d.abs > 0 ? '+' : ''}{formatNumber(d.abs)}</span>
      {pct !== null ? <span className="ml-1 text-muted-foreground">({pct})</span> : null}
    </div>
  );
}

type RowDef = { label: string; key: string; read: (s: ProjectScenarioApi) => unknown };

const BUDGET: RowDef[] = [
  { label: 'Total planifié', key: 'plannedTotal', read: (s) => s.budgetSummary?.plannedTotal },
  { label: 'Total prévisionnel', key: 'forecastTotal', read: (s) => s.budgetSummary?.forecastTotal },
  { label: 'Total réalisé', key: 'actualTotal', read: (s) => s.budgetSummary?.actualTotal },
  { label: 'Couverture budget', key: 'budgetCoverageRate', read: (s) => s.budgetSummary?.budgetCoverageRate },
];

const RESOURCE: RowDef[] = [
  { label: 'Jours planifiés (total)', key: 'plannedDaysTotal', read: (s) => s.resourceSummary?.plannedDaysTotal },
  { label: 'Coût planifié (total)', key: 'plannedCostTotal', read: (s) => s.resourceSummary?.plannedCostTotal },
  { label: 'ETP pic', key: 'plannedFtePeak', read: (s) => s.resourceSummary?.plannedFtePeak },
  { label: 'Ressources distinctes', key: 'distinctResources', read: (s) => s.resourceSummary?.distinctResources },
];

const TIMELINE: RowDef[] = [
  { label: 'Durée chemin critique (j)', key: 'criticalPathDuration', read: (s) => s.timelineSummary?.criticalPathDuration },
  { label: 'Jalons', key: 'milestoneCount', read: (s) => s.timelineSummary?.milestoneCount },
];

const CAPACITY: RowDef[] = [
  { label: 'Surcharges', key: 'overCapacityCount', read: (s) => s.capacitySummary?.overCapacityCount },
  { label: 'Sous-capacité', key: 'underCapacityCount', read: (s) => s.capacitySummary?.underCapacityCount },
  { label: 'Charge pic', key: 'peakLoadPct', read: (s) => s.capacitySummary?.peakLoadPct },
  { label: 'Charge moyenne', key: 'averageLoadPct', read: (s) => s.capacitySummary?.averageLoadPct },
];

const RISK: RowDef[] = [
  { label: 'Risques critiques', key: 'criticalRiskCount', read: (s) => s.riskSummary?.criticalRiskCount },
  { label: 'Criticité moyenne', key: 'averageCriticality', read: (s) => s.riskSummary?.averageCriticality },
  { label: 'Criticité max', key: 'maxCriticality', read: (s) => s.riskSummary?.maxCriticality },
];

function SummaryBlock({
  title,
  rows,
  baseline,
  compared,
  unavailable,
}: {
  title: string;
  rows: RowDef[];
  baseline: ProjectScenarioApi;
  compared: ProjectScenarioApi;
  unavailable: boolean;
}) {
  if (unavailable) {
    return (
      <Card className="border-l-[3px] border-l-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Non disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-[3px] border-l-sky-500/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-1.5 last:border-0"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <DeltaCell baselineRaw={row.read(baseline)} comparedRaw={row.read(compared)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type ScenarioVarianceCardsProps = {
  baselineDetail: ProjectScenarioApi;
  comparedDetail: ProjectScenarioApi;
};

export function ScenarioVarianceCards({ baselineDetail, comparedDetail }: ScenarioVarianceCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SummaryBlock
        title="Budget"
        rows={BUDGET}
        baseline={baselineDetail}
        compared={comparedDetail}
        unavailable={baselineDetail.budgetSummary == null || comparedDetail.budgetSummary == null}
      />
      <SummaryBlock
        title="Ressources"
        rows={RESOURCE}
        baseline={baselineDetail}
        compared={comparedDetail}
        unavailable={baselineDetail.resourceSummary == null || comparedDetail.resourceSummary == null}
      />
      <SummaryBlock
        title="Délais"
        rows={TIMELINE}
        baseline={baselineDetail}
        compared={comparedDetail}
        unavailable={baselineDetail.timelineSummary == null || comparedDetail.timelineSummary == null}
      />
      <SummaryBlock
        title="Capacité"
        rows={CAPACITY}
        baseline={baselineDetail}
        compared={comparedDetail}
        unavailable={baselineDetail.capacitySummary == null || comparedDetail.capacitySummary == null}
      />
      <SummaryBlock
        title="Risques"
        rows={RISK}
        baseline={baselineDetail}
        compared={comparedDetail}
        unavailable={baselineDetail.riskSummary == null || comparedDetail.riskSummary == null}
      />
    </div>
  );
}
