'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Link2, Unlink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type {
  StrategicObjectiveDto,
  StrategicVisionAlertDto,
} from '../types/strategic-vision.types';
import { extractUnalignedProjectListItems } from '../lib/strategic-unaligned-projects';
import { buildAddProjectLinkBody } from '../lib/strategic-link-payload';
import { useAddStrategicObjectiveLinkMutation } from '../hooks/use-strategic-vision-queries';

export function StrategicUnalignedProjectsDialog({
  open,
  onOpenChange,
  alerts,
  isLoading,
  isError,
  expectedCount,
  objectives,
  canManageLinks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: StrategicVisionAlertDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  expectedCount: number;
  objectives: StrategicObjectiveDto[];
  canManageLinks: boolean;
}) {
  const projects = extractUnalignedProjectListItems(alerts);
  const addLinkMutation = useAddStrategicObjectiveLinkMutation();
  const [aligningProjectId, setAligningProjectId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const aligningProject = useMemo(
    () => projects.find((p) => p.projectId === aligningProjectId) ?? null,
    [projects, aligningProjectId],
  );

  const objectiveOptions = useMemo(
    () => objectives.map((o) => ({ id: o.id, title: o.title })),
    [objectives],
  );

  const selectedObjectiveTitle =
    objectiveOptions.find((o) => o.id === selectedObjectiveId)?.title ?? 'Objectif';

  function resetAlignStep() {
    setAligningProjectId(null);
    setSelectedObjectiveId('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetAlignStep();
      setStatusMessage(null);
    }
    onOpenChange(next);
  }

  async function handleConfirmAlign() {
    if (!aligningProject || !selectedObjectiveId.trim()) return;
    try {
      await addLinkMutation.mutateAsync({
        objectiveId: selectedObjectiveId.trim(),
        body: buildAddProjectLinkBody({
          id: aligningProject.projectId,
          label: aligningProject.label,
        }),
      });
      setStatusMessage(`${aligningProject.label} aligné sur ${selectedObjectiveTitle}.`);
      toast.success('Projet aligné');
      resetAlignStep();
    } catch {
      toast.error("Impossible d'aligner ce projet");
    }
  }

  const isAlignStep = aligningProject != null;

  return (
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title={isAlignStep ? 'Aligner le projet' : 'Projets non alignés'}
      description={
        isAlignStep
          ? `Lier « ${aligningProject.label} » à un objectif stratégique.`
          : `${expectedCount} projet${expectedCount > 1 ? 's' : ''} sans lien objectif sur le périmètre courant.`
      }
      icon={isAlignStep ? Link2 : Unlink}
      size="md"
      footer={
        isAlignStep ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={resetAlignStep}
              disabled={addLinkMutation.isPending}
            >
              Retour
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              onClick={() => void handleConfirmAlign()}
              disabled={!selectedObjectiveId || addLinkMutation.isPending}
            >
              Confirmer l&apos;alignement
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => handleOpenChange(false)}
          >
            Fermer
          </Button>
        )
      }
    >
      <div aria-live="polite" className="space-y-3">
        {statusMessage ? (
          <p className="text-sm text-muted-foreground" role="status">
            {statusMessage}
          </p>
        ) : null}

        {isAlignStep ? (
          <div className="starium-form space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-align-objective">Objectif</Label>
              {objectiveOptions.length === 0 ? (
                <EmptyState
                  title="Aucun objectif"
                  description="Créez un objectif stratégique avant d'aligner un projet."
                />
              ) : (
                <Select
                  value={selectedObjectiveId}
                  onValueChange={(v) => setSelectedObjectiveId(v ?? '')}
                  disabled={addLinkMutation.isPending}
                >
                  <SelectTrigger
                    id="sv-align-objective"
                    className="min-h-11 w-full sm:min-h-9"
                    aria-label="Choisir un objectif pour l'alignement"
                  >
                    <SelectValue placeholder="Choisir un objectif">
                      {selectedObjectiveId ? selectedObjectiveTitle : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {objectiveOptions.map((objective) => (
                      <SelectItem key={objective.id} value={objective.id}>
                        {objective.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <ErrorState message="Impossible de charger la liste des projets non alignés." />
        ) : projects.length === 0 ? (
          <EmptyState
            title="Aucun projet à afficher"
            description="Aucun projet non aligné n'a été trouvé pour ce périmètre."
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            {projects.map((project) => (
              <li
                key={project.projectId}
                className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {project.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {canManageLinks ? (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => {
                        setAligningProjectId(project.projectId);
                        setSelectedObjectiveId('');
                        setStatusMessage(null);
                      }}
                    >
                      Aligner
                    </Button>
                  ) : null}
                  <Link
                    href={`/projects/${project.projectId}`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'inline-flex min-h-11 items-center gap-1 sm:min-h-9',
                    )}
                    onClick={() => handleOpenChange(false)}
                  >
                    Voir le projet
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    <span className="sr-only"> — {project.label}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StariumModal>
  );
}
