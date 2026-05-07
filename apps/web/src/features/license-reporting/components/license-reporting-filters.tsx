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
import {
  LICENSE_BILLING_MODE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from '../lib/labels';

export type ClientOption = { id: string; name: string; slug: string };

export interface LicenseReportingFiltersUi {
  clientId: string;
  licenseBillingMode: string;
  subscriptionStatus: string;
  from: string;
  to: string;
}

export const initialReportingFilters: LicenseReportingFiltersUi = {
  clientId: 'all',
  licenseBillingMode: 'all',
  subscriptionStatus: 'all',
  from: '',
  to: '',
};

interface Props {
  filters: LicenseReportingFiltersUi;
  onChange: (next: LicenseReportingFiltersUi) => void;
  clients: ClientOption[];
  showPeriod: boolean;
}

export function LicenseReportingFilters({
  filters,
  onChange,
  clients,
  showPeriod,
}: Props) {
  return (
    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="lr-client">Client</Label>
        <Select
          value={filters.clientId}
          onValueChange={(v) => onChange({ ...filters, clientId: v ?? 'all' })}
        >
          <SelectTrigger id="lr-client">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="lr-mode">Mode de licence</Label>
        <Select
          value={filters.licenseBillingMode}
          onValueChange={(v) =>
            onChange({ ...filters, licenseBillingMode: v ?? 'all' })
          }
        >
          <SelectTrigger id="lr-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(LICENSE_BILLING_MODE_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="lr-sub-status">Statut abonnement</Label>
        <Select
          value={filters.subscriptionStatus}
          onValueChange={(v) =>
            onChange({ ...filters, subscriptionStatus: v ?? 'all' })
          }
        >
          <SelectTrigger id="lr-sub-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showPeriod ? (
        <div className="grid gap-1 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="lr-from">Période — début</Label>
            <Input
              id="lr-from"
              type="month"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lr-to">Période — fin</Label>
            <Input
              id="lr-to"
              type="month"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
