'use client';

import { AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComplianceDashboardApi } from '../api/compliance.api';

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count > 1 ? plural : singular;
}

export function ComplianceKpiStrip({
  dashboard,
  isLoading,
}: {
  dashboard: ComplianceDashboardApi | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !dashboard) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  const gaps = dashboard.nonCompliantCount + dashboard.partiallyCompliantCount;

  return (
    <section className="space-y-2" aria-labelledby="compliance-kpi-heading">
      <div>
        <h2 id="compliance-kpi-heading" className="text-sm font-semibold text-foreground">
          Synthèse de la conformité
        </h2>
        <p className="text-xs text-muted-foreground">
          Référentiels actifs — taux calculé sur les exigences évaluées (hors non
          applicables).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Taux de conformité"
          value={
            dashboard.compliancePercent == null ? '—' : `${dashboard.compliancePercent} %`
          }
          footer={
            dashboard.evaluatedCount > 0
              ? `sur ${dashboard.evaluatedCount} ${pluralize(dashboard.evaluatedCount, 'exigence évaluée', 'exigences évaluées')}`
              : 'aucune exigence évaluée'
          }
          footerTone={dashboard.compliancePercent == null ? 'muted' : 'success'}
          icon={<ShieldCheck aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Contrôles conformes"
          value={String(dashboard.compliantCount)}
          footer={`sur ${dashboard.totalRequirementsActiveFrameworks} ${pluralize(dashboard.totalRequirementsActiveFrameworks, 'exigence')}`}
          footerTone="info"
          icon={<CheckCircle2 aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Écarts ouverts"
          value={String(gaps)}
          footer={
            dashboard.notAssessedRequirementCount > 0
              ? `${dashboard.notAssessedRequirementCount} non ${pluralize(dashboard.notAssessedRequirementCount, 'évaluée', 'évaluées')}`
              : 'partiels et non conformes'
          }
          footerTone={gaps > 0 ? 'warning' : 'muted'}
          icon={<AlertTriangle aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Risques critiques liés"
          value={String(dashboard.criticalRisksLinked)}
          footer={
            dashboard.criticalRisksLinked > 0
              ? 'action immédiate'
              : 'aucun risque critique rattaché'
          }
          footerTone={dashboard.criticalRisksLinked > 0 ? 'danger' : 'muted'}
          icon={<ShieldAlert aria-hidden />}
          iconWrapperClassName="bg-destructive/10 text-destructive"
        />
      </div>
    </section>
  );
}
