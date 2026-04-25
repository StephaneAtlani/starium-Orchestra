'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
} from '../types/strategic-vision.types';
import { buildObjectiveStatusCounts } from '../lib/strategic-vision-tabs-view';

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Non defini';
  return parsed.toLocaleString('fr-FR');
}

export function StrategicVisionEnterpriseTab({
  vision,
  axes,
  objectives,
  canUpdate,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  canUpdate: boolean;
}) {
  if (!vision) {
    return (
      <Alert>
        <AlertDescription>Aucune vision disponible pour ce client.</AlertDescription>
      </Alert>
    );
  }

  const statusCounts = buildObjectiveStatusCounts(objectives);

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} />}>
              <Button disabled={!canUpdate}>
                Modifier la vision
              </Button>
            </TooltipTrigger>
            {!canUpdate ? (
              <TooltipContent>Permission strategic_vision.update requise</TooltipContent>
            ) : (
              <TooltipContent>Edition a venir</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{vision.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{vision.statement}</p>
          <p className="text-sm">
            Horizon: <span className="font-medium">{vision.horizonLabel}</span>
          </p>
          <p className="text-sm">
            Statut: <span className="font-medium">{vision.isActive ? 'Active' : 'Inactive'}</span>
          </p>
          <p className="text-sm">
            Cree le: <span className="font-medium">{formatDateTime(vision.createdAt)}</span>
          </p>
          <p className="text-sm">
            Derniere mise a jour:{' '}
            <span className="font-medium">{formatDateTime(vision.updatedAt)}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Axes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{axes.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{objectives.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>A risque / hors trajectoire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {statusCounts.AT_RISK + statusCounts.OFF_TRACK}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
