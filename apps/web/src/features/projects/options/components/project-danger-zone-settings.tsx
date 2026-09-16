'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { deleteProject } from '@/features/projects/api/projects.api';
import { projectsList } from '@/features/projects/constants/project-routes';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { firstDisplayLabel } from '@/lib/display-label';

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
  const confirmFieldId = useId();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const projectLabel = firstDisplayLabel([projectName, projectCode], 'Projet');
  const validationToken = projectCode?.trim() || projectName.trim();
  const canConfirm =
    validationToken.length > 0 && confirmPhrase.trim() === validationToken;

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProject(authFetch, id),
    onSuccess: async () => {
      setConfirmOpen(false);
      setConfirmPhrase('');
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

  function handleOpenChange(next: boolean) {
    if (deleteProjectMutation.isPending) return;
    setConfirmOpen(next);
    if (!next) setConfirmPhrase('');
  }

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
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" aria-hidden />
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
            onClick={() => setConfirmOpen(true)}
          >
            Supprimer le projet
          </Button>
        </CardContent>
      </Card>

      <StariumModal
        open={confirmOpen}
        onOpenChange={handleOpenChange}
        title="Supprimer le projet"
        description={`« ${projectLabel} » sera définitivement supprimé.`}
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={deleteProjectMutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-9"
              disabled={!canConfirm || deleteProjectMutation.isPending}
              onClick={() => deleteProjectMutation.mutate(projectId)}
            >
              {deleteProjectMutation.isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Les liaisons budgets, risques, planning et stratégie
            peuvent être impactées.
          </p>
          <div className="starium-form-field">
            <label htmlFor={confirmFieldId} className="starium-form-label">
              Pour confirmer, saisissez{' '}
              <span className="font-semibold text-foreground">{validationToken}</span>
            </label>
            <Input
              id={confirmFieldId}
              className="starium-form-input min-h-11"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={deleteProjectMutation.isPending}
              aria-describedby={`${confirmFieldId}-hint`}
            />
            <p id={`${confirmFieldId}-hint`} className="starium-form-hint">
              Code ou nom exact du projet, sans modification.
            </p>
          </div>
        </div>
      </StariumModal>
    </>
  );
}
