'use client';

import { CalendarDays } from 'lucide-react';
import { ComplianceGaugeRing } from './compliance-gauge-ring';
import type { ComplianceFrameworkOverviewApi } from '../api/compliance.api';
import {
  buildStatusSlices,
  formatAuditMonthYear,
  frameworkInitials,
} from '../lib/compliance-framework-ui';
import { displayLabel } from '@/lib/display-label';

export function ComplianceFrameworkDetailHero({
  overview,
}: {
  overview: ComplianceFrameworkOverviewApi;
}) {
  const { framework } = overview;
  const audit = formatAuditMonthYear(framework.nextAuditAt);
  const slices = buildStatusSlices(overview);
  const total = overview.requirementCount;
  const name = displayLabel(framework.name, 'Référentiel');

  return (
    <section className="starium-section space-y-4 p-4 sm:p-5" aria-labelledby="fw-detail-title">
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-gold-050)] px-1 text-sm font-extrabold tracking-tight text-[color:var(--brand-gold-700)]"
        >
          {frameworkInitials(framework.name)}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 id="fw-detail-title" className="text-lg font-bold text-foreground sm:text-xl">
            {name}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {displayLabel(framework.version, '')}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {overview.requirementCount} exigence
            {overview.requirementCount > 1 ? 's' : ''}
            {framework.isActive ? '' : ' · inactif'}
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {audit ? `Prochaine échéance : ${audit}` : 'Audit non planifié'}
          </p>
        </div>
        <ComplianceGaugeRing
          percent={overview.compliancePercent}
          label={`Taux de conformité ${name}`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Répartition</p>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune exigence dans ce référentiel.</p>
        ) : (
          <>
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={slices
                .filter((s) => s.count > 0)
                .map((s) => `${s.label} ${s.count}`)
                .join(', ')}
            >
              {slices.map((s) =>
                s.count > 0 ? (
                  <span
                    key={s.key}
                    className="h-full"
                    style={{
                      width: `${(100 * s.count) / total}%`,
                      backgroundColor: s.color,
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {slices.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  {s.label}{' '}
                  <span className="font-bold tabular-nums text-foreground">{s.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
