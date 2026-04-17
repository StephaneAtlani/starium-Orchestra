'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { projectRisks } from '../constants/project-routes';
import type { ProjectScenarioApi } from '../types/project.types';

type ScenarioRiskPanelProps = {
  projectId: string;
  compared: ProjectScenarioApi;
};

export function ScenarioRiskPanel({ projectId, compared }: ScenarioRiskPanelProps) {
  const r = compared.riskSummary;
  if (r == null) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risques</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Non disponible</p>
        </CardContent>
      </Card>
    );
  }

  const critical =
    typeof r.criticalRiskCount === 'number' ? r.criticalRiskCount : 0;
  const showAlert = critical > 0;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risques (scénario comparé)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Risques critiques</dt>
            <dd className="font-medium tabular-nums">{critical}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Criticité max</dt>
            <dd className="font-medium tabular-nums">
              {r.maxCriticality != null ? String(r.maxCriticality) : '—'}
            </dd>
          </div>
        </dl>
        {showAlert ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertCircle aria-hidden />
            <AlertTitle>Attention criticité</AlertTitle>
            <AlertDescription>
              Le scénario comparé porte {critical} risque(s) critique(s) au sens agrégé.
            </AlertDescription>
          </Alert>
        ) : null}
        <Link
          href={projectRisks(projectId)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit')}
        >
          Ouvrir le registre des risques
        </Link>
      </CardContent>
    </Card>
  );
}
