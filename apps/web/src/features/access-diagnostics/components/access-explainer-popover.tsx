'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  getMyEffectiveRights,
  type MyEffectiveRightsIntent,
  type MyEffectiveRightsPayload,
} from '@/services/access-diagnostics';

const CONTROL_LABEL_FR: Record<string, string> = {
  USER_LICENSE: 'Licence utilisateur',
  CLIENT_SUBSCRIPTION: 'Abonnement client',
  CLIENT_MODULE_ENABLED: 'Module activé',
  USER_MODULE_VISIBLE: 'Visibilité module',
  RBAC_PERMISSION: 'Permission métier (RBAC)',
  ORGANIZATION_SCOPE: 'Périmètre organisationnel',
  RESOURCE_OWNERSHIP: 'Propriété organisationnelle',
  RESOURCE_ACCESS_POLICY: 'Politique / ACL (consolidé)',
  RESOURCE_ACL: 'Accès restreint à la ressource (ACL)',
};

function controlStatusLabel(c: MyEffectiveRightsPayload['controls'][0]): string {
  if (c.status === 'pass') {
    if (
      c.evaluationMode === 'superseded_by_decision_engine' ||
      c.evaluationMode === 'informational'
    ) {
      return 'OK (RFC-018)';
    }
    return 'OK';
  }
  if (c.status === 'fail') return 'Bloqué';
  return 'N/A';
}

function formatControls(
  rows: MyEffectiveRightsPayload['controls'],
): { id: string; label: string; status: string; detail: string; foot?: string }[] {
  return rows.map((c) => ({
    id: c.id,
    label: CONTROL_LABEL_FR[c.id] ?? c.id,
    status: controlStatusLabel(c),
    detail: c.message,
    foot:
      c.enforcedForIntent === false
        ? 'Bloc informatif (non contractuel pour write/admin tant que RFC-020).'
        : undefined,
  }));
}

export function AccessExplainerPopover(props: {
  resourceType: string;
  resourceId: string;
  intent?: MyEffectiveRightsIntent;
  /** Libellé ressource affiché en en-tête (valeur métier, pas l’ID). */
  resourceLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const intent = props.intent ?? 'READ';
  const authFetch = useAuthenticatedFetch();

  const q = useQuery({
    queryKey: [
      'access-diagnostics',
      'effective-rights/me',
      props.resourceType,
      props.resourceId,
      intent,
    ],
    queryFn: () =>
      getMyEffectiveRights(authFetch, {
        resourceType: props.resourceType,
        resourceId: props.resourceId,
        intent,
      }),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-muted-foreground"
        aria-label="Comprendre mes droits sur cette ressource"
        data-testid="access-explainer-trigger"
        onClick={() => setOpen(true)}
      >
        <Info className="size-4" aria-hidden />
        <span className="text-xs">Pourquoi ce niveau d’accès ?</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Droits sur la ressource</DialogTitle>
            <DialogDescription>
              {props.resourceLabel} — intention <strong>{intent}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {q.isLoading && <p className="text-muted-foreground">Chargement…</p>}
            {q.isError && (
              <p className="text-destructive text-xs">
                Impossible de charger le diagnostic. Réessayez plus tard.
              </p>
            )}
            {q.data && (
              <>
                <p
                  className={
                    q.data.finalDecision === 'ALLOWED'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : q.data.finalDecision === 'DENIED'
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-muted-foreground'
                  }
                >
                  {q.data.safeMessage}
                </p>
                <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
                  {formatControls(q.data.controls).map((row) => (
                    <li key={row.id} className="rounded border border-border/60 p-2">
                      <div className="flex justify-between gap-2 font-medium">
                        <span>{row.label}</span>
                        <span className="shrink-0 text-muted-foreground">{row.status}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{row.detail}</p>
                      {row.foot && (
                        <p className="mt-1 text-[10px] text-muted-foreground">{row.foot}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
