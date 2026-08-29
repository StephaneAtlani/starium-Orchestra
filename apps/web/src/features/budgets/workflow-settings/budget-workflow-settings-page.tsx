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
import { BUDGET_LINE_STATUS_EDIT_OPTIONS } from '@/features/budgets/constants/budget-line-status-options';

type BudgetWorkflowSettingsResponse = {
  stored: {
    requireEnvelopesNonDraftForBudgetValidated?: boolean;
    snapshotIncludedBudgetLineStatuses?: string[];
    landingForecastEnabled?: boolean;
    midYearDefaultLineStatus?: string;
    midYearDefaultEnvelopeStatus?: string;
    midYearRequireJustification?: boolean;
  } | null;
  resolved: {
    requireEnvelopesNonDraftForBudgetValidated: boolean;
    snapshotIncludedBudgetLineStatuses: string[];
    landingForecastEnabled: boolean;
    midYearDefaultLineStatus: string;
    midYearDefaultEnvelopeStatus: string;
    midYearRequireJustification: boolean;
  };
};

type PatchBody = {
  requireEnvelopesNonDraftForBudgetValidated?: boolean;
  snapshotIncludedBudgetLineStatuses?: string[];
  landingForecastEnabled?: boolean;
  midYearDefaultLineStatus?: string;
  midYearDefaultEnvelopeStatus?: string;
  midYearRequireJustification?: boolean;
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
  body: PatchBody,
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
    mutationFn: (body: PatchBody) => patchSettings(authFetch, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget-workflow-settings', clientId] });
    },
  });

  const checked = data?.resolved.requireEnvelopesNonDraftForBudgetValidated ?? true;
  const snapshotStatuses = data?.resolved.snapshotIncludedBudgetLineStatuses ?? [];
  const included = new Set(snapshotStatuses);
  const landingForecastEnabled = data?.resolved.landingForecastEnabled ?? true;
  const midYearRequireJustification = data?.resolved.midYearRequireJustification ?? true;
  const midYearDefaultLineStatus =
    data?.resolved.midYearDefaultLineStatus ?? 'PENDING_VALIDATION';
  const midYearDefaultEnvelopeStatus =
    data?.resolved.midYearDefaultEnvelopeStatus ?? 'PENDING_VALIDATION';

  const toggleSnapshotStatus = (value: string, nextChecked: boolean) => {
    const next = new Set(included);
    if (nextChecked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    if (next.size === 0) {
      return;
    }
    mutation.mutate({
      snapshotIncludedBudgetLineStatuses: Array.from(next).sort(),
    });
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Workflow budget"
          description="Règles client : validation du budget et périmètre des lignes pour les versions figées."
        />
        <div className="max-w-xl space-y-8 rounded-lg border border-border bg-card p-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          )}
          {data && (
            <>
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
                  onCheckedChange={(v) =>
                    mutation.mutate({ requireEnvelopesNonDraftForBudgetValidated: v })
                  }
                />
              </div>

              <div className="border-t border-border/60 pt-6 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="landing-forecast-enabled">
                      Prévision d’atterrissage (PA)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Affiche le rituel CODIR (figer l’avant, scénario, comparer, valider,
                      activer) sur les budgets validés.
                    </p>
                  </div>
                  <Switch
                    id="landing-forecast-enabled"
                    aria-label="Activer la prévision d’atterrissage"
                    checked={landingForecastEnabled}
                    disabled={mutation.isPending}
                    onCheckedChange={(v) => mutation.mutate({ landingForecastEnabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="mid-year-justification">
                      Justification obligatoire en cours d’exercice
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      À la création d’une ligne ou enveloppe sur un budget validé, le champ
                      Justification (PA / CODIR) est exigé.
                    </p>
                  </div>
                  <Switch
                    id="mid-year-justification"
                    aria-label="Exiger une justification en cours d’exercice"
                    checked={midYearRequireJustification}
                    disabled={mutation.isPending}
                    onCheckedChange={(v) =>
                      mutation.mutate({ midYearRequireJustification: v })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mid-year-line-status">
                    Statut par défaut des nouvelles lignes (budget validé)
                  </Label>
                  <select
                    id="mid-year-line-status"
                    className="flex min-h-11 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm sm:min-h-9"
                    value={midYearDefaultLineStatus}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({ midYearDefaultLineStatus: e.target.value })
                    }
                  >
                    <option value="PENDING_VALIDATION">À valider</option>
                    <option value="DRAFT">Brouillon</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mid-year-envelope-status">
                    Statut par défaut des nouvelles enveloppes (budget validé)
                  </Label>
                  <select
                    id="mid-year-envelope-status"
                    className="flex min-h-11 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm sm:min-h-9"
                    value={midYearDefaultEnvelopeStatus}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({ midYearDefaultEnvelopeStatus: e.target.value })
                    }
                  >
                    <option value="PENDING_VALIDATION">À valider</option>
                    <option value="DRAFT">Brouillon</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border/60 pt-6 space-y-3">
                <div className="space-y-1">
                  <Label>Versions figées — statuts de ligne inclus</Label>
                  <p className="text-sm text-muted-foreground">
                    Seules les lignes dont le statut est coché sont copiées dans une version figée.
                    Par défaut, les brouillons ne sont pas inclus ; vous pouvez les activer ici.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUDGET_LINE_STATUS_EDIT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border/70 bg-muted/20 p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
                        checked={included.has(opt.value)}
                        disabled={mutation.isPending}
                        onChange={(e) => toggleSnapshotStatus(opt.value, e.target.checked)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
