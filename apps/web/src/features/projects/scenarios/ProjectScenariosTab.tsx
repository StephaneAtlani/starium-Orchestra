'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/feedback/loading-state';
import { CreateScenarioDialog } from './CreateScenarioDialog';
import { ScenarioCard } from './ScenarioCard';
import { SelectScenarioDialog } from './SelectScenarioDialog';
import { projectScenarioCockpit } from '../constants/project-routes';
import { useProjectScenariosMutations } from '../hooks/use-project-scenarios-mutations';
import type { ProjectScenarioApi, SelectProjectScenarioPayload } from '../types/project.types';
import { cn } from '@/lib/utils';

type ProjectScenariosTabProps = {
  projectId: string;
  scenarios: ProjectScenarioApi[];
  isLoading: boolean;
  canMutate: boolean;
  /** Si `canMutate` est false : message pour alerte / title boutons (permission vs cycle de vie). */
  mutationDisabledReason?: string | null;
};

export function ProjectScenariosTab({
  projectId,
  scenarios,
  isLoading,
  canMutate,
  mutationDisabledReason,
}: ProjectScenariosTabProps) {
  const { createMutation, duplicateMutation, selectMutation, archiveMutation, isAnyPending } =
    useProjectScenariosMutations(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectingScenario, setSelectingScenario] = useState<ProjectScenarioApi | null>(null);
  const [archiveScenario, setArchiveScenario] = useState<ProjectScenarioApi | null>(null);

  const disabledReason = canMutate
    ? null
    : (mutationDisabledReason ??
      'Permission requise: projects.update pour exécuter cette action.');

  const selectedCount = useMemo(
    () => scenarios.filter((scenario) => scenario.status === 'SELECTED' || scenario.isBaseline).length,
    [scenarios],
  );

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Scénarios projet</h2>
          <p className="text-xs text-muted-foreground">
            {scenarios.length} scénario(x) · {selectedCount} baseline active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={projectScenarioCockpit(projectId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Ouvrir le cockpit
          </Link>
          <Button
            type="button"
            size="sm"
            disabled={!canMutate || isAnyPending}
            title={disabledReason ?? undefined}
            onClick={() => setCreateOpen(true)}
          >
            Créer un scénario
          </Button>
        </div>
      </header>

      {!canMutate ? (
        <Alert>
          <AlertTitle>Action limitée</AlertTitle>
          <AlertDescription>{disabledReason}</AlertDescription>
        </Alert>
      ) : null}

      {scenarios.length === 0 ? (
        <Alert>
          <AlertTitle>Aucun scénario</AlertTitle>
          <AlertDescription>
            Créez un premier scénario pour lancer l’arbitrage.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              projectId={projectId}
              scenario={scenario}
              canMutate={canMutate}
              disableMutations={isAnyPending}
              disabledReason={disabledReason}
              onDuplicate={(scenarioId) => {
                if (!canMutate || isAnyPending) return;
                duplicateMutation.mutate(scenarioId);
              }}
              onSelect={() => setSelectingScenario(scenario)}
              onArchive={() => setArchiveScenario(scenario)}
            />
          ))}
        </div>
      )}

      <CreateScenarioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        disabled={!canMutate || isAnyPending}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
      />

      <SelectScenarioDialog
        open={selectingScenario != null}
        scenarioName={selectingScenario?.name ?? ''}
        onOpenChange={(open) => {
          if (!open) setSelectingScenario(null);
        }}
        disabled={!canMutate || isAnyPending}
        onSubmit={async (payload: SelectProjectScenarioPayload) => {
          if (!selectingScenario) return;
          await selectMutation.mutateAsync({
            scenarioId: selectingScenario.id,
            payload,
          });
          setSelectingScenario(null);
        }}
      />

      <Dialog
        open={archiveScenario != null}
        onOpenChange={(open) => {
          if (!open) setArchiveScenario(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l’archivage</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirmez l’archivage du scénario «&nbsp;{archiveScenario?.name ?? ''}&nbsp;».
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveScenario(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!archiveScenario || !canMutate || isAnyPending}
              onClick={async () => {
                if (!archiveScenario) return;
                await archiveMutation.mutateAsync(archiveScenario.id);
                setArchiveScenario(null);
              }}
            >
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
