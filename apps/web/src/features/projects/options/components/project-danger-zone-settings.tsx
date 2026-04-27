'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { deleteProject } from '@/features/projects/api/projects.api';
import { projectsList } from '@/features/projects/constants/project-routes';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';

type Props = {
  projectId: string;
  projectName: string;
  projectCode: string | null;
};

export function ProjectDangerZoneSettings({
  projectId,
  projectName,
  projectCode,
}: Props) {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canDeleteProject = has('projects.delete');

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProject(authFetch, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.list(clientId, {}),
      });
      toast.success('Projet supprimé.');
      router.push(projectsList());
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Suppression impossible.');
    },
  });

  if (!canDeleteProject) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">projects.delete</code> requise pour accéder à cette
          section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          Zone dangereuse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          La suppression d&apos;un projet est définitive et peut impacter les liaisons
          (budgets, risques, planning, stratégie).
        </p>
        <Button
          type="button"
          variant="destructive"
          disabled={deleteProjectMutation.isPending}
          onClick={() => {
            const firstConfirm = window.confirm(
              `Supprimer définitivement le projet "${projectName}" ? Cette action est irréversible.`,
            );
            if (!firstConfirm) return;
            const validationToken = projectCode?.trim() || projectName.trim();
            const typed = window.prompt(
              `Validation requise : tape "${validationToken}" pour confirmer la suppression.`,
              '',
            );
            if (typed == null) return;
            if (typed.trim() !== validationToken) {
              window.alert('Validation incorrecte. Suppression annulée.');
              return;
            }
            deleteProjectMutation.mutate(projectId);
          }}
        >
          {deleteProjectMutation.isPending ? 'Suppression...' : 'Supprimer le projet'}
        </Button>
      </CardContent>
    </Card>
  );
}
