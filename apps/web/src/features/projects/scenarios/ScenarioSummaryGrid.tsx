'use client';

import { cn } from '@/lib/utils';
import type { ProjectScenarioApi, ProjectScenarioSummary } from '../types/project.types';

const SUMMARY_FIELDS: Array<{
  key: keyof Pick<
    ProjectScenarioApi,
    'budgetSummary' | 'resourceSummary' | 'timelineSummary' | 'capacitySummary' | 'riskSummary'
  >;
  label: string;
}> = [
  { key: 'budgetSummary', label: 'Budget' },
  { key: 'resourceSummary', label: 'Ressources' },
  { key: 'timelineSummary', label: 'Délai' },
  { key: 'capacitySummary', label: 'Capacité' },
  { key: 'riskSummary', label: 'Risques' },
];

export function summaryToDisplayValue(summary: ProjectScenarioSummary): string {
  if (summary == null) return 'Non calculé';
  if (typeof summary !== 'object') return String(summary);
  const entries = Object.entries(summary);
  if (entries.length === 0) return 'Non disponible';
  const [firstKey, firstValue] = entries[0];
  if (typeof firstValue === 'number' || typeof firstValue === 'string') {
    return `${firstKey}: ${firstValue}`;
  }
  return `${entries.length} indicateur(s)`;
}

export function ScenarioSummaryGrid({ scenario }: { scenario: ProjectScenarioApi }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Résumé scénario">
      {SUMMARY_FIELDS.map((field) => (
        <article
          key={field.key}
          className={cn(
            'rounded-md border border-border/70 bg-muted/20 px-2.5 py-2',
            'min-h-[3.25rem]',
          )}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {field.label}
          </p>
          <p className="mt-1 text-xs font-medium text-foreground">
            {summaryToDisplayValue(scenario[field.key])}
          </p>
        </article>
      ))}
    </div>
  );
}
