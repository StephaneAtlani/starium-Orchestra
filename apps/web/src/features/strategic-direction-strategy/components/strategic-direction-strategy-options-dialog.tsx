'use client';

import { Settings2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  usePatchStrategicDirectionStrategyWorkflowSettingsMutation,
  useStrategicDirectionStrategyWorkflowSettingsQuery,
} from '../hooks/use-strategic-direction-strategy-queries';
import { toast } from '@/lib/toast';
import { firstDisplayLabel } from '@/lib/display-label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StrategicDirectionStrategyOptionsDialog({ open, onOpenChange }: Props) {
  const { activeClient } = useActiveClient();
  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';

  const settingsQ = useStrategicDirectionStrategyWorkflowSettingsQuery({
    enabled: open && Boolean(activeClient?.id) && isClientAdmin,
  });
  const patchMutation = usePatchStrategicDirectionStrategyWorkflowSettingsMutation();

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
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Options — Stratégie de direction"
      description="Circuit de validation et auto-validation des schémas directeurs."
      icon={Settings2}
      size="xl"
      contentClassName="sm:max-w-2xl"
      footer={
        <Button
          type="button"
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenChange(false)}
        >
          Fermer
        </Button>
      }
    >
      {!isClientAdmin ? (
        <Alert variant="destructive">
          <AlertTitle>Réservé à l’administrateur client</AlertTitle>
          <AlertDescription>
            Seul un administrateur client peut configurer le circuit de validation des stratégies.
          </AlertDescription>
        </Alert>
      ) : settingsQ.isLoading ? (
        <LoadingState />
      ) : settingsQ.isError ? (
        <ErrorState
          message="Impossible de charger les options du module."
          onRetry={() => void settingsQ.refetch()}
        />
      ) : (
        <div className="starium-form space-y-6">
          <section className="space-y-4" aria-labelledby="stg-opt-circuit">
            <h3 id="stg-opt-circuit" className="starium-modal-seg-title">
              Circuit de validation
            </h3>

            <div className="starium-form-field flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
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

            <div className="starium-form-field flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="allow-self-validation">Autoriser l’auto-validation</Label>
                <p className="text-xs text-muted-foreground">
                  Si activé, le soumissionnaire peut valider ou refuser sa propre stratégie (utile
                  en démo / mono-utilisateur). Désactivé par défaut (séparation des rôles).
                </p>
              </div>
              <Switch
                id="allow-self-validation"
                checked={allowSelfValidation}
                disabled={patchMutation.isPending}
                onCheckedChange={(checked) => patch({ allowSelfValidation: checked })}
                aria-label="Autoriser l’auto-validation"
              />
            </div>

            <div className="starium-form-field space-y-2">
              <Label htmlFor="default-validator">Validateur par défaut</Label>
              <p className="text-xs text-muted-foreground">
                Appliqué automatiquement si le soumissionnaire ne choisit pas le validateur.
                Distinct de la liste « autorisés » ci-dessous.
              </p>
              <Select
                value={defaultValidatorId}
                onValueChange={(value) => patch({ defaultValidatorUserId: value || null })}
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
          </section>

          <section className="space-y-3" aria-labelledby="stg-opt-validators">
            <h3 id="stg-opt-validators" className="starium-modal-seg-title">
              Validateurs autorisés
            </h3>
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
                      className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {firstDisplayLabel([user.displayName, user.email], 'Validateur')}
                      </span>
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
                        aria-label={`Autoriser ${firstDisplayLabel([user.displayName, user.email], 'ce validateur')} comme validateur`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {authorizedIds.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-0 text-muted-foreground underline-offset-4 hover:underline sm:min-h-9"
                disabled={patchMutation.isPending}
                onClick={() => patch({ authorizedValidatorUserIds: [] })}
              >
                Réinitialiser (tous les relecteurs autorisés)
              </Button>
            ) : null}
          </section>
        </div>
      )}
    </StariumModal>
  );
}
