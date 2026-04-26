'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
} from '../types/strategic-vision.types';
import {
  getObjectiveCountLabel,
  objectiveCountMetaClassName,
} from '../lib/strategic-axis-objective-count-badge';
import { splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import { cn } from '@/lib/utils';
import { STRATEGIC_AXIS_ICONS, strategicAxisIconColorClass } from './strategic-axis-icons';
import { StrategicVisionSummaryCard } from './strategic-vision-summary-card';

export function StrategicVisionOverviewTab({
  vision,
  axes,
  objectives,
  isLoading,
  isError,
  isEditMode,
  canUpdate,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  isLoading: boolean;
  isError: boolean;
  isEditMode: boolean;
  canUpdate: boolean;
}) {
  const canShowEditControls = isEditMode && canUpdate;

  const handleEditVision = () => undefined;
  const handleEditAxes = () => undefined;
  const handleEditAxis = () => undefined;

  const axisToneClassName = (axisName: string) => {
    const { color } = splitAxisLogoAndTitle(axisName);
    switch (color) {
      case 'green':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'amber':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'violet':
        return 'border-violet-500/30 bg-violet-500/5';
      case 'red':
        return 'border-red-500/30 bg-red-500/5';
      case 'primary':
        return 'border-primary/35 bg-primary/5';
      case 'blue':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'auto':
      default:
        return 'border-border/60 bg-muted/40';
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-56 w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Impossible de charger la vue d&apos;ensemble strategic vision.</AlertDescription>
      </Alert>
    );
  }

  if (!vision) {
    return (
      <Alert>
        <AlertDescription>Aucune vision disponible pour ce client.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Notre vision</CardTitle>
          {canShowEditControls ? (
            <Button type="button" size="sm" variant="outline" onClick={handleEditVision}>
              <Pencil className="mr-1 size-4" />
              Modifier la vision
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <StrategicVisionSummaryCard vision={vision} showEditIndicator={canShowEditControls} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>Nos axes strategiques</CardTitle>
            <p className="text-sm text-muted-foreground">
              {axes.length} axe(s) - {objectives.length} objectif(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleEditAxes}>
              Voir tous les axes
            </Button>
            {canShowEditControls ? (
              <Button type="button" size="sm" variant="outline" onClick={handleEditAxes}>
                <Pencil className="mr-1 size-4" />
                Modifier les axes
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {axes.length === 0 ? (
            <Alert>
              <AlertDescription>Aucun axe strategique disponible pour ce client.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {axes.map((axis, index) => {
                const { logo, title, color } = splitAxisLogoAndTitle(axis.name);
                const AxisIcon = logo
                  ? STRATEGIC_AXIS_ICONS[logo as keyof typeof STRATEGIC_AXIS_ICONS]
                  : null;
                return (
                  <Card
                    key={axis.id}
                    className={cn(
                      'relative border bg-card/70 backdrop-blur-sm transition-colors',
                      axisToneClassName(axis.name),
                    )}
                  >
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-background/40">
                            {AxisIcon ? (
                              <AxisIcon
                                className={cn('size-4', strategicAxisIconColorClass(color))}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{index + 1}</span>
                            )}
                          </span>
                          <p className="line-clamp-2 text-base font-semibold leading-5">{`${index + 1}. ${title}`}</p>
                        </div>
                        {canShowEditControls ? (
                          <Button
                            size="icon"
                            type="button"
                            variant="ghost"
                            className="size-8 shrink-0"
                            aria-label="Modifier l'axe"
                            onClick={handleEditAxis}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="line-clamp-4 min-h-[5rem] text-sm text-muted-foreground">
                        {axis.description ?? 'Aucune description definie pour cet axe.'}
                      </p>
                      <p className={objectiveCountMetaClassName}>
                        {getObjectiveCountLabel(axis.objectives.length)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
