'use client';

import { useState } from 'react';
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
import { StrategicVisionEditDialog } from './strategic-vision-edit-dialog';
import { StrategicVisionCreateDialog } from './strategic-vision-create-dialog';
import {
  useUpdateStrategicObjectiveMutation,
  useUpdateStrategicVisionMutation,
} from '../hooks/use-strategic-vision-queries';
import { toast } from '@/lib/toast';

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Non defini';
  return parsed.toLocaleString('fr-FR');
}

export function StrategicVisionEnterpriseTab({
  vision,
  visions,
  axes,
  objectives,
  canUpdate,
  canCreate,
}: {
  vision: StrategicVisionDto | null;
  visions: StrategicVisionDto[];
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  canUpdate: boolean;
  canCreate: boolean;
}) {
  const [editingVision, setEditingVision] = useState(false);
  const [creatingVision, setCreatingVision] = useState(false);
  const updateVision = useUpdateStrategicVisionMutation();
  const updateObjective = useUpdateStrategicObjectiveMutation();

  if (!vision) {
    return (
      <Alert>
        <AlertDescription>Aucune vision disponible pour ce client.</AlertDescription>
      </Alert>
    );
  }

  const statusCounts = buildObjectiveStatusCounts(objectives);
  const pastVisions = visions.filter((item) => !item.isActive);

  const handleArchivePastVision = async (pastVision: StrategicVisionDto) => {
    if (!canUpdate) return;
    const ok = window.confirm(
      `Archiver définitivement la vision "${pastVision.title}" et ses objectifs ?`,
    );
    if (!ok) return;

    try {
      const archivedTitle = pastVision.title.startsWith('ARCHIVE · ')
        ? pastVision.title
        : `ARCHIVE · ${pastVision.title}`;

      await updateVision.mutateAsync({
        visionId: pastVision.id,
        body: {
          title: archivedTitle,
        },
      });

      const objectivesToArchive = pastVision.axes.flatMap((axis) => axis.objectives);
      await Promise.all(
        objectivesToArchive
          .filter((objective) => objective.status !== 'ARCHIVED')
          .map((objective) =>
            updateObjective.mutateAsync({
              objectiveId: objective.id,
              body: { status: 'ARCHIVED' },
            }),
          ),
      );

      toast.success('Vision passée archivée avec ses objectifs.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archivage impossible.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button disabled={!canCreate} onClick={() => setCreatingVision(true)}>
          Nouvelle vision
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} />}>
              <Button disabled={!canUpdate} onClick={() => setEditingVision(true)}>
                Modifier la vision
              </Button>
            </TooltipTrigger>
            {!canUpdate ? (
              <TooltipContent>Permission strategic_vision.update requise</TooltipContent>
            ) : (
              <TooltipContent>Modifier la vision active</TooltipContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Visions passées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pastVisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune vision passée à archiver.</p>
          ) : (
            <div className="space-y-2">
              {pastVisions.map((pastVision) => (
                <div
                  key={pastVision.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pastVision.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pastVision.horizonLabel} · {pastVision.axes.length} axe(s)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canUpdate || updateVision.isPending || updateObjective.isPending}
                    onClick={() => void handleArchivePastVision(pastVision)}
                  >
                    Archiver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <StrategicVisionEditDialog
        vision={vision}
        open={editingVision}
        onOpenChange={setEditingVision}
      />
      <StrategicVisionCreateDialog
        open={creatingVision}
        onOpenChange={setCreatingVision}
      />
    </section>
  );
}
