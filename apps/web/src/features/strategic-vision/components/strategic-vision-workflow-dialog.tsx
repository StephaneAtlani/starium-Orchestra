'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FormDialogShell,
} from '@/components/layout/form-dialog-shell';
import type { StrategicVisionDto } from '../types/strategic-vision.types';
import {
  formatVisionWorkflowDateTime,
  partitionStrategicVisions,
} from '../lib/strategic-vision-workflow';
import { StrategicVisionEditDialog } from './strategic-vision-edit-dialog';
import { StrategicVisionCreateDialog } from './strategic-vision-create-dialog';
import {
  useUpdateStrategicObjectiveMutation,
  useUpdateStrategicVisionMutation,
} from '../hooks/use-strategic-vision-queries';
import { toast } from '@/lib/toast';

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="starium-form-field">
      <span className="starium-form-label">{label}</span>
      <div className="starium-form-input flex min-h-[38px] h-auto items-center py-2 text-sm">
        {value}
      </div>
    </div>
  );
}

export function StrategicVisionWorkflowDialog({
  open,
  onOpenChange,
  visions,
  canUpdate,
  canCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visions: StrategicVisionDto[];
  canUpdate: boolean;
  canCreate: boolean;
}) {
  const [editingVision, setEditingVision] = useState(false);
  const [visionToEdit, setVisionToEdit] = useState<StrategicVisionDto | null>(null);
  const [creatingVision, setCreatingVision] = useState(false);
  const updateVision = useUpdateStrategicVisionMutation();
  const updateObjective = useUpdateStrategicObjectiveMutation();

  const { allVisions, activeVision, draftVisions, archivedVisions } =
    partitionStrategicVisions(visions);

  const handleActivateVision = async (nextVision: StrategicVisionDto) => {
    if (!canUpdate || nextVision.isActive) return;
    try {
      await updateVision.mutateAsync({
        visionId: nextVision.id,
        body: { isActive: true },
      });
      toast.success(`Vision active mise à jour : ${nextVision.title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Activation impossible.');
    }
  };

  const handleArchiveVision = async (targetVision: StrategicVisionDto) => {
    if (!canUpdate) return;
    const ok = window.confirm(
      `Archiver définitivement la vision « ${targetVision.title} » et ses objectifs ?`,
    );
    if (!ok) return;

    try {
      const archivedTitle = targetVision.title.startsWith('ARCHIVE · ')
        ? targetVision.title
        : `ARCHIVE · ${targetVision.title}`;

      await updateVision.mutateAsync({
        visionId: targetVision.id,
        body: { title: archivedTitle },
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
    <>
      <FormDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="Versions de vision"
        description={
          activeVision
            ? `Vision active : ${activeVision.title}`
            : 'Gestion du cycle de vie des visions stratégiques'
        }
        icon={Building2}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={!canUpdate || !activeVision}
                    onClick={() => {
                      setVisionToEdit(activeVision);
                      setEditingVision(true);
                    }}
                  >
                    Modifier
                  </Button>
                </TooltipTrigger>
                {!canUpdate ? (
                  <TooltipContent>Permission strategic_vision.update requise</TooltipContent>
                ) : !activeVision ? (
                  <TooltipContent>Aucune vision active à modifier</TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={!canCreate}
              onClick={() => setCreatingVision(true)}
            >
              Nouvelle vision
            </Button>
          </>
        }
      >
        {allVisions.length === 0 ? (
          <EmptyState
            title="Aucune vision"
            description="Aucune vision disponible pour ce client."
          />
        ) : (
          <>
            {activeVision ? (
              <>
                <h3 id="sv-active-fields" className="starium-modal-seg-title">
                  Vision en production
                </h3>
                <div className="starium-form-grid starium-form-grid--2">
                  <ReadField label="Intitulé" value={activeVision.title} />
                  <ReadField label="Horizon" value={activeVision.horizonLabel || '—'} />
                  <div className="starium-form-grid--span-2">
                    <ReadField
                      label="Dernière mise à jour"
                      value={formatVisionWorkflowDateTime(activeVision.updatedAt)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Aucune vision active : activez un brouillon pour remettre la gouvernance en
                  production.
                </AlertDescription>
              </Alert>
            )}

            <h3 id="sv-drafts-fields" className="starium-modal-seg-title">
              Brouillons
            </h3>
            {draftVisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun brouillon disponible.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-[var(--radius-md,10px)] border border-border/60">
                {draftVisions.map((draftVision) => (
                  <li
                    key={draftVision.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {draftVision.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {draftVision.horizonLabel} · {draftVision.axes.length} axe
                        {draftVision.axes.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="min-h-11 sm:min-h-8"
                        disabled={!canUpdate || updateVision.isPending}
                        onClick={() => void handleActivateVision(draftVision)}
                      >
                        Activer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 sm:min-h-8"
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
                        className="min-h-11 sm:min-h-8"
                        disabled={
                          !canUpdate ||
                          updateVision.isPending ||
                          updateObjective.isPending
                        }
                        onClick={() => void handleArchiveVision(draftVision)}
                      >
                        Archiver
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {archivedVisions.length > 0 ? (
              <>
                <h3 id="sv-archived-fields" className="starium-modal-seg-title">
                  Historique archivé
                </h3>
                <ul className="divide-y divide-border/60">
                  {archivedVisions.map((archivedVision) => (
                    <li key={archivedVision.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p className="truncate text-sm font-medium text-muted-foreground">
                        {archivedVision.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {archivedVision.horizonLabel} ·{' '}
                        {formatVisionWorkflowDateTime(archivedVision.updatedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </FormDialogShell>

      <StrategicVisionEditDialog
        vision={visionToEdit}
        open={editingVision}
        onOpenChange={(next) => {
          setEditingVision(next);
          if (!next) setVisionToEdit(null);
        }}
      />
      <StrategicVisionCreateDialog open={creatingVision} onOpenChange={setCreatingVision} />
    </>
  );
}
