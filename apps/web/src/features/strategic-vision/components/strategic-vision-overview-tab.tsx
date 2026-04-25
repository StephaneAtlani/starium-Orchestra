'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
} from '../types/strategic-vision.types';
import {
  buildCriticalObjectives,
  buildObjectiveStatusCounts,
  isObjectiveOverdue,
} from '../lib/strategic-vision-tabs-view';

export function StrategicVisionOverviewTab({
  vision,
  axes,
  objectives,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
}) {
  if (!vision) {
    return (
      <Alert>
        <AlertDescription>Aucune vision disponible pour ce client.</AlertDescription>
      </Alert>
    );
  }

  const statusCounts = buildObjectiveStatusCounts(objectives);
  const criticalObjectives = buildCriticalObjectives(objectives).slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Vision entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-base font-semibold">{vision.title}</p>
            <p className="text-sm text-muted-foreground">{vision.statement}</p>
            <p className="text-sm">
              Horizon: <span className="font-medium">{vision.horizonLabel}</span>
            </p>
            <p className="text-sm">
              Statut: <span className="font-medium">{vision.isActive ? 'Active' : 'Inactive'}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Axes stratégiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold">{axes.length}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {axes.slice(0, 6).map((axis) => (
                <li key={axis.id} className="truncate">
                  {axis.name}
                </li>
              ))}
              {axes.length > 6 ? <li>+{axes.length - 6} axes...</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Objectifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">{objectives.length}</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground lg:grid-cols-5">
              <span>ON_TRACK: {statusCounts.ON_TRACK}</span>
              <span>AT_RISK: {statusCounts.AT_RISK}</span>
              <span>OFF_TRACK: {statusCounts.OFF_TRACK}</span>
              <span>COMPLETED: {statusCounts.COMPLETED}</span>
              <span>ARCHIVED: {statusCounts.ARCHIVED}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objectifs critiques/en retard</CardTitle>
          </CardHeader>
          <CardContent>
            {criticalObjectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun objectif critique.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {criticalObjectives.map((objective) => (
                  <li key={objective.id}>
                    <p className="font-medium">{objective.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {objective.status}
                      {isObjectiveOverdue(objective) ? ' • En retard' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
