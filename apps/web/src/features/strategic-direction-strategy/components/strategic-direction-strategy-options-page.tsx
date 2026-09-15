'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  usePatchStrategicDirectionStrategyWorkflowSettingsMutation,
  useStrategicDirectionStrategyWorkflowSettingsQuery,
} from '../hooks/use-strategic-direction-strategy-queries';
import { toast } from '@/lib/toast';
import { firstDisplayLabel } from '@/lib/display-label';

export function StrategicDirectionStrategyOptionsPage() {
  const { activeClient } = useActiveClient();
  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';

  const settingsQ = useStrategicDirectionStrategyWorkflowSettingsQuery({
    enabled: Boolean(activeClient?.id),
  });
  const patchMutation = usePatchStrategicDirectionStrategyWorkflowSettingsMutation();

  if (!isClientAdmin) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <PageHeader title="Options — Stratégie de direction" />
          <Alert variant="destructive">
            <AlertTitle>Réservé à l’administrateur client</AlertTitle>
            <AlertDescription>
              Seul un administrateur client peut configurer le circuit de validation des stratégies.
            </AlertDescription>
          </Alert>
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const resolved = settingsQ.data?.resolved;
  const options = settingsQ.data?.options;
  const allowPick = resolved?.allowSubmitterToSelectValidator ?? true;
  const allowSelfValidation = resolved?.allowSelfValidation ?? false;
  const defaultValidatorId = resolved?.defaultValidatorUserId ?? '';
  const authorizedIds = resolved?.authorizedValidatorUserIds ?? [];
  const potentialValidators = options?.potentialValidators ?? [];
  const eligibleValidators = options?.eligibleValidators ?? [];
  const validatorChoices = (() => {
    const byId = new Map<string, (typeof potentialValidators)[number]>();
    for (const user of [...potentialValidators, ...eligibleValidators]) {
      byId.set(user.id, user);
    }
    return [...byId.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'fr'),
    );
  })();
  const defaultValidatorUser = validatorChoices.find((u) => u.id === defaultValidatorId);
  const defaultValidatorLabel = defaultValidatorId
    ? firstDisplayLabel(
        [defaultValidatorUser?.displayName, defaultValidatorUser?.email],
        'Validateur introuvable',
      )
    : '';

  const patch = (body: Record<string, unknown>) => {
    patchMutation.mutate(body, {
      onSuccess: () => toast.success('Options enregistrées'),
      onError: (error: unknown) => {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Enregistrement impossible.';
        toast.error(message);
      },
    });
  };

  const toggleAuthorized = (userId: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...authorizedIds, userId])]
      : authorizedIds.filter((id) => id !== userId);
    // Si circuit « défaut » et pas encore de défaut : le 1er autorisé devient le défaut.
    if (!allowPick && !defaultValidatorId && next.length > 0) {
      patch({
        authorizedValidatorUserIds: next,
        defaultValidatorUserId: next[0],
      });
      return;
    }
    patch({ authorizedValidatorUserIds: next });
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Link
            href="/strategic-direction-strategy"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Stratégie de direction
          </Link>
        </div>
        <PageHeader
          title="Options — Stratégie de direction"
          description="Configurez qui valide les stratégies soumises et si l’auto-validation est autorisée."
        />

        {settingsQ.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        ) : settingsQ.isError ? (
          <Alert variant="destructive">
            <AlertDescription>Impossible de charger les options du module.</AlertDescription>
          </Alert>
        ) : (
          <div className="max-w-2xl space-y-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Circuit de validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="allow-submitter-pick-validator">
                      Le soumissionnaire choisit le validateur
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      À la soumission, l’auteur désigne qui doit valider. Sinon, le validateur par
                      défaut ci-dessous est appliqué automatiquement.
                    </p>
                  </div>
                  <Switch
                    id="allow-submitter-pick-validator"
                    checked={allowPick}
                    disabled={patchMutation.isPending}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        patch({ allowSubmitterToSelectValidator: true });
                        return;
                      }
                      const fallbackDefault =
                        defaultValidatorId ||
                        authorizedIds[0] ||
                        validatorChoices[0]?.id ||
                        '';
                      if (!fallbackDefault) {
                        toast.error(
                          'Choisissez d’abord un validateur autorisé (ou un compte avec permission revue) avant de désactiver la sélection.',
                        );
                        return;
                      }
                      patch({
                        allowSubmitterToSelectValidator: false,
                        defaultValidatorUserId: fallbackDefault,
                      });
                    }}
                    aria-label="Le soumissionnaire choisit le validateur"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="allow-self-validation">
                      Autoriser l’auto-validation
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Si activé, le soumissionnaire peut valider ou refuser sa propre stratégie
                      (utile en démo / mono-utilisateur). Désactivé par défaut (séparation des
                      rôles).
                    </p>
                  </div>
                  <Switch
                    id="allow-self-validation"
                    checked={allowSelfValidation}
                    disabled={patchMutation.isPending}
                    onCheckedChange={(checked) =>
                      patch({ allowSelfValidation: checked })
                    }
                    aria-label="Autoriser l’auto-validation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-validator">Validateur par défaut</Label>
                  <p className="text-xs text-muted-foreground">
                    Appliqué automatiquement si le soumissionnaire ne choisit pas le validateur.
                    Distinct de la liste « autorisés » ci-dessous.
                  </p>
                  <Select
                    value={defaultValidatorId}
                    onValueChange={(value) =>
                      patch({ defaultValidatorUserId: value || null })
                    }
                    disabled={patchMutation.isPending || validatorChoices.length === 0}
                  >
                    <SelectTrigger id="default-validator" className="min-h-11 w-full">
                      <SelectValue placeholder="Choisir un validateur">
                        {defaultValidatorId ? defaultValidatorLabel : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {validatorChoices.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {firstDisplayLabel([user.displayName, user.email], 'Validateur')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validatorChoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun utilisateur avec la permission de revue sur ce client.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Validateurs autorisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Liste vide = tous les utilisateurs disposant de la permission « revue stratégie ».
                  Sinon, seuls les comptes cochés (ou détenant un rôle autorisé) peuvent être
                  désignés.
                </p>
                {potentialValidators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun validateur potentiel.</p>
                ) : (
                  <ul className="space-y-2" aria-label="Validateurs autorisés">
                    {potentialValidators.map((user) => {
                      const checked =
                        authorizedIds.length === 0 ? false : authorizedIds.includes(user.id);
                      const indeterminateEmpty = authorizedIds.length === 0;
                      return (
                        <li
                          key={user.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                        >
                          <span className="text-sm font-medium">{user.displayName}</span>
                          <Switch
                            checked={indeterminateEmpty ? false : checked}
                            disabled={patchMutation.isPending}
                            onCheckedChange={(next) => {
                              if (indeterminateEmpty && next) {
                                if (!allowPick && !defaultValidatorId) {
                                  patch({
                                    authorizedValidatorUserIds: [user.id],
                                    defaultValidatorUserId: user.id,
                                  });
                                  return;
                                }
                                patch({ authorizedValidatorUserIds: [user.id] });
                                return;
                              }
                              toggleAuthorized(user.id, next);
                            }}
                            aria-label={`Autoriser ${user.displayName} comme validateur`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {authorizedIds.length > 0 ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    disabled={patchMutation.isPending}
                    onClick={() => patch({ authorizedValidatorUserIds: [] })}
                  >
                    Réinitialiser (tous les relecteurs autorisés)
                  </button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
