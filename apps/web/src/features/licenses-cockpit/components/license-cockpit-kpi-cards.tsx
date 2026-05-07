'use client';

import { Eye, Pencil, FlaskConical, Headset } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import type { LicenseUsageResponse } from '@/features/licenses/api/licenses';
import {
  aggregateBillingDistribution,
  countExpirations,
  type LicenseSubject,
} from '../lib/license-status';

interface Props {
  members: LicenseSubject[];
  usage: LicenseUsageResponse | undefined;
}

function totalSeats(usage: LicenseUsageResponse | undefined): {
  total: number;
  used: number;
} {
  if (!usage) return { total: 0, used: 0 };
  let total = 0;
  let used = 0;
  for (const sub of usage.subscriptions) {
    if (sub.status !== 'ACTIVE') continue;
    total += sub.readWriteSeatsLimit;
    used += sub.readWriteBillableUsed;
  }
  return { total, used };
}

export function LicenseCockpitKpiCards({ members, usage }: Props) {
  const dist = aggregateBillingDistribution(members);
  const exp = countExpirations(members);
  const seats = totalSeats(usage);
  const billableLabel =
    seats.total > 0
      ? `${seats.used} / ${seats.total} sièges`
      : `${dist.clientBillable} licence${dist.clientBillable > 1 ? 's' : ''}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Lecture seule"
        value={String(dist.readOnly)}
        subtitle="Illimité"
        icon={<Eye />}
        variant="dense"
      />
      <KpiCard
        title="Lecture/Écriture facturable"
        value={String(dist.clientBillable)}
        subtitle={billableLabel}
        icon={<Pencil />}
        variant="dense"
      />
      <KpiCard
        title="Évaluations en cours"
        value={String(dist.evaluation)}
        subtitle={
          exp.soon + exp.expired > 0
            ? `${exp.soon} bientôt · ${exp.expired} expirée${exp.expired > 1 ? 's' : ''}`
            : 'Aucune alerte'
        }
        icon={<FlaskConical />}
        variant="dense"
      />
      <KpiCard
        title="Support interne"
        value={String(dist.platformInternal)}
        subtitle={
          dist.externalBillable + dist.nonBillable > 0
            ? `${dist.externalBillable} externe · ${dist.nonBillable} commercial`
            : 'Hors quota client'
        }
        icon={<Headset />}
        variant="dense"
      />
    </div>
  );
}
