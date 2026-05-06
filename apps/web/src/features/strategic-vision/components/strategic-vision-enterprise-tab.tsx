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
  const [visionToEdit, setVisionToEdit] = useState<StrategicVisionDto | null>(null);
  const [creatingVision, setCreatingVision] = useState(false);
  const updateVision = useUpdateStrategicVisionMutation();
  const updateObjective = useUpdateStrategicObjectiveMutation();

  const allVisions = [...visions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activeVision = allVisions.find((item) => item.isActive) ?? null;
  const draftVisions = allVisions.filter(
    (item) => !item.isActive && !item.title.startsWith('ARCHIVE · '),
  );
  const archivedVisions = allVisions.filter((item) => item.title.startsWith('ARCHIVE · '));

  const headerActions = (
    <div className="flex justify-end gap-2">
      <Button disabled={!canCreate} onClick={() => setCreatingVision(true)}>
        Nouvelle vision (brouillon)
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} />}>
            <Button
              disabled={!canUpdate || !activeVision}
              onClick={() => {
                setVisionToEdit(activeVision);
                setEditingVision(true);
              }}
            >
              Modifier la vision active
            </Button>
          </TooltipTrigger>
          {!canUpdate ? (
            <TooltipContent>Permission strategic_vision.update requise</TooltipContent>
          ) : !activeVision ? (
            <TooltipContent>Aucune vision active à modifier</TooltipContent>
          ) : (
            <TooltipContent>Modifier la vision actuellement en production</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  if (!allVisions.length) {
    return (
      <section className="space-y-4">
        {headerActions}
        <Alert>
          <AlertDescription>Aucune vision disponible pour ce client.</AlertDescription>
        </Alert>
        <StrategicVisionCreateDialog
          open={creatingVision}
          onOpenChange={setCreatingVision}
        />
      </section>
    );
  }

  const statusCounts = buildObjectiveStatusCounts(objectives);

  const handleActivateVision = async (nextVision: StrategicVisionDto) => {
    if (!canUpdate) return;
    if (nextVision.isActive) return;
    try {
      await updateVision.mutateAsync({
        visionId: nextVision.id,
        body: { isActive: true },
      });
      toast.success(`Vision active mise à jour: ${nextVision.title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Activation impossible.');
    }
  };

  const handleArchiveVision = async (targetVision: StrategicVisionDto) => {
    if (!canUpdate) return;
    const ok = window.confirm(
      `Archiver définitivement la vision "${targetVision.title}" et ses objectifs ?`,
    );
    if (!ok) return;

    try {
      const archivedTitle = targetVision.title.startsWith('ARCHIVE · ')
        ? targetVision.title
        : `ARCHIVE · ${targetVision.title}`;

      await updateVision.mutateAsync({
        visionId: targetVision.id,
        body: {
          title: archivedTitle,
        },
      });

      const objectivesToArchive = targetVision.axes.flatMap((axis) => axis.objectives);
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

      toast.success('Vision archivée avec ses objectifs.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archivage impossible.');
    }
  };

  return (
    <section className="space-y-4">
      {headerActions}

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Vision active</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeVision ? (
            <>
              <p className="font-medium">{activeVision.title}</p>
              <p className="text-sm text-muted-foreground">{activeVision.statement}</p>
              <p className="text-sm">
                Horizon: <span className="font-medium">{activeVision.horizonLabel}</span>
              </p>
              <p className="text-sm">
                Dernière mise à jour:{' '}
                <span className="font-medium">{formatDateTime(activeVision.updatedAt)}</span>
              </p>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Aucune vision active: active un brouillon pour remettre la gouvernance en production.
              </AlertDescription>
            </Alert>
          )}
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
          <CardTitle>Workflow des visions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Brouillons prêts à activer
            </p>
            {draftVisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun brouillon disponible.</p>
            ) : (
              draftVisions.map((draftVision) => (
                <div
                  key={draftVision.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{draftVision.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {draftVision.horizonLabel} · {draftVision.axes.length} axe(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={!canUpdate || updateVision.isPending}
                      onClick={() => void handleActivateVision(draftVision)}
                    >
                      Activer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canUpdate}
                      onClick={() => {
                        setVisionToEdit(draftVision);
                        setEditingVision(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canUpdate || updateVision.isPending || updateObjective.isPending}
                      onClick={() => void handleArchiveVision(draftVision)}
                    >
                      Archiver
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Historique archivé
            </p>
            {archivedVisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vision archivée.</p>
            ) : (
              archivedVisions.map((archivedVision) => (
                <div
                  key={archivedVision.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-muted-foreground">{archivedVision.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {archivedVision.horizonLabel} · {formatDateTime(archivedVision.updatedAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <StrategicVisionEditDialog
        vision={visionToEdit}
        open={editingVision}
        onOpenChange={(next) => {
          setEditingVision(next);
          if (!next) {
            setVisionToEdit(null);
          }
        }}
      />
      <StrategicVisionCreateDialog
        open={creatingVision}
        onOpenChange={setCreatingVision}
      />
    </section>
  );
}
