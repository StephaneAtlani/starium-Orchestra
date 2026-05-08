'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  assignPlatformUserLicense,
  getPlatformSubscriptions,
  type AssignUserLicensePayload,
  type ClientSubscriptionRow,
  type ClientUserLicenseBillingMode,
  type ClientUserLicenseType,
} from '@/features/licenses/api/licenses';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';
import { ShieldCheckIcon, ChevronDownIcon } from 'lucide-react';

type SubscriptionLite = {
  id: string;
  status: string;
  billingPeriod: string;
  readWriteSeatsLimit: number;
  endsAt: string | null;
  graceEndsAt: string | null;
};

interface PlatformUserClientLink {
  clientId: string;
  clientName: string;
  clientSlug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: string;
  licenseType: ClientUserLicenseType;
  licenseBillingMode: ClientUserLicenseBillingMode;
  subscriptionId: string | null;
  licenseStartsAt: string | null;
  licenseEndsAt: string | null;
  licenseAssignmentReason: string | null;
  subscription: SubscriptionLite | null;
}

const TYPE_LABEL: Record<ClientUserLicenseType, string> = {
  READ_ONLY: 'Lecture seule',
  READ_WRITE: 'Lecture / Écriture',
};

const MODE_LABEL: Record<ClientUserLicenseBillingMode, string> = {
  CLIENT_BILLABLE: 'Facturable client (siège souscrit)',
  NON_BILLABLE: 'Non facturable',
  EXTERNAL_BILLABLE: 'Facturable externe',
  PLATFORM_INTERNAL: 'Support plateforme (interne)',
  EVALUATION: 'Évaluation (durée limitée)',
};

const MODE_HINT: Record<ClientUserLicenseBillingMode, string> = {
  CLIENT_BILLABLE:
    'Consomme un siège facturable de l’abonnement actif sélectionné.',
  NON_BILLABLE: 'Aucun siège consommé. Aucune facturation.',
  EXTERNAL_BILLABLE: 'Facturé hors plateforme (compte tiers / partenaire).',
  PLATFORM_INTERNAL:
    'Accès support / interne plateforme. Date de fin recommandée.',
  EVALUATION: 'Période d’essai. Expire à la date de fin (downgrade auto).',
};

function badgeVariantForMode(
  mode: ClientUserLicenseBillingMode,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (mode) {
    case 'CLIENT_BILLABLE':
      return 'default';
    case 'EVALUATION':
    case 'PLATFORM_INTERNAL':
      return 'outline';
    case 'EXTERNAL_BILLABLE':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function isoToInputDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function inputDateToIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

interface RowProps {
  link: PlatformUserClientLink;
  user: AdminPlatformUserSummary;
  onSaved: () => void;
}

function ClientLicenseRow({ link, user, onSaved }: RowProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [expanded, setExpanded] = useState(false);
  const [licenseType, setLicenseType] = useState<ClientUserLicenseType>(
    link.licenseType,
  );
  const [billingMode, setBillingMode] = useState<ClientUserLicenseBillingMode>(
    link.licenseBillingMode,
  );
  const [subscriptionId, setSubscriptionId] = useState<string | null>(
    link.subscriptionId,
  );
  const [startsAt, setStartsAt] = useState<string>(
    isoToInputDate(link.licenseStartsAt),
  );
  const [endsAt, setEndsAt] = useState<string>(
    isoToInputDate(link.licenseEndsAt),
  );
  const [reason, setReason] = useState<string>(
    link.licenseAssignmentReason ?? '',
  );
  const [subs, setSubs] = useState<ClientSubscriptionRow[] | null>(null);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSubscription =
    licenseType === 'READ_WRITE' && billingMode === 'CLIENT_BILLABLE';
  const requiresEndDate =
    billingMode === 'EVALUATION' || billingMode === 'PLATFORM_INTERNAL';

  useEffect(() => {
    if (!expanded) return;
    if (!needsSubscription) return;
    if (subs) return;
    let cancelled = false;
    setIsLoadingSubs(true);
    setError(null);
    (async () => {
      try {
        const list = await getPlatformSubscriptions(
          authenticatedFetch,
          link.clientId,
        );
        if (!cancelled) {
          setSubs(list);
          if (!subscriptionId) {
            const firstActive = list.find((s) => s.status === 'ACTIVE');
            if (firstActive) setSubscriptionId(firstActive.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Erreur lors du chargement des abonnements',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingSubs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    expanded,
    needsSubscription,
    subs,
    authenticatedFetch,
    link.clientId,
    subscriptionId,
  ]);

  const subOptions = useMemo(() => {
    if (!subs) return [];
    return subs.filter(
      (s) =>
        s.status === 'ACTIVE' ||
        s.status === 'SUSPENDED' ||
        s.id === link.subscriptionId,
    );
  }, [subs, link.subscriptionId]);

  async function handleSave() {
    setError(null);

    if (needsSubscription && !subscriptionId) {
      setError(
        'Sélectionnez un abonnement actif pour une licence facturable client.',
      );
      return;
    }
    if (requiresEndDate && !endsAt) {
      setError(
        'Une date de fin est requise pour ce mode (évaluation / interne).',
      );
      return;
    }

    const payload: AssignUserLicensePayload = {
      licenseType,
      licenseBillingMode: billingMode,
      subscriptionId: needsSubscription ? subscriptionId : null,
      licenseStartsAt: inputDateToIso(startsAt),
      licenseEndsAt: inputDateToIso(endsAt),
      licenseAssignmentReason: reason.trim() ? reason.trim() : null,
    };

    setIsSaving(true);
    try {
      await assignPlatformUserLicense(
        authenticatedFetch,
        link.clientId,
        user.id,
        payload,
      );
      onSaved();
      setExpanded(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de l’enregistrement de la licence',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-border/60 bg-muted/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{link.clientName}</span>
            <span className="text-xs text-muted-foreground">
              {link.clientSlug}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline">{TYPE_LABEL[link.licenseType]}</Badge>
            <Badge variant={badgeVariantForMode(link.licenseBillingMode)}>
              {MODE_LABEL[link.licenseBillingMode]}
            </Badge>
            {link.licenseEndsAt && (
              <span className="text-muted-foreground">
                Expire le {formatDate(link.licenseEndsAt)}
              </span>
            )}
            {link.subscription && (
              <span className="text-muted-foreground">
                · Abo {link.subscription.id.slice(0, 8)} (
                {link.subscription.status})
              </span>
            )}
          </div>
        </div>
        <ChevronDownIcon
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 p-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium">Type de licence</label>
              <Select
                value={licenseType}
                onValueChange={(v) =>
                  setLicenseType(v as ClientUserLicenseType)
                }
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue>{TYPE_LABEL[licenseType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ_ONLY">
                    {TYPE_LABEL.READ_ONLY}
                  </SelectItem>
                  <SelectItem value="READ_WRITE">
                    {TYPE_LABEL.READ_WRITE}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium">Mode de facturation</label>
              <Select
                value={billingMode}
                onValueChange={(v) =>
                  setBillingMode(v as ClientUserLicenseBillingMode)
                }
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue>{MODE_LABEL[billingMode]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'CLIENT_BILLABLE',
                      'NON_BILLABLE',
                      'EXTERNAL_BILLABLE',
                      'PLATFORM_INTERNAL',
                      'EVALUATION',
                    ] as ClientUserLicenseBillingMode[]
                  ).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="rounded bg-muted/60 px-2 py-1 text-[0.7rem] text-muted-foreground">
            {MODE_HINT[billingMode]}
          </p>

          {needsSubscription && (
            <div className="grid gap-1">
              <label className="text-xs font-medium">Abonnement</label>
              {isLoadingSubs ? (
                <p className="text-xs text-muted-foreground">
                  Chargement des abonnements…
                </p>
              ) : subOptions.length === 0 ? (
                <p className="text-xs text-destructive">
                  Aucun abonnement actif sur ce client. Créez-en un dans la
                  section abonnements.
                </p>
              ) : (
                <Select
                  value={subscriptionId ?? ''}
                  onValueChange={(v) => setSubscriptionId(v)}
                >
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue placeholder="Choisir un abonnement">
                      {(() => {
                        const s = subOptions.find(
                          (x) => x.id === subscriptionId,
                        );
                        return s
                          ? `${s.id.slice(0, 8)} · ${s.status} · ${s.readWriteSeatsLimit} sièges`
                          : 'Choisir un abonnement';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {`${s.id.slice(0, 8)} · ${s.status} · ${s.readWriteSeatsLimit} sièges${s.endsAt ? ` · fin ${formatDate(s.endsAt)}` : ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium">Début</label>
              <Input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium">
                Fin{requiresEndDate ? ' *' : ''}
              </label>
              <Input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-8 text-xs"
                required={requiresEndDate}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-medium">Motif d’attribution</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. POC commercial, support N2, accès partenaire…"
              className="h-8 text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setExpanded(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer la licence'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ManageUserLicensesDialog({
  user,
}: {
  user: AdminPlatformUserSummary;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<PlatformUserClientLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authenticatedFetch = useAuthenticatedFetch();

  const reload = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `/api/platform/users/${encodeURIComponent(user.id)}/clients`,
      );
      if (!res.ok) {
        throw new Error('Impossible de charger les licences de cet utilisateur');
      }
      const json = (await res.json()) as {
        assignments?: PlatformUserClientLink[];
      };
      setLinks(Array.isArray(json.assignments) ? json.assignments : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des licences',
      );
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, user.id]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Gérer les licences de cet utilisateur"
          >
            <ShieldCheckIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Licences de l’utilisateur</DialogTitle>
          <DialogDescription>
            Gestion des licences attachées à{' '}
            <span className="font-medium">
              {user.firstName || user.lastName || user.email}
            </span>{' '}
            sur chacun de ses clients. Une licence par client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement des rattachements…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cet utilisateur n’est rattaché à aucun client. Utilisez « Associer
              des clients » d’abord.
            </p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {links.map((link) => (
                <ClientLicenseRow
                  key={link.clientId}
                  link={link}
                  user={user}
                  onSaved={() => void reload()}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
