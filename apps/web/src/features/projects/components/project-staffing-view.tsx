'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePermissions } from '@/hooks/use-permissions';
import { projectDetail } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import { useProjectResourceAssignments } from '@/features/teams/team-assignments/hooks/use-project-resource-assignments';
import { useTeamAssignmentMutations } from '@/features/teams/team-assignments/hooks/use-team-assignment-mutations';
import { TeamAssignmentsTable } from '@/features/teams/team-assignments/components/team-assignments-table';
import { TeamAssignmentFormDialog } from '@/features/teams/team-assignments/components/team-assignment-form-dialog';
import type { TeamResourceAssignment } from '@/features/teams/team-assignments/types/team-assignment.types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function ProjectStaffingView({ projectId }: { projectId: string }) {
  const { has, isLoading: permsLoading, isSuccess: permsOk } = usePermissions();
  const canReadAssignments = has('team_assignments.read');
  const canManage = has('team_assignments.manage');
  const canActivityTypes = has('activity_types.read');

  const projectQuery = useProjectDetailQuery(projectId);
  const [offset, setOffset] = useState(0);

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      includeCancelled: false,
    }),
    [offset],
  );

  const listQuery = useProjectResourceAssignments(projectId, listParams);
  const { cancelProject } = useTeamAssignmentMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<TeamResourceAssignment | null>(null);

  const project = projectQuery.data;
  const projectLabel = project
    ? `${project.name} (${project.code})`
    : projectId;

  const openCreate = () => {
    setFormMode('create');
    setEditRow(null);
    setFormOpen(true);
  };

  const openEdit = (row: TeamResourceAssignment) => {
    setFormMode('edit');
    setEditRow(row);
    setFormOpen(true);
  };

  const handleCancelRow = async (row: TeamResourceAssignment) => {
    if (!canManage || !canActivityTypes) return;
    if (!window.confirm('Annuler cette affectation ?')) return;
    try {
      await cancelProject.mutateAsync({ projectId, assignmentId: row.id });
      toast.success('Affectation annulée.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Annulation impossible.');
    }
  };

  const writeBlocked = canManage && !canActivityTypes;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Charge planifiée</h1>
          <p className="text-muted-foreground text-sm">
            Affectations sur le projet — types d&apos;activité de nature « Projet » uniquement.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={projectDetail(projectId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Synthèse projet
          </Link>
          {permsOk && canReadAssignments && canManage ? (
            <Button type="button" size="sm" onClick={openCreate} disabled={!canActivityTypes}>
              <Plus className="size-4" />
              Nouvelle affectation
            </Button>
          ) : null}
        </div>
      </div>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} />
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {projectQuery.isLoading && <LoadingState rows={2} />}
          {projectQuery.error && (
            <Alert variant="destructive">
              <AlertTitle>Projet introuvable</AlertTitle>
              <AlertDescription>
                {(projectQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          )}

          {permsLoading && <LoadingState rows={2} />}
          {permsOk && !canReadAssignments && (
            <Alert className="border-amber-500/35">
              <AlertTriangle className="size-4" />
              <AlertTitle>Accès refusé</AlertTitle>
              <AlertDescription>
                Permission requise : <code>team_assignments.read</code>.
              </AlertDescription>
            </Alert>
          )}

          {permsOk && canReadAssignments && writeBlocked && (
            <Alert className="mb-4">
              <AlertTitle>Modification impossible</AlertTitle>
              <AlertDescription>
                Consultation seule : la création et l’édition nécessitent{' '}
                <code>activity_types.read</code>.
              </AlertDescription>
            </Alert>
          )}

          {permsOk && canReadAssignments && project && (
            <>
              {listQuery.isLoading && <LoadingState rows={4} />}
              {listQuery.error && (
                <Alert variant="destructive">
                  <AlertTitle>{(listQuery.error as Error).message}</AlertTitle>
                </Alert>
              )}
              {listQuery.data && listQuery.data.items.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Aucune affectation sur ce projet.
                </p>
              )}
              {listQuery.data && listQuery.data.items.length > 0 && (
                <TeamAssignmentsTable
                  variant="project"
                  items={listQuery.data.items}
                  canManage={canManage && canActivityTypes}
                  onEdit={openEdit}
                  onCancel={handleCancelRow}
                />
              )}
              {listQuery.data && listQuery.data.total > PAGE_SIZE ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-sm">
                    {listQuery.data.total} résultat(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={offset + PAGE_SIZE >= listQuery.data.total}
                      onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <TeamAssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        variant="project"
        projectId={projectId}
        projectLabel={projectLabel}
        mode={formMode}
        initial={editRow}
        canLoadActivityTypes={canActivityTypes}
      />
    </div>
  );
}
