'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';

type BudgetWorkflowSettingsResponse = {
  stored: { requireEnvelopesNonDraftForBudgetValidated?: boolean } | null;
  resolved: { requireEnvelopesNonDraftForBudgetValidated: boolean };
};

async function fetchSettings(
  authFetch: ReturnType<typeof useAuthenticatedFetch>,
): Promise<BudgetWorkflowSettingsResponse> {
  const res = await authFetch('/api/clients/active/budget-workflow-settings');
  if (!res.ok) {
    throw new Error('Impossible de charger les paramètres workflow budget');
  }
  return res.json() as Promise<BudgetWorkflowSettingsResponse>;
}

async function patchSettings(
  authFetch: ReturnType<typeof useAuthenticatedFetch>,
  body: { requireEnvelopesNonDraftForBudgetValidated: boolean },
): Promise<BudgetWorkflowSettingsResponse> {
  const res = await authFetch('/api/clients/active/budget-workflow-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Enregistrement impossible');
  }
  return res.json() as Promise<BudgetWorkflowSettingsResponse>;
}

export function BudgetWorkflowSettingsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-workflow-settings', clientId],
    queryFn: () => fetchSettings(authFetch),
    enabled: !!clientId,
  });

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      patchSettings(authFetch, {
        requireEnvelopesNonDraftForBudgetValidated: next,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget-workflow-settings', clientId] });
    },
  });

  const checked = data?.resolved.requireEnvelopesNonDraftForBudgetValidated ?? true;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Workflow budget"
          description="Règle appliquée lors du passage du budget à « Validé » (baseline)."
        />
        <div className="max-w-xl space-y-6 rounded-lg border bg-card p-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          )}
          {data && (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label>
                  Exiger qu’aucune enveloppe ne soit en brouillon avant validation du budget
                </Label>
                <p className="text-sm text-muted-foreground">
                  Si activé, le passage à « Validé » est refusé tant qu’au moins une enveloppe
                  reste en brouillon. Valeur effective :{' '}
                  {checked ? 'activée' : 'désactivée'} pour ce client.
                </p>
              </div>
              <Switch
                aria-label="Exiger qu’aucune enveloppe ne soit en brouillon avant validation du budget"
                checked={checked}
                disabled={mutation.isPending}
                onCheckedChange={(v) => mutation.mutate(v)}
              />
            </div>
          )}
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
