'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, AlertTriangle, ArrowLeft, Archive, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { WorkTeamFormDialog } from '@/features/teams/work-teams/components/work-team-form-dialog';
import { WorkTeamMembersCard } from '@/features/teams/work-teams/components/work-team-members-card';
import { WorkTeamStatusBadge } from '@/features/teams/work-teams/components/work-team-status-badge';
import { useArchiveWorkTeam, useRestoreWorkTeam } from '@/features/teams/work-teams/hooks/use-work-team-mutations';
import { useWorkTeamDetail } from '@/features/teams/work-teams/hooks/use-work-team-detail';

export default function WorkTeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params?.teamId ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('teams.read');
  const canUpdate = has('teams.update');

  const query = useWorkTeamDetail(teamId);
  const [editOpen, setEditOpen] = useState(false);
  const archiveMutation = useArchiveWorkTeam();
  const restoreMutation = useRestoreWorkTeam();

  const team = query.data;
  const errorMessage = (query.error as Error | undefined)?.message ?? null;
  const status = (query.error as { status?: number } | undefined)?.status;

  async function onArchive() {
    if (!teamId || !globalThis.confirm('Archiver cette équipe ?')) return;
    try {
      await archiveMutation.mutateAsync(teamId);
    } catch {
      /* toast in mutation optional */
    }
  }

  async function onRestore() {
    if (!teamId) return;
    try {
      await restoreMutation.mutateAsync(teamId);
    } catch {
      /* */
    }
  }

  return (
    <>
      <PageHeader
        title={team?.name ?? 'Équipe'}
        description={team?.pathLabel ?? 'Détail équipe organisationnelle.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/teams/structure/teams"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <ArrowLeft className="size-4" />
              Liste
            </Link>
            {permsSuccess && canRead && team && canUpdate && (
              <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                Modifier
              </Button>
            )}
            {permsSuccess && canRead && team && canUpdate && team.status === 'ACTIVE' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onArchive}
                disabled={archiveMutation.isPending}
              >
                <Archive className="size-4" />
                Archiver
              </Button>
            )}
            {permsSuccess && canRead && team && canUpdate && team.status === 'ARCHIVED' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRestore}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="size-4" />
                Restaurer
              </Button>
            )}
          </div>
        }
      />

      {permsLoading && <LoadingState rows={2} />}
      {permsSuccess && !canRead && (
        <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>teams.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {permsSuccess && canRead && query.isLoading && <LoadingState rows={4} />}
      {permsSuccess && canRead && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{errorMessage}</AlertTitle>
          <AlertDescription>
            {status === 404
              ? 'Équipe introuvable pour ce client.'
              : status === 403
                ? 'Accès refusé.'
                : 'Impossible de charger l’équipe.'}
          </AlertDescription>
        </Alert>
      )}

      {permsSuccess && canRead && team && (
        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                Informations
                <WorkTeamStatusBadge status={team.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Code</p>
                <p className="font-medium">{team.code ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Parent</p>
                <p className="font-medium">{team.parentTeamName ?? 'Racine'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Chemin</p>
                <p className="font-medium">{team.pathLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Responsable d’équipe</p>
                <p className="font-medium">{team.leadDisplayName ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <WorkTeamMembersCard teamId={team.id} canUpdate={canUpdate} />
        </div>
      )}

      {team && (
        <WorkTeamFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          team={team}
        />
      )}
    </>
  );
}
