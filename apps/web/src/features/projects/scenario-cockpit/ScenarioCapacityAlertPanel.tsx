'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { projectScenarios } from '../constants/project-routes';
import type { ProjectScenarioApi } from '../types/project.types';

type ScenarioCapacityAlertPanelProps = {
  projectId: string;
  compared: ProjectScenarioApi;
};

export function ScenarioCapacityAlertPanel({ projectId, compared }: ScenarioCapacityAlertPanelProps) {
  const cap = compared.capacitySummary;
  if (cap == null) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Capacité</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Non disponible</p>
        </CardContent>
      </Card>
    );
  }

  const over = typeof cap.overCapacityCount === 'number' ? cap.overCapacityCount : 0;
  const showAlert = over > 0;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Capacité (scénario comparé)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          La capacité est calculée sur le scénario comparé. Pour ajuster les plans ressource ou la charge,
          repassez par la liste des scénarios et les écrans de planification associés.
        </p>
        {showAlert ? (
          <Alert className="border-amber-500/35 bg-amber-500/5">
            <AlertTriangle className="size-4 text-amber-950 dark:text-amber-400" aria-hidden />
            <AlertTitle className="text-amber-950 dark:text-amber-100">Surcharge détectée</AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
              {over} ressource(s) en situation de surcharge sur ce scénario.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune alerte de surcharge sur les agrégats disponibles.</p>
        )}
        <Link
          href={projectScenarios(projectId)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit')}
        >
          Retour aux scénarios
        </Link>
      </CardContent>
    </Card>
  );
}
