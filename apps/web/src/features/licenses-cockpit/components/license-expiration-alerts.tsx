'use client';

import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CockpitMember } from '../api/licenses-cockpit';
import {
  getLicenseDisplayLabel,
  getLicenseExpirationStatus,
  isModeWithExpiration,
} from '../lib/license-status';

function memberLabel(m: CockpitMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return name || m.email;
}

interface AlertRow {
  member: CockpitMember;
  kind: 'soon' | 'expired';
  humanLabel: string;
  daysRemaining: number | null;
}

export function LicenseExpirationAlerts({
  members,
}: {
  members: CockpitMember[];
}) {
  const alerts: AlertRow[] = [];
  for (const m of members) {
    if (!isModeWithExpiration(m.licenseBillingMode)) continue;
    const s = getLicenseExpirationStatus(m.licenseEndsAt, m.licenseBillingMode);
    if (s.kind === 'soon' || s.kind === 'expired') {
      alerts.push({
        member: m,
        kind: s.kind,
        humanLabel: s.humanLabel,
        daysRemaining: s.daysRemaining,
      });
    }
  }
  alerts.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  if (alerts.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="mb-1 text-sm font-medium">Alertes d&apos;expiration</h3>
        <p className="text-xs text-muted-foreground">
          Aucune licence à risque dans les 14 prochains jours.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
        <h3 className="text-sm font-medium">Alertes d&apos;expiration</h3>
        <Badge variant="outline" className="ml-auto">
          {alerts.length}
        </Badge>
      </div>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li
            key={a.member.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">{memberLabel(a.member)}</span>
              <span className="text-xs text-muted-foreground">
                {a.member.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {getLicenseDisplayLabel(
                  a.member.licenseType,
                  a.member.licenseBillingMode,
                )}
              </Badge>
              <Badge
                variant={a.kind === 'expired' ? 'destructive' : 'outline'}
                className={
                  a.kind === 'soon'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : ''
                }
              >
                {a.humanLabel}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
