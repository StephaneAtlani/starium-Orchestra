'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  createProjectRisk,
  deleteProjectRisk,
  updateProjectRisk,
  type CreateProjectRiskPayload,
} from '../api/projects.api';
import {
  PROJECT_RISK_CRITICALITY_LABEL,
  RISK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { ProjectRiskEbiosDialog } from './project-risk-ebios-dialog';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import type { ProjectRiskApi } from '../types/project.types';

function criticalityBadgeClass(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'border-violet-500/50 bg-violet-500/10 text-violet-950 dark:text-violet-300';
    case 'HIGH':
      return 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300';
    case 'MEDIUM':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-600';
    default:
      return 'border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-500';
  }
}

export function ProjectRisksView({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: project } = useProjectDetailQuery(projectId);
  const risksQuery = useProjectRisksQuery(projectId);

  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskDialogMode, setRiskDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRisk, setEditingRisk] = useState<ProjectRiskApi | null>(null);

  const invalidateRisks = () => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.risks(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: [...projectQueryKeys.all, 'risk-detail', clientId, projectId],
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.risksRegistry(clientId),
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectRiskPayload) =>
      createProjectRisk(authFetch, projectId, payload),
    onSuccess: (data) => {
      toast.success('Risque créé');
      setEditingRisk(data);
      setRiskDialogMode('edit');
      invalidateRisks();
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      riskId,
      payload,
    }: {
      riskId: string;
      payload: CreateProjectRiskPayload;
    }) => updateProjectRisk(authFetch, projectId, riskId, payload),
    onSuccess: (data) => {
      setEditingRisk(data);
      invalidateRisks();
    },
    onError: (e: Error) => toast.error(e.message || 'Enregistrement impossible'),
  });

  const deleteMutation = useMutation({
    mutationFn: (riskId: string) => deleteProjectRisk(authFetch, projectId, riskId),
    onSuccess: () => {
      toast.success('Risque supprimé');
      invalidateRisks();
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const openCreateDialog = () => {
    setEditingRisk(null);
    setRiskDialogMode('create');
    setRiskDialogOpen(true);
  };

  const openEditDialog = (risk: ProjectRiskApi) => {
    setEditingRisk(risk);
    setRiskDialogMode('edit');
    setRiskDialogOpen(true);
  };

  const handleDialogSave = async (payload: CreateProjectRiskPayload) => {
    if (riskDialogMode === 'create') {
      await createMutation.mutateAsync(payload);
      return;
    }
    if (editingRisk) {
      await updateMutation.mutateAsync({ riskId: editingRisk.id, payload });
    }
  };

  const handleDeleteRisk = async () => {
    if (!editingRisk) return;
    await deleteMutation.mutateAsync(editingRisk.id);
    setRiskDialogOpen(false);
    setEditingRisk(null);
  };

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (!initialized) {
    return <LoadingState rows={4} />;
  }

  if (!clientId) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertTitle>Client actif requis</AlertTitle>
        <AlertDescription>
          Sélectionnez une organisation (client) dans l’en-tête pour charger les risques du projet.
        </AlertDescription>
      </Alert>
    );
  }

  const dialogPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
        <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
          {canEdit ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" size="sm" className="gap-1.5" onClick={openCreateDialog}>
                <Plus className="size-4" />
                Nouveau risque
              </Button>
            </div>
          ) : null}

          {risksQuery.isError ? (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertTitle>Impossible de charger les risques</AlertTitle>
              <AlertDescription>
                {risksQuery.error instanceof Error
                  ? risksQuery.error.message
                  : 'Erreur réseau ou accès refusé.'}
              </AlertDescription>
            </Alert>
          ) : risksQuery.isLoading || risksQuery.isPending ? (
            <LoadingState rows={4} />
          ) : (
            <RisksTable
              risks={risksQuery.data ?? []}
              projectCode={project?.code ?? ''}
              canEdit={canEdit}
              onEdit={openEditDialog}
            />
          )}
        </CardContent>
      </Card>

      <ProjectRiskEbiosDialog
        open={riskDialogOpen}
        onOpenChange={(o) => {
          setRiskDialogOpen(o);
          if (!o) setEditingRisk(null);
        }}
        mode={riskDialogMode}
        projectId={projectId}
        risk={riskDialogMode === 'edit' ? editingRisk : null}
        isPending={dialogPending}
        onSave={handleDialogSave}
        canDelete={canEdit}
        onDelete={handleDeleteRisk}
        isDeleting={deleteMutation.isPending}
      />
    </ProjectWorkspaceShell>
  );
}

function RisksTable({
  risks,
  projectCode,
  canEdit,
  onEdit,
}: {
  risks: ProjectRiskApi[];
  projectCode: string;
  canEdit: boolean;
  onEdit: (r: ProjectRiskApi) => void;
}) {
  if (risks.length === 0) {
    const isSeedDemoProject = /-SEED-\d{2}$/.test(projectCode);
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Aucun risque enregistré pour ce projet ({projectCode}).</p>
        {isSeedDemoProject ? (
          <p>
            Les jeux de données risques démo sont injectés par{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npx prisma db seed</code>{' '}
            (API). Si la liste reste vide après seed, vérifie les logs serveur et que tu es sur le bon
            client (organisation) dans l’en-tête.
          </p>
        ) : (
          <p>
            Le seed automatique ne remplit que les projets dont le code ressemble à{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">NEO-SEED-01</code> …{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">-SEED-10</code>. Ouvre un
            projet démo du portefeuille ou ajoute un risque avec « Nouveau risque ».
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="w-[72px] text-center">P</TableHead>
            <TableHead className="w-[72px] text-center">I</TableHead>
            <TableHead className="w-[80px] text-center">Score</TableHead>
            <TableHead className="w-[120px]">Criticité</TableHead>
            <TableHead className="w-[120px]">Statut</TableHead>
            <TableHead className="w-[100px]">Conformité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.code}</TableCell>
              <TableCell className="max-w-[min(100%,320px)] font-medium">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && onEdit(r)}
                  className={cn(
                    'text-left transition-colors',
                    canEdit &&
                      'rounded-sm hover:bg-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !canEdit && 'cursor-default',
                  )}
                >
                  {r.title}
                </button>
              </TableCell>
              <TableCell className="text-center tabular-nums">{r.probability}</TableCell>
              <TableCell className="text-center tabular-nums">{r.impact}</TableCell>
              <TableCell className="text-center tabular-nums">{r.criticalityScore}</TableCell>
              <TableCell>
                <RegistryBadge className={criticalityBadgeClass(r.criticalityLevel)}>
                  {PROJECT_RISK_CRITICALITY_LABEL[r.criticalityLevel] ?? r.criticalityLevel}
                </RegistryBadge>
              </TableCell>
              <TableCell className="text-sm">
                {RISK_STATUS_LABEL[r.status] ?? r.status}
              </TableCell>
              <TableCell>
                {r.complianceRequirementId ? (
                  <RegistryBadge className="bg-secondary text-secondary-foreground text-xs">
                    Lien exigence
                  </RegistryBadge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
