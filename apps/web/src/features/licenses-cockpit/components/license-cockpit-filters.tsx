'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import type {
  ClientSubscriptionRow,
  LicenseUsageSubscriptionRow,
} from '@/features/licenses/api/licenses';

export interface CockpitFilters {
  search: string;
  /** `__all__` = pas de filtre. */
  status: 'all' | 'active' | 'soon' | 'expired';
  /** `__all__` = pas de filtre. */
  mode: 'all' | 'READ_ONLY' | string;
  /** `__all__` = pas de filtre, sinon `subscriptionId`. */
  subscriptionId: string;
}

export const initialFilters: CockpitFilters = {
  search: '',
  status: 'all',
  mode: 'all',
  subscriptionId: 'all',
};

function subscriptionLabel(
  sub: ClientSubscriptionRow | LicenseUsageSubscriptionRow,
): string {
  const status =
    sub.status === 'ACTIVE'
      ? 'Actif'
      : sub.status === 'SUSPENDED'
        ? 'Suspendu'
        : sub.status === 'CANCELED'
          ? 'Annulé'
          : sub.status === 'EXPIRED'
            ? 'Expiré'
            : 'Brouillon';
  const seats =
    'readWriteSeatsLimit' in sub
      ? `${sub.readWriteSeatsLimit} sièges`
      : '0 siège';
  if ('startsAt' in sub && sub.startsAt) {
    const date = new Date(sub.startsAt).toLocaleDateString('fr-FR');
    return `${status} · ${seats} · début ${date}`;
  }
  return `${status} · ${seats}`;
}

const STATUS_LABELS: Record<CockpitFilters['status'], string> = {
  all: 'Tous',
  active: 'Actives',
  soon: 'Expire bientôt',
  expired: 'Expirée',
};

const MODE_LABELS: Record<string, string> = {
  all: 'Tous',
  READ_ONLY: 'Lecture seule',
  CLIENT_BILLABLE: 'Facturable',
  EXTERNAL_BILLABLE: 'Externe',
  NON_BILLABLE: 'Non facturable',
  PLATFORM_INTERNAL: 'Support interne',
  EVALUATION: 'Évaluation',
};

interface Props {
  filters: CockpitFilters;
  onChange: (next: CockpitFilters) => void;
  subscriptions: Array<ClientSubscriptionRow | LicenseUsageSubscriptionRow>;
}

export function LicenseCockpitFilters({
  filters,
  onChange,
  subscriptions,
}: Props) {
  const subscriptionLabelValue =
    filters.subscriptionId === 'all'
      ? 'Tous'
      : (() => {
          const sub = subscriptions.find((s) => s.id === filters.subscriptionId);
          return sub ? subscriptionLabel(sub) : 'Abonnement';
        })();

  return (
    <FilterBar aria-label="Filtres cockpit licences" asSearch desktopColumns={4}>
      <FilterBarField id="cockpit-search" label="Recherche utilisateur">
        {({ controlId }) => (
          <Input
            id={controlId}
            className="w-full"
            placeholder="Nom, prénom ou email"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        )}
      </FilterBarField>
      <FilterBarField id="cockpit-status" label="Statut licence">
        {({ controlId, labelId }) => (
          <Select
            value={filters.status}
            onValueChange={(v) =>
              onChange({ ...filters, status: v as CockpitFilters['status'] })
            }
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{STATUS_LABELS[filters.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="soon">Expire bientôt</SelectItem>
              <SelectItem value="expired">Expirée</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
      <FilterBarField id="cockpit-mode" label="Mode">
        {({ controlId, labelId }) => (
          <Select
            value={filters.mode}
            onValueChange={(v) => onChange({ ...filters, mode: v ?? 'all' })}
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{MODE_LABELS[filters.mode] ?? filters.mode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="READ_ONLY">Lecture seule</SelectItem>
              <SelectItem value="CLIENT_BILLABLE">Facturable</SelectItem>
              <SelectItem value="EXTERNAL_BILLABLE">Externe</SelectItem>
              <SelectItem value="NON_BILLABLE">Non facturable</SelectItem>
              <SelectItem value="PLATFORM_INTERNAL">Support interne</SelectItem>
              <SelectItem value="EVALUATION">Évaluation</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
      <FilterBarField id="cockpit-sub" label="Abonnement">
        {({ controlId, labelId }) => (
          <Select
            value={filters.subscriptionId}
            onValueChange={(v) =>
              onChange({ ...filters, subscriptionId: v ?? 'all' })
            }
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{subscriptionLabelValue}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {subscriptions.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {subscriptionLabel(sub)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
    </FilterBar>
  );
}
