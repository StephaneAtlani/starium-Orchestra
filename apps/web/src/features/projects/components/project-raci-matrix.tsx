'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, Grid3x3, Info, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectRaciAction,
  deleteProjectRaciAction,
  updateProjectTeamRaci,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  PROJECT_RACI_CELL_CLASS,
  PROJECT_RACI_DESCRIPTION,
  PROJECT_RACI_FULL_LABEL,
  PROJECT_RACI_HELP_DETAIL,
  PROJECT_RACI_HELP_INTRO,
  PROJECT_RACI_KINDS,
  PROJECT_RACI_SHORT_LABEL,
  PROJECT_RASCI_ACCOUNTABLE_CONFIRM_MS,
  cycleProjectRaciKind,
} from '../lib/project-raci-labels';
import { normalizeProjectRaciMatrix } from '../lib/normalize-project-raci-matrix';
import { useProjectTeamRaciQuery } from '../hooks/use-project-team-queries';
import type { ProjectRaciKind, ProjectRaciMatrixApi } from '../types/project.types';

function raciCellKey(actionId: string, roleId: string) {
  return `${actionId}:${roleId}`;
}

function cellKindFor(
  matrix: ProjectRaciMatrixApi,
  actionId: string,
  roleId: string,
): ProjectRaciKind | null {
  return (
    matrix.cells.find((c) => c.actionId === actionId && c.roleId === roleId)?.kind ?? null
  );
}

function ProjectRaciHelpTrigger() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Qu’est-ce que le RASCI ?"
          >
            <Info className="size-4" aria-hidden />
          </button>
        }
      />
      <TooltipContent side="bottom" align="start" className="max-w-sm space-y-2 text-xs">
        <p className="font-medium text-foreground">Matrice RASCI</p>
        <p className="text-muted-foreground">{PROJECT_RACI_HELP_INTRO}</p>
        <ul className="space-y-1 text-muted-foreground">
          {PROJECT_RACI_KINDS.map((kind) => (
            <li key={kind} className="flex gap-2">
              <span
                className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold',
                  PROJECT_RACI_CELL_CLASS[kind],
                )}
              >
                {PROJECT_RACI_SHORT_LABEL[kind]}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {PROJECT_RACI_FULL_LABEL[kind]}
                </span>
                {' — '}
                {PROJECT_RACI_DESCRIPTION[kind]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{PROJECT_RACI_HELP_DETAIL}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type PendingAccountable = {
  cellKey: string;
  actionId: string;
  roleId: string;
  displacedRoleName: string;
  timerId: ReturnType<typeof setTimeout>;
};

export function ProjectRaciMatrix({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const raciQuery = useProjectTeamRaciQuery(projectId);
  const matrix = useMemo(
    () => normalizeProjectRaciMatrix(raciQuery.data),
    [raciQuery.data],
  );

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [newActionLabel, setNewActionLabel] = useState('');
  const [cellPreview, setCellPreview] = useState<Record<string, ProjectRaciKind | null>>({});
  const [pendingAccountableKey, setPendingAccountableKey] = useState<string | null>(null);
  const [pendingHint, setPendingHint] = useState<string | null>(null);
  const pendingAccountableRef = useRef<PendingAccountable | null>(null);

  const setMatrixCache = (data: ProjectRaciMatrixApi) => {
    queryClient.setQueryData(projectQueryKeys.raciMatrix(clientId, projectId), data);
  };

  const clearPendingAccountable = useCallback((revertPreview: boolean) => {
    const pending = pendingAccountableRef.current;
    if (!pending) return;
    clearTimeout(pending.timerId);
    pendingAccountableRef.current = null;
    setPendingAccountableKey(null);
    setPendingHint(null);
    if (revertPreview) {
      setCellPreview((prev) => {
        if (!(pending.cellKey in prev)) return prev;
        const next = { ...prev };
        delete next[pending.cellKey];
        return next;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      const pending = pendingAccountableRef.current;
      if (pending) clearTimeout(pending.timerId);
    };
  }, []);

  const cellMutation = useMutation({
    mutationFn: (payload: {
      actionId: string;
      roleId: string;
      kind: ProjectRaciKind | null;
    }) =>
      updateProjectTeamRaci(authFetch, projectId, {
        actionId: payload.actionId,
        roleId: payload.roleId,
        kind: payload.kind,
      }),
    onSuccess: (data, variables) => {
      setMatrixCache(data);
      const key = raciCellKey(variables.actionId, variables.roleId);
      setCellPreview((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const commitCell = useCallback(
    (actionId: string, roleId: string, kind: ProjectRaciKind | null) => {
      cellMutation.mutate({ actionId, roleId, kind });
    },
    [cellMutation],
  );

  const handleCellCycle = useCallback(
    (actionId: string, roleId: string, actorName: string, actionLabel: string) => {
      if (!canEdit || cellMutation.isPending) return;

      const key = raciCellKey(actionId, roleId);
      const persistedKind = cellKindFor(matrix, actionId, roleId);
      const currentKind = key in cellPreview ? cellPreview[key] : persistedKind;
      const next = cycleProjectRaciKind(currentKind);

      if (pendingAccountableRef.current && pendingAccountableRef.current.cellKey !== key) {
        clearPendingAccountable(true);
      }

      if (pendingAccountableRef.current?.cellKey === key) {
        clearPendingAccountable(false);
        setCellPreview((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        commitCell(actionId, roleId, next);
        return;
      }

      const otherAccountable = matrix.cells.find(
        (c) =>
          c.actionId === actionId &&
          c.kind === 'ACCOUNTABLE' &&
          c.roleId !== roleId,
      );

      if (next === 'ACCOUNTABLE' && otherAccountable) {
        const displacedRoleName =
          matrix.actors.find((a) => a.id === otherAccountable.roleId)?.name ??
          'un autre acteur';

        setCellPreview((prev) => ({ ...prev, [key]: 'ACCOUNTABLE' }));
        setPendingAccountableKey(key);
        setPendingHint(
          `A provisoire sur « ${actionLabel} » — recliquez sous ${Math.round(PROJECT_RASCI_ACCOUNTABLE_CONFIRM_MS / 1000)} s pour passer à S et conserver ${displacedRoleName} comme Approbateur.`,
        );

        const timerId = setTimeout(() => {
          pendingAccountableRef.current = null;
          setPendingAccountableKey(null);
          setPendingHint(null);
          setCellPreview((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
          commitCell(actionId, roleId, 'ACCOUNTABLE');
          toast.message(
            `Approbateur confirmé pour ${actorName} — l’ancien A (${displacedRoleName}) a été retiré sur cette ligne.`,
          );
        }, PROJECT_RASCI_ACCOUNTABLE_CONFIRM_MS);

        pendingAccountableRef.current = {
          cellKey: key,
          actionId,
          roleId,
          displacedRoleName,
          timerId,
        };
        return;
      }

      setCellPreview((prev) => {
        if (!(key in prev)) return prev;
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      commitCell(actionId, roleId, next);
    },
    [canEdit, cellMutation.isPending, cellPreview, matrix, clearPendingAccountable, commitCell],
  );

  const createActionMutation = useMutation({
    mutationFn: () =>
      createProjectRaciAction(authFetch, projectId, { label: newActionLabel.trim() }),
    onSuccess: (data) => {
      setMatrixCache(data);
      toast.success('Action ajoutée');
      setActionDialogOpen(false);
      setNewActionLabel('');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) =>
      deleteProjectRaciAction(authFetch, projectId, actionId),
    onSuccess: (data) => {
      setMatrixCache(data);
      toast.success('Action supprimée');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const sortedActions = useMemo(
    () =>
      [...(matrix?.actions ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
      ),
    [matrix?.actions],
  );

  const sortedActors = useMemo(
    () =>
      [...(matrix?.actors ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [matrix?.actors],
  );

  const displayKind = useCallback(
    (actionId: string, roleId: string): ProjectRaciKind | null => {
      const key = raciCellKey(actionId, roleId);
      if (key in cellPreview) return cellPreview[key];
      return cellKindFor(matrix, actionId, roleId);
    },
    [cellPreview, matrix],
  );

  return (
    <TooltipProvider delay={250}>
      <Card
        size="sm"
        className="overflow-hidden border-l-[3px] border-l-indigo-900 shadow-sm dark:border-l-indigo-700"
      >
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-indigo-900/35 bg-indigo-900/20 text-indigo-950 shadow-inner dark:border-indigo-700/40 dark:bg-indigo-950/50 dark:text-indigo-100"
              aria-hidden
            >
              <Grid3x3 className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-0.5">
                <CardTitle
                  id="project-raci-matrix-title"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Matrice RASCI
                </CardTitle>
                <ProjectRaciHelpTrigger />
              </div>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                <strong>Actions</strong> en lignes, <strong>acteurs</strong> (rôles équipe) en
                colonnes — une lettre R, A, S, C ou I par intersection (voir légende).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 pt-4">
          {pendingHint ? (
            <p
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
              role="status"
              aria-live="polite"
            >
              {pendingHint}
            </p>
          ) : null}

          {raciQuery.isLoading ? (
            <LoadingState rows={6} />
          ) : raciQuery.error ? (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle aria-hidden />
              <AlertTitle>Matrice RASCI indisponible</AlertTitle>
              <AlertDescription>
                Impossible de charger la matrice RASCI. Réessayez plus tard.
              </AlertDescription>
            </Alert>
          ) : sortedActors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun acteur — configurez les rôles dans la composition de l&apos;équipe en haut de
              fiche.
            </p>
          ) : sortedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action RASCI.</p>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card shadow-sm">
              <Table className="min-w-[36rem]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead
                      scope="col"
                      className="sticky left-0 z-20 min-w-[12rem] max-w-[18rem] border-r border-border/60 bg-muted/95 font-semibold text-foreground backdrop-blur-sm"
                    >
                      Action
                    </TableHead>
                    {sortedActors.map((actor) => (
                      <TableHead
                        key={actor.id}
                        scope="col"
                        className="min-w-[3.25rem] border-r border-border/60 px-1 py-2 text-center align-bottom last:border-r-0"
                      >
                        <span
                          className="mx-auto block max-h-32 overflow-hidden text-[11px] font-semibold leading-tight text-foreground [writing-mode:vertical-rl] [text-orientation:mixed]"
                          title={actor.name}
                        >
                          {actor.name}
                        </span>
                      </TableHead>
                    ))}
                    {canEdit ? (
                      <TableHead scope="col" className="w-10 px-1">
                        <span className="sr-only">Supprimer l&apos;action</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody aria-labelledby="project-raci-matrix-title">
                  {sortedActions.map((action, rowIdx) => (
                    <TableRow
                      key={action.id}
                      className={cn(rowIdx % 2 === 1 && 'bg-muted/15 hover:bg-muted/15')}
                    >
                      <TableCell
                        scope="row"
                        className="sticky left-0 z-10 min-w-[12rem] max-w-[18rem] border-r border-border/60 bg-background/95 py-2.5 text-sm font-medium leading-snug text-foreground backdrop-blur-sm"
                      >
                        {action.label}
                      </TableCell>
                      {sortedActors.map((actor) => {
                        const key = raciCellKey(action.id, actor.id);
                        const kind = displayKind(action.id, actor.id);
                        const isPendingAccountable = pendingAccountableKey === key;
                        const short = kind ? PROJECT_RACI_SHORT_LABEL[kind] : '';
                        const full = kind ? PROJECT_RACI_FULL_LABEL[kind] : 'Vide';

                        return (
                          <TableCell
                            key={actor.id}
                            className="border-r border-border/60 p-1 text-center last:border-r-0"
                          >
                            <button
                              type="button"
                              disabled={!canEdit || cellMutation.isPending}
                              className={cn(
                                'mx-auto flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md border text-sm font-bold transition-colors sm:size-10 sm:min-h-10 sm:min-w-10',
                                kind
                                  ? PROJECT_RACI_CELL_CLASS[kind]
                                  : 'border-border/60 bg-muted/10 text-muted-foreground/40',
                                isPendingAccountable &&
                                  'ring-2 ring-amber-500 ring-offset-2 ring-offset-background motion-safe:animate-pulse',
                                canEdit &&
                                  !cellMutation.isPending &&
                                  'cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                !canEdit && 'cursor-default',
                              )}
                              title={
                                isPendingAccountable
                                  ? `A provisoire — recliquez pour annuler ou attendez la confirmation`
                                  : kind
                                    ? `${full} — ${PROJECT_RACI_DESCRIPTION[kind]}`
                                    : 'Aucune affectation'
                              }
                              aria-label={`${action.label} · ${actor.name} : ${isPendingAccountable ? 'A en attente de confirmation' : full}`}
                              onClick={() =>
                                handleCellCycle(
                                  action.id,
                                  actor.id,
                                  actor.name,
                                  action.label,
                                )
                              }
                            >
                              {short || '·'}
                            </button>
                          </TableCell>
                        );
                      })}
                      {canEdit ? (
                        <TableCell className="px-1 text-center">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            disabled={deleteActionMutation.isPending}
                            aria-label={`Supprimer l'action ${action.label}`}
                            onClick={() => {
                              if (!confirm(`Supprimer l'action « ${action.label} » ?`)) return;
                              deleteActionMutation.mutate(action.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {PROJECT_RACI_KINDS.map((kind) => (
                  <span key={kind} className="inline-flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded border text-[10px] font-bold',
                        PROJECT_RACI_CELL_CLASS[kind],
                      )}
                    >
                      {PROJECT_RACI_SHORT_LABEL[kind]}
                    </span>
                    <span>
                      {PROJECT_RACI_FULL_LABEL[kind]} — {PROJECT_RACI_DESCRIPTION[kind]}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Règle : un seul <strong>A</strong> par ligne — remplacement confirmé après{' '}
                {Math.round(PROJECT_RASCI_ACCOUNTABLE_CONFIRM_MS / 1000)} s (recliquez pour
                passer à S sans déplacer l&apos;ancien A).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!canEdit ? (
                <p className="text-xs text-muted-foreground">Lecture seule — pas de modification.</p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActionDialogOpen(true)}
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  Ajouter une action
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle action RASCI</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-raci-action-label">Libellé de l&apos;action</Label>
            <Input
              id="new-raci-action-label"
              value={newActionLabel}
              onChange={(e) => setNewActionLabel(e.target.value)}
              placeholder="Ex. : Validation du livrable final"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActionDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!newActionLabel.trim() || createActionMutation.isPending}
              onClick={() => createActionMutation.mutate()}
            >
              {createActionMutation.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
