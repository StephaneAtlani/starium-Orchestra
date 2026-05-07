'use client';

import { Card } from '@/components/ui/card';
import {
  aggregateBillingDistribution,
  type LicenseSubject,
} from '../lib/license-status';

interface Props {
  members: LicenseSubject[];
}

export function LicenseBillingDistribution({ members }: Props) {
  const dist = aggregateBillingDistribution(members);
  const total = members.length || 1;
  const rows: { label: string; value: number; tone: string }[] = [
    {
      label: 'Lecture seule',
      value: dist.readOnly,
      tone: 'bg-emerald-500',
    },
    {
      label: 'Facturable client',
      value: dist.clientBillable,
      tone: 'bg-sky-500',
    },
    {
      label: 'Externe (porté hors client)',
      value: dist.externalBillable,
      tone: 'bg-indigo-500',
    },
    {
      label: 'Non facturable (geste commercial)',
      value: dist.nonBillable,
      tone: 'bg-amber-500',
    },
    {
      label: 'Support interne',
      value: dist.platformInternal,
      tone: 'bg-rose-500',
    },
    {
      label: 'Évaluation 30 jours',
      value: dist.evaluation,
      tone: 'bg-violet-500',
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Distribution des licences</h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const pct = Math.round((row.value / total) * 100);
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">
                  {row.value} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${row.tone}`}
                  style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
