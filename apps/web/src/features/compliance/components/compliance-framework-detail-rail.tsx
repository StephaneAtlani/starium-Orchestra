'use client';

import { Button } from '@/components/ui/button';
import type { ComplianceFrameworkOverviewApi } from '../api/compliance.api';
import { buildStatusSlices } from '../lib/compliance-framework-ui';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';

const DONUT_SIZE = 130;
const DONUT_STROKE = 18;
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_C = 2 * Math.PI * DONUT_R;

export function ComplianceFrameworkDetailRail({
  overview,
  onOpenRemediation,
}: {
  overview: ComplianceFrameworkOverviewApi;
  onOpenRemediation: () => void;
}) {
  const slices = buildStatusSlices(overview).filter((s) => s.count > 0);
  const total = slices.reduce((acc, s) => acc + s.count, 0);
  const gapCount =
    overview.partiallyCompliantCount + overview.nonCompliantCount;

  let acc = 0;
  const arcs =
    total > 0
      ? slices.map((s) => {
          const frac = s.count / total;
          const len = DONUT_C * frac;
          const offset = -acc * DONUT_C;
          acc += frac;
          return { ...s, len, offset };
        })
      : [];

  return (
    <aside className="space-y-3" aria-label="Synthèse du référentiel">
      <section className="starium-section space-y-3 p-4">
        <h3 className="text-sm font-semibold text-foreground">Répartition</h3>
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune donnée de répartition.
          </p>
        ) : (
          <>
            <div className="relative mx-auto" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
              <svg
                width={DONUT_SIZE}
                height={DONUT_SIZE}
                viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                role="img"
                aria-label={
                  overview.compliancePercent == null
                    ? 'Taux non calculable'
                    : `Taux de conformité ${overview.compliancePercent} %`
                }
              >
                <circle
                  cx={DONUT_SIZE / 2}
                  cy={DONUT_SIZE / 2}
                  r={DONUT_R}
                  fill="none"
                  stroke="var(--neutral-100)"
                  strokeWidth={DONUT_STROKE}
                />
                {arcs.map((a) => (
                  <circle
                    key={a.key}
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_R}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={DONUT_STROKE}
                    strokeDasharray={`${a.len.toFixed(1)} ${(DONUT_C - a.len).toFixed(1)}`}
                    strokeDashoffset={a.offset.toFixed(1)}
                    transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={cn(
                    'text-lg font-extrabold tabular-nums',
                    overview.compliancePercent == null
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                  )}
                >
                  {overview.compliancePercent == null
                    ? '—'
                    : `${overview.compliancePercent} %`}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Conforme
                </span>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm">
              {buildStatusSlices(overview).map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden
                    />
                    {s.label}
                  </span>
                  <span className="font-bold tabular-nums text-foreground">{s.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="starium-section space-y-3 p-4">
        <h3 className="text-sm font-semibold text-foreground">Couverture par domaine</h3>
        {overview.domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun domaine.</p>
        ) : (
          <ul className="space-y-3">
            {overview.domains.map((d) => {
              const pct = d.compliancePercent;
              const width = pct == null ? 0 : Math.min(100, Math.max(0, pct));
              return (
                <li key={d.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">
                      {displayLabel(d.label, 'Domaine')}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pct == null ? 'Non calculable' : `${pct} %`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    {pct != null ? (
                      <span
                        className="block h-full rounded-full bg-[color:var(--brand-gold)]"
                        style={{ width: `${width}%` }}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="starium-section space-y-3 p-4">
        <h3 className="text-sm font-semibold text-foreground">Évaluation</h3>
        <p className="text-sm text-muted-foreground">
          {gapCount > 0
            ? `${gapCount} écart${gapCount > 1 ? 's' : ''} ou partiel${gapCount > 1 ? 's' : ''} à traiter.`
            : 'Aucun écart ouvert sur ce référentiel.'}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:min-h-9"
          disabled={gapCount === 0}
          onClick={onOpenRemediation}
        >
          Voir le plan de remédiation
        </Button>
      </section>
    </aside>
  );
}
