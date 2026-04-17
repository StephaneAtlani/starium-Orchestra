'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectScenarioSummary } from '../types/project.types';

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

type ScenarioSummaryPanelProps = {
  title: string;
  summary: ProjectScenarioSummary;
};

/** Affichage homogène d’un bloc summary renvoyé par `getProjectScenario` (pas de logique métier). */
export function ScenarioSummaryPanel({ title, summary }: ScenarioSummaryPanelProps) {
  if (summary == null) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Non disponible</p>
        </CardContent>
      </Card>
    );
  }

  if (typeof summary !== 'object' || Array.isArray(summary)) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-medium">{formatSummaryValue(summary)}</p>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(summary as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <Card className="border-border/70 shadow-sm">
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
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="font-medium text-muted-foreground">{key}</dt>
              <dd className="mt-0.5 break-words font-medium text-foreground">{formatSummaryValue(value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
