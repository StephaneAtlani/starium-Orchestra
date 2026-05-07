'use client';

import { Building2, FlaskConical, Headset, KeyRound, Pencil } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import type { LicenseReportingOverview } from '../api/license-reporting';

interface Props {
  overview: LicenseReportingOverview | undefined;
}

function fmt(n: number | undefined): string {
  if (n === undefined) return '—';
  return n.toLocaleString('fr-FR');
}

export function LicenseReportingKpiCards({ overview }: Props) {
  const seats = overview?.seats;
  const subs = overview?.subscriptions;
  const lic = overview?.licenses;

  const seatLabel =
    seats && seats.readWriteBillableLimit > 0
      ? `${fmt(seats.readWriteBillableUsed)} / ${fmt(seats.readWriteBillableLimit)} sièges`
      : `${fmt(seats?.readWriteBillableUsed)} sièges utilisés`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Clients suivis"
        value={fmt(overview?.totals.clients)}
        subtitle={`${fmt(overview?.totals.clientUsersActive)} membres actifs`}
        icon={<Building2 />}
        variant="dense"
      />
      <KpiCard
        title="Sièges Lecture/Écriture facturables"
        value={fmt(seats?.readWriteBillableUsed)}
        subtitle={seatLabel}
        icon={<Pencil />}
        variant="dense"
      />
      <KpiCard
        title="Abonnements actifs"
        value={fmt(subs?.active)}
        subtitle={
          subs
            ? `${fmt(subs.suspended)} suspendus · ${fmt(subs.expired)} expirés (${fmt(
                subs.expiredInGrace,
              )} en grâce)`
            : ''
        }
        icon={<KeyRound />}
        variant="dense"
      />
      <KpiCard
        title="Évaluations en cours"
        value={fmt(lic?.evaluationActive)}
        subtitle={
          lic
            ? `${fmt(lic.evaluationExpired)} expirées · ${fmt(
                lic.platformInternalActive,
              )} support interne`
            : ''
        }
        icon={<FlaskConical />}
        variant="dense"
      />
      <KpiCard
        title="Lecture seule"
        value={fmt(lic?.readOnly)}
        subtitle="Illimité"
        icon={<KeyRound />}
        variant="dense"
      />
      <KpiCard
        title="Geste commercial"
        value={fmt(lic?.nonBillable)}
        subtitle={`${fmt(lic?.externalBillable)} externe (porté hors client)`}
        icon={<Pencil />}
        variant="dense"
      />
      <KpiCard
        title="Support interne actif"
        value={fmt(lic?.platformInternalActive)}
        subtitle={`${fmt(lic?.platformInternalExpired)} expiré`}
        icon={<Headset />}
        variant="dense"
      />
      <KpiCard
        title="Abonnements brouillon / annulés"
        value={`${fmt(subs?.draft)} / ${fmt(subs?.canceled)}`}
        subtitle="Non productifs commercialement"
        icon={<KeyRound />}
        variant="dense"
      />
    </div>
  );
}
