'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  fetchWorkflowSettings,
  patchWorkflowSettings,
} from '../api/project-requests.api';

const TARGET_OPTIONS = [
  { value: 'MANUAL_DECISION', label: 'Décision manuelle' },
  { value: 'DRAFT_PROJECT', label: 'Projet brouillon' },
  { value: 'PROJECT_BACKLOG', label: 'Backlog projet' },
  { value: 'PILOTING_CYCLE', label: 'Cycle de pilotage' },
];

export function ProjectRequestWorkflowSettingsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-request-workflow-settings', clientId],
    queryFn: () => fetchWorkflowSettings(authFetch),
    enabled: !!clientId,
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchWorkflowSettings(authFetch, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['project-request-workflow-settings', clientId],
      });
    },
  });

  const target = data?.resolved.defaultApprovedTarget ?? 'MANUAL_DECISION';

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Workflow demandes projet"
          description="Cible par défaut après approbation et règles de sélection du validateur."
        />
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : error ? (
          <p className="text-sm text-destructive">Chargement impossible.</p>
        ) : (
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label>Cible après approbation</Label>
              <Select
                value={target}
                onValueChange={(value) =>
                  mutation.mutate({ defaultApprovedTarget: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
