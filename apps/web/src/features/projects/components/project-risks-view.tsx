'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { createProjectRisk, deleteProjectRisk } from '../api/projects.api';
import { projectsList } from '../constants/project-routes';
import { RISK_STATUS_LABEL } from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import type { ProjectRiskApi } from '../types/project.types';

const CRIT_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const PI_OPTIONS = [1, 2, 3, 4, 5] as const;

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
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);
  const risksQuery = useProjectRisksQuery(projectId);

  const [newTitle, setNewTitle] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);

  const createMutation = useMutation({
    mutationFn: () =>
      createProjectRisk(authFetch, projectId, {
        title: newTitle.trim(),
        probability,
        impact,
      }),
    onSuccess: () => {
      toast.success('Risque créé');
      setNewTitle('');
      setProbability(3);
      setImpact(3);
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.risks(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  const deleteMutation = useMutation({
    mutationFn: (riskId: string) => deleteProjectRisk(authFetch, projectId, riskId),
    onSuccess: () => {
      toast.success('Risque supprimé');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.risks(clientId, projectId),
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  if (isLoading) return <LoadingState rows={6} />;

  if (error || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectsList()}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Portefeuille projets
          </Link>
          <PageHeader
            title={project.name}
            description="Registre des risques — probabilité et impact (1–5), criticité calculée côté serveur"
          />
        </div>
      </header>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
          {canEdit ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="risk-title">Nouveau risque — titre</Label>
                <Input
                  id="risk-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={createMutation.isPending}
                  placeholder="ex. Dépendance fournisseur unique"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-auto">
                <div className="space-y-2">
                  <Label>Probabilité (1–5)</Label>
                  <Select
                    value={String(probability)}
                    onValueChange={(v) => setProbability(Number(v))}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PI_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Impact (1–5)</Label>
                  <Select
                    value={String(impact)}
                    onValueChange={(v) => setImpact(Number(v))}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PI_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                disabled={createMutation.isPending || !newTitle.trim()}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Création…' : 'Ajouter'}
              </Button>
            </div>
          ) : null}

          {risksQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : (
            <RisksTable
              risks={risksQuery.data ?? []}
              canEdit={canEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              deleting={deleteMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RisksTable({
  risks,
  canEdit,
  onDelete,
  deleting,
}: {
  risks: ProjectRiskApi[];
  canEdit: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun risque enregistré pour ce projet.</p>
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
            {canEdit ? <TableHead className="w-[52px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.code}</TableCell>
              <TableCell className="max-w-[min(100%,320px)] font-medium">{r.title}</TableCell>
              <TableCell className="text-center tabular-nums">{r.probability}</TableCell>
              <TableCell className="text-center tabular-nums">{r.impact}</TableCell>
              <TableCell className="text-center tabular-nums">{r.criticalityScore}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn('font-normal', criticalityBadgeClass(r.criticalityLevel))}
                >
                  {CRIT_LABEL[r.criticalityLevel] ?? r.criticalityLevel}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {RISK_STATUS_LABEL[r.status] ?? r.status}
              </TableCell>
              <TableCell>
                {r.complianceRequirementId ? (
                  <Badge variant="secondary" className="text-xs">
                    Lien exigence
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {canEdit ? (
                <TableCell className="p-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={deleting}
                    aria-label={`Supprimer ${r.code}`}
                    onClick={() => onDelete(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
