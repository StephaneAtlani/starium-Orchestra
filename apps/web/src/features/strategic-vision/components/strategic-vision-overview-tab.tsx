'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
} from '../types/strategic-vision.types';
import { buildAxisNameMap, splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import { getObjectiveStatusLabel } from '../lib/strategic-vision-labels';
import {
  axisProgress,
  initials,
  objectiveProgress,
  objectiveTone,
  progressTone,
  toneColorVar,
  toneStatusLabel,
  type StrategicTone,
} from '../lib/strategic-overview-progress';
import { STRATEGIC_AXIS_ICONS } from './strategic-axis-icons';
import { cn } from '@/lib/utils';

const OVERVIEW_OBJECTIVES_LIMIT = 6;

function formatDeadline(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const badgeToneClass: Record<StrategicTone, string> = {
  success: 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
  warning: 'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning)]',
  danger: 'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]',
};

function ProgressBar({ pct, tone }: { pct: number; tone: StrategicTone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--neutral-200)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: toneColorVar(tone) }}
      />
    </div>
  );
}

export function StrategicVisionOverviewTab({
  vision,
  axes,
  objectives,
  isLoading,
  isError,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  isLoading: boolean;
  isError: boolean;
  isEditMode: boolean;
  canUpdate: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-44 w-full rounded-[14px]" />
        <Skeleton className="h-56 w-full rounded-[14px]" />
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Impossible de charger la vue d&apos;ensemble de la vision stratégique.
        </AlertDescription>
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

  const axisNameMap = buildAxisNameMap(axes);
  const visibleObjectives = objectives.slice(0, OVERVIEW_OBJECTIVES_LIMIT);

  return (
    <section className="space-y-6">
      {/* Notre vision */}
      <Card className="px-2 py-1">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold-700)]">
              <Eye className="size-5" />
            </span>
            <span className="font-semibold text-foreground">Notre vision</span>
          </div>
          <blockquote className="relative px-7 text-[19px] font-semibold leading-relaxed tracking-tight text-foreground">
            <span
              aria-hidden
              className="absolute -left-1 -top-2 font-serif text-5xl leading-none text-[color:var(--brand-gold)]"
            >
              &ldquo;
            </span>
            {vision.statement}
            <span
              aria-hidden
              className="ml-1 align-bottom font-serif text-5xl leading-none text-[color:var(--brand-gold)]"
            >
              &rdquo;
            </span>
          </blockquote>
        </CardContent>
      </Card>

      {/* Axes stratégiques */}
      <Card>
        <CardHeader>
          <CardTitle>Axes stratégiques</CardTitle>
        </CardHeader>
        <CardContent>
          {axes.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun axe stratégique disponible pour ce client.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {axes.map((axis, index) => {
                const { logo, title } = splitAxisLogoAndTitle(axis.name);
                const AxisIcon = logo
                  ? STRATEGIC_AXIS_ICONS[logo as keyof typeof STRATEGIC_AXIS_ICONS]
                  : null;
                const pct = axisProgress(axis.objectives);
                const tone = progressTone(pct);
                return (
                  <div
                    key={axis.id}
                    className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-2)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold-700)]">
                        {AxisIcon ? (
                          <AxisIcon className="size-[18px]" />
                        ) : (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                        {index + 1}. {title}
                      </span>
                      <span className="text-[22px] font-bold leading-none tracking-tight tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar pct={pct} tone={tone} />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: toneColorVar(tone) }}
                      />
                      <span>{toneStatusLabel(tone)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objectifs stratégiques */}
      <Card>
        <CardHeader>
          <CardTitle>Objectifs stratégiques</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleObjectives.length === 0 ? (
            <Alert>
              <AlertDescription>Aucun objectif pour ce périmètre.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Objectif</TableHead>
                    <TableHead>Axe</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead className="w-[18%]">Avancement</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleObjectives.map((objective) => {
                    const owner =
                      objective.ownerLabel ??
                      objective.ownerOrgUnitSummary?.name ??
                      'Non défini';
                    const pct = objectiveProgress(objective.status);
                    const tone = objectiveTone(objective.status);
                    return (
                      <TableRow key={objective.id}>
                        <TableCell className="font-medium text-foreground">
                          {objective.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {axisNameMap.get(objective.axisId) ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--neutral-200)] text-[10px] font-bold text-[color:var(--neutral-700)]">
                              {initials(owner)}
                            </span>
                            <span className="text-muted-foreground">{owner}</span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDeadline(objective.deadline)}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <ProgressBar pct={pct} tone={tone} />
                            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                              {pct}%
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'rounded-full border-0 font-semibold',
                              badgeToneClass[tone],
                            )}
                          >
                            {getObjectiveStatusLabel(objective.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
