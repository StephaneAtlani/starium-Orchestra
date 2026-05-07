'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Props {
  filters: CockpitFilters;
  onChange: (next: CockpitFilters) => void;
  subscriptions: Array<
    ClientSubscriptionRow | LicenseUsageSubscriptionRow
  >;
}

export function LicenseCockpitFilters({
  filters,
  onChange,
  subscriptions,
}: Props) {
  return (
    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="cockpit-search">Recherche utilisateur</Label>
        <Input
          id="cockpit-search"
          placeholder="Nom, prénom ou email"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cockpit-status">Statut licence</Label>
        <Select
          value={filters.status}
          onValueChange={(v) =>
            onChange({ ...filters, status: v as CockpitFilters['status'] })
          }
        >
          <SelectTrigger id="cockpit-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="soon">Expire bientôt</SelectItem>
            <SelectItem value="expired">Expirée</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cockpit-mode">Mode</Label>
        <Select
          value={filters.mode}
          onValueChange={(v) => onChange({ ...filters, mode: v ?? 'all' })}
        >
          <SelectTrigger id="cockpit-mode">
            <SelectValue />
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
      </div>
      <div className="space-y-1">
        <Label htmlFor="cockpit-sub">Abonnement</Label>
        <Select
          value={filters.subscriptionId}
          onValueChange={(v) =>
            onChange({ ...filters, subscriptionId: v ?? 'all' })
          }
        >
          <SelectTrigger id="cockpit-sub">
            <SelectValue />
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
      </div>
    </div>
  );
}
