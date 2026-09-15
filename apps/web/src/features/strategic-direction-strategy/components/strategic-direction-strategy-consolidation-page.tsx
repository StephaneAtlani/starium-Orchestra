'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Columns2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import {
  StrategicAxisNameLabel,
} from '@/features/strategic-vision/components/strategic-axis-name-label';
import { cn } from '@/lib/utils';
import {
  useStrategicDirectionStrategyCompareQuery,
  useStrategicDirectionStrategyConsolidationQuery,
  useStrategicDirectionStrategyPortfolioQuery,
} from '../hooks/use-strategic-direction-strategy-queries';
import type { ConsolidationDto, StrategyInitiative } from '../types/strategic-direction-strategy.types';
import { getStrategicDirectionStrategyStatusLabel } from '../lib/strategic-direction-strategy-labels';
import {
  formatEurCents,
  formatReviewDate,
  MATURITY_DIMS,
  overlapSeverityLabel,
  progressFillColor,
  stgBarPct,
  stgHeat,
  stgQuarterLabel,
  stgTone,
} from '../lib/strategie-ui';
import '../styles/strategie.css';

type Props = { alignedVisionId: string | null };

function HeatCell({ value, title }: { value: number | null | undefined; title?: string }) {
  const h = stgHeat(value);
  return (
    <div
      className={cn('stg-heat', h.empty && 'empty')}
      style={h.empty ? undefined : { background: h.bg, color: h.c }}
      title={title}
    >
      {h.t}
    </div>
  );
}

function TimelineBars({
  data,
  startYear,
  yearCount,
  nowMonthOffset,
}: {
  data: ConsolidationDto['timeline'];
  startYear: number;
  yearCount: number;
  nowMonthOffset: number;
}) {
  const totalMonths = Math.max(1, yearCount * 12);
  const years = Array.from({ length: yearCount }, (_, i) => startYear + i);

  if (data.length === 0) {
    return <div className="stg-empty">Aucun chantier planifié sur l’horizon.</div>;
  }

  return (
    <div className="card stg-tl">
      <div className="stg-tl-row" style={{ ['--stg-ny' as string]: yearCount }}>
        <div />
        <div className="stg-tl-years" style={{ ['--stg-ny' as string]: yearCount }}>
          {years.map((y) => (
            <div key={y} className="stg-tl-year">
              {y}
            </div>
          ))}
        </div>
      </div>
      {data.map((lane) => {
        const T = stgTone(lane.accentTone);
        return (
          <div key={lane.directionId}>
            <div className="stg-tl-lane-h">
              <i style={{ background: T.c }} aria-hidden />
              {displayLabel(lane.directionCode, 'Direction')} —{' '}
              {displayLabel(lane.directionName, 'Direction')}
            </div>
            {lane.initiatives.length === 0 ? (
              <div className="stg-empty">Aucun chantier pour cette direction.</div>
            ) : (
              lane.initiatives.map((init) => (
                <InitiativeTimelineRow
                  key={init.id}
                  initiative={init}
                  color={T.c}
                  startYear={startYear}
                  totalMonths={totalMonths}
                  nowMonthOffset={nowMonthOffset}
                  href={
                    lane.strategyId
                      ? `/strategic-direction-strategy/${lane.strategyId}`
                      : null
                  }
                />
              ))
            )}
          </div>
        );
      })}
      <div className="stg-tl-legend">
        {data.map((lane) => {
          const T = stgTone(lane.accentTone);
          return (
            <span key={lane.directionId} className="k">
              <i style={{ background: T.c }} aria-hidden />
              {displayLabel(lane.directionCode, 'Direction')}
            </span>
          );
        })}
        <span className="k">
          <span className="dia" aria-hidden />
          Jalon structurant
        </span>
      </div>
    </div>
  );
}

function InitiativeTimelineRow({
  initiative,
  color,
  startYear,
  totalMonths,
  nowMonthOffset,
  href,
}: {
  initiative: StrategyInitiative;
  color: string;
  startYear: number;
  totalMonths: number;
  nowMonthOffset: number;
  href?: string | null;
}) {
  const left = stgBarPct(initiative.startMonthOffset, totalMonths);
  const width = stgBarPct(
    Math.max(1, initiative.endMonthOffset - initiative.startMonthOffset),
    totalMonths,
  );
  const title = `${displayLabel(initiative.title, 'Chantier')} · ${stgQuarterLabel(initiative.startMonthOffset, startYear)} → ${stgQuarterLabel(Math.max(0, initiative.endMonthOffset - 1), startYear)}`;

  const body = (
    <>
      <div>
        <div className="stg-tl-name">{displayLabel(initiative.title, 'Chantier')}</div>
        <div className="stg-tl-nsub">
          {firstDisplayLabel([initiative.ownerLabel], 'Pilote non renseigné')} ·{' '}
          {formatEurCents(initiative.budgetCents)}
        </div>
      </div>
      <div className="stg-tl-track" style={{ ['--stg-nq' as string]: 12 }}>
        <div
          className="stg-tl-bar"
          style={{ left: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%`, background: color }}
          title={title}
        >
          <i style={{ width: `${initiative.progressPct}%` }} aria-hidden />
          <span>{initiative.progressPct}%</span>
        </div>
        {(initiative.milestones ?? []).map((m, idx) => (
          <div
            key={`${initiative.id}-ms-${idx}`}
            className="stg-tl-ms"
            style={{ left: `${stgBarPct(m.monthOffset, totalMonths).toFixed(2)}%` }}
            title={`${displayLabel(m.label, 'Jalon')} — ${stgQuarterLabel(m.monthOffset, startYear)}`}
          />
        ))}
        <div
          className="stg-tl-now"
          style={{ left: `${stgBarPct(nowMonthOffset, totalMonths).toFixed(2)}%` }}
          aria-hidden
        />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="stg-tl-row stg-tl-lane block no-underline text-inherit hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-gold)]"
        aria-label={`Ouvrir le schéma — ${displayLabel(initiative.title, 'Chantier')}`}
      >
        {body}
      </Link>
    );
  }

  return <div className="stg-tl-row stg-tl-lane">{body}</div>;
}

export function StrategicDirectionStrategyConsolidationPage({ alignedVisionId }: Props) {
  const router = useRouter();
  const consolidationQuery = useStrategicDirectionStrategyConsolidationQuery({
    alignedVisionId,
  });
  const portfolioQuery = useStrategicDirectionStrategyPortfolioQuery({
    alignedVisionId,
  });

  const [compareOpen, setCompareOpen] = useState(false);
  const [dirA, setDirA] = useState<string>('');
  const [dirB, setDirB] = useState<string>('');

  const data = consolidationQuery.data;
  const strategyByDirection = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of portfolioQuery.data ?? []) {
      if (card.strategyId) map.set(card.directionId, card.strategyId);
    }
    return map;
  }, [portfolioQuery.data]);

  const strategyIdA = dirA ? strategyByDirection.get(dirA) ?? null : null;
  const strategyIdB = dirB ? strategyByDirection.get(dirB) ?? null : null;

  const compareQuery = useStrategicDirectionStrategyCompareQuery(strategyIdA, strategyIdB, {
    enabled: compareOpen && Boolean(strategyIdA) && Boolean(strategyIdB),
  });

  const openCompare = () => {
    const rows = data?.matrix ?? [];
    setDirA(rows[0]?.directionId ?? '');
    setDirB(rows[1]?.directionId ?? rows[0]?.directionId ?? '');
    setCompareOpen(true);
  };

  if (consolidationQuery.isLoading) {
    return <LoadingState />;
  }
  if (consolidationQuery.isError) {
    return (
      <ErrorState
        message="Impossible de charger le consolidé"
        onRetry={() => void consolidationQuery.refetch()}
      />
    );
  }
  if (!data || data.matrix.length === 0) {
    return (
      <EmptyState
        title="Aucun schéma à consolider"
        description="Créez des stratégies de direction alignées sur la vision active pour alimenter le consolidé groupe."
      />
    );
  }

  const { kpis } = data;
  const totalMonths = Math.max(1, data.horizonYearCount * 12);
  const years = Array.from(
    { length: data.horizonYearCount },
    (_, i) => data.horizonStartYear + i,
  );
  const horizonLbl = `${data.horizonStartYear}–${data.horizonStartYear + data.horizonYearCount - 1}`;

  const rowA = data.matrix.find((r) => r.directionId === dirA);
  const rowB = data.matrix.find((r) => r.directionId === dirB);
  const matA = data.maturity.find((r) => r.directionId === dirA);
  const matB = data.maturity.find((r) => r.directionId === dirB);
  const tlA = data.timeline.find((r) => r.directionId === dirA);
  const tlB = data.timeline.find((r) => r.directionId === dirB);

  return (
    <div>
      <div className="stg-kpis">
        <div className="stg-kpi">
          <div className="l">Directions</div>
          <div className="v">{kpis.directionsCount}</div>
          <div className="d">
            {kpis.approvedCount} schéma{kpis.approvedCount > 1 ? 's' : ''} validé
            {kpis.approvedCount > 1 ? 's' : ''}
          </div>
        </div>
        <div className="stg-kpi">
          <div className="l">Chantiers consolidés</div>
          <div className="v">{kpis.initiativesCount}</div>
          <div className="d">{kpis.initiativesInProgress} en cours</div>
        </div>
        <div className="stg-kpi">
          <div className="l">Budget horizon {horizonLbl}</div>
          <div className="v">
            {displayLabel(kpis.budgetHorizonLabel, formatEurCents(kpis.budgetHorizonCents))}
          </div>
          <div className="d">toutes directions</div>
        </div>
        <div className="stg-kpi">
          <div className="l">Alignement moyen</div>
          <div className="v">
            {kpis.averageAlignmentScore != null ? `${kpis.averageAlignmentScore}%` : '—'}
          </div>
          <div className="d">
            {kpis.overlapsCount > 0
              ? `${kpis.overlapsCount} recouvrement${kpis.overlapsCount > 1 ? 's' : ''} détecté${kpis.overlapsCount > 1 ? 's' : ''}`
              : 'aucun recouvrement'}
          </div>
        </div>
      </div>

      <section className="stg-sec">
        <div className="stg-sec-head">
          <div>
            <div className="stg-sec-t">Matrice directions × axes du groupe</div>
            <div className="stg-sec-sub">
              Contribution déclarée de chaque direction aux axes de la vision groupe. Le nombre de
              chantiers rattachés est indiqué sous chaque valeur.
            </div>
          </div>
          <Button type="button" variant="outline" className="min-h-11" onClick={openCompare}>
            <Columns2 className="size-4" aria-hidden />
            Comparer deux directions
          </Button>
        </div>
        <div className="card card-pad overflow-x-auto">
          <table className="stg-mx">
            <thead>
              <tr>
                <th className="rowh">Direction</th>
                {data.visionAxes.map((a) => (
                  <th key={a.id}>
                    <StrategicAxisNameLabel name={a.name} iconClassName="size-3.5 shrink-0" />
                  </th>
                ))}
                <th className="score">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row) => {
                const T = stgTone(row.accentTone);
                return (
                  <tr key={row.directionId}>
                    <td className="rowh">
                      <span
                        className="stg-chip"
                        style={{ background: T.bg, color: T.c, marginRight: 7 }}
                      >
                        {displayLabel(row.directionCode, 'Direction')}
                      </span>
                      {displayLabel(row.directionName, 'Direction')}
                      <div className="s">
                        {displayLabel(row.sponsorLabel, 'Sponsor non renseigné')}
                      </div>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.axisId}>
                        <HeatCell
                          value={cell.contributionPct}
                          title={`${cell.initiativesCount} chantier(s) rattaché(s)`}
                        />
                        <div className="stg-mx-sub">
                          {cell.initiativesCount ? `${cell.initiativesCount} ch.` : '—'}
                        </div>
                      </td>
                    ))}
                    <td className="score">
                      <HeatCell value={row.score} title="Score d’alignement" />
                      <div className="stg-mx-sub" aria-hidden>
                        &nbsp;
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stg-sec">
        <div className="stg-sec-t">Maturité des schémas directeurs</div>
        <div className="stg-sec-sub" style={{ marginBottom: 12 }}>
          Complétude calculée sur six dimensions : ambition, objectifs, chantiers, budget, risques,
          fraîcheur de revue.
        </div>
        <div className="card card-pad overflow-x-auto">
          <table className="stg-mx">
            <thead>
              <tr>
                <th className="rowh">Direction</th>
                {MATURITY_DIMS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.maturity.map((row) => {
                const T = stgTone(row.accentTone);
                return (
                  <tr key={row.directionId}>
                    <td className="rowh">
                      <span
                        className="stg-chip"
                        style={{ background: T.bg, color: T.c, marginRight: 7 }}
                      >
                        {displayLabel(row.directionCode, 'Direction')}
                      </span>
                      {displayLabel(row.directionName, 'Direction')}
                    </td>
                    {MATURITY_DIMS.map((dim) => (
                      <td key={dim}>
                        <HeatCell value={row.maturity[dim]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stg-sec">
        <div className="stg-sec-t">Timeline groupe — tous les schémas directeurs superposés</div>
        <div className="stg-sec-sub" style={{ marginBottom: 12 }}>
          Une ligne par chantier, regroupée par direction.
        </div>
        <TimelineBars
          data={data.timeline}
          startYear={data.horizonStartYear}
          yearCount={data.horizonYearCount}
          nowMonthOffset={data.nowMonthOffset}
        />
      </section>

      <section className="stg-sec">
        <div className="stg-sec-t">Portefeuille consolidé de chantiers</div>
        <div className="stg-sec-sub" style={{ marginBottom: 12 }}>
          {data.portfolioInitiatives.length} chantier
          {data.portfolioInitiatives.length > 1 ? 's' : ''} issu
          {data.portfolioInitiatives.length > 1 ? 's' : ''} des schémas directeurs.
        </div>
        {data.portfolioInitiatives.length === 0 ? (
          <EmptyState title="Aucun chantier" description="Les schémas ne déclarent pas encore de chantiers." />
        ) : (
          <div className="card tablecard overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  <th>Chantier</th>
                  <th>Direction</th>
                  <th>Fenêtre</th>
                  <th>Pilote</th>
                  <th>Budget</th>
                  <th>Axes groupe</th>
                  <th className="right">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {data.portfolioInitiatives.map((row) => {
                  const T = stgTone(row.accentTone);
                  const init = row.initiative;
                  const href = row.strategyId
                    ? `/strategic-direction-strategy/${row.strategyId}`
                    : null;
                  return (
                    <tr
                      key={`${row.directionId}-${init.id}`}
                      className={cn(href && 'cursor-pointer hover:bg-muted/30')}
                      onClick={() => {
                        if (href) router.push(href);
                      }}
                      onKeyDown={(e) => {
                        if (href && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          router.push(href);
                        }
                      }}
                      tabIndex={href ? 0 : undefined}
                      aria-label={
                        href
                          ? `Ouvrir le schéma — ${displayLabel(init.title, 'Chantier')}`
                          : undefined
                      }
                    >
                      <td className="cell-strong">{displayLabel(init.title, 'Chantier')}</td>
                      <td>
                        <span className="stg-chip" style={{ background: T.bg, color: T.c }}>
                          {displayLabel(row.directionCode, 'Direction')}
                        </span>
                      </td>
                      <td className="tabular-nums text-muted-foreground">
                        {stgQuarterLabel(init.startMonthOffset, data.horizonStartYear)} →{' '}
                        {stgQuarterLabel(
                          Math.min(init.endMonthOffset, totalMonths - 1),
                          data.horizonStartYear,
                        )}
                      </td>
                      <td>{displayLabel(init.ownerLabel, 'Pilote non renseigné')}</td>
                      <td className="tabular-nums">{formatEurCents(init.budgetCents)}</td>
                      <td>
                        <div className="stg-chips">
                          {row.axisNames.length > 0 ? (
                            row.axisNames.map((n) => (
                              <span key={n} className="stg-chip">
                                <StrategicAxisNameLabel name={n} />
                              </span>
                            ))
                          ) : (
                            <span className="font-bold text-muted-foreground">non rattaché</span>
                          )}
                        </div>
                      </td>
                      <td className="right">
                        <div className="prog" style={{ justifyContent: 'flex-end' }}>
                          <div className="prog-track" style={{ width: 80 }}>
                            <div
                              className="prog-fill"
                              style={{
                                width: `${init.progressPct}%`,
                                background: progressFillColor(init.progressPct),
                              }}
                            />
                          </div>
                          <span className="prog-pct">{init.progressPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stg-sec">
        <div className="stg-sec-t">
          <TriangleAlert aria-hidden />
          Recouvrements entre directions
        </div>
        <div className="stg-sec-sub" style={{ marginBottom: 12 }}>
          Chantiers de directions différentes partageant un même objet — à arbitrer en revue croisée.
        </div>
        <div className="stg-dup">
          {data.overlaps.length === 0 ? (
            <div className="card">
              <div className="stg-empty">Aucun recouvrement détecté entre les schémas directeurs.</div>
            </div>
          ) : (
            data.overlaps.map((pair, idx) => {
              const TA = stgTone(
                data.matrix.find((m) => m.directionId === pair.a.directionId)?.accentTone,
              );
              const TB = stgTone(
                data.matrix.find((m) => m.directionId === pair.b.directionId)?.accentTone,
              );
              const a = pair.a.initiative;
              const b = pair.b.initiative;
              const os = Math.max(a.startMonthOffset, b.startMonthOffset);
              const oe = Math.min(a.endMonthOffset, b.endMonthOffset);
              const ov = Math.max(0, oe - os);
              const bar = (init: StrategyInitiative, col: string) => (
                <div className="tr" key={`${init.id}-bar`}>
                  <i
                    style={{
                      left: `${stgBarPct(init.startMonthOffset, totalMonths).toFixed(2)}%`,
                      width: `${stgBarPct(Math.max(1, init.endMonthOffset - init.startMonthOffset), totalMonths).toFixed(2)}%`,
                      background: col,
                    }}
                  />
                  {ov > 0 ? (
                    <b
                      style={{
                        left: `${stgBarPct(os, totalMonths).toFixed(2)}%`,
                        width: `${stgBarPct(ov, totalMonths).toFixed(2)}%`,
                      }}
                    />
                  ) : null}
                </div>
              );
              const side = (
                code: string,
                init: StrategyInitiative,
                T: ReturnType<typeof stgTone>,
                align: 'l' | 'r',
              ) => (
                <div className={`sd ${align}`}>
                  <div className="sd-h">
                    <span className="sg" style={{ background: T.bg, color: T.c }}>
                      {displayLabel(code, 'Direction')}
                    </span>
                    <span className="sd-m">
                      {stgQuarterLabel(init.startMonthOffset, data.horizonStartYear)} →{' '}
                      {stgQuarterLabel(
                        Math.min(init.endMonthOffset, totalMonths - 1),
                        data.horizonStartYear,
                      )}
                    </span>
                  </div>
                  <div className="sd-n">{displayLabel(init.title, 'Chantier')}</div>
                  <div className="sd-f">
                    <span>{displayLabel(init.ownerLabel, 'Pilote non renseigné')}</span>
                    <span className="dot" aria-hidden />
                    <span>{formatEurCents(init.budgetCents)}</span>
                    <span className="dot" aria-hidden />
                    <span>{init.progressPct} %</span>
                  </div>
                </div>
              );
              return (
                <div key={idx} className={`card stg-dup-c sev-${pair.severity}`}>
                  <div className="stg-dup-top">
                    <span className="sev">{overlapSeverityLabel(pair.severity)}</span>
                    <span className="stg-dup-q">
                      {ov > 0
                        ? `Chevauchement ${stgQuarterLabel(os, data.horizonStartYear)} → ${stgQuarterLabel(Math.max(os, oe - 1), data.horizonStartYear)}`
                        : 'Fenêtres disjointes'}
                    </span>
                    <span className="stg-dup-b">
                      {formatEurCents(a.budgetCents + b.budgetCents)} cumulés
                    </span>
                  </div>
                  <div className="stg-dup-body">
                    {side(pair.a.directionCode, a, TA, 'l')}
                    <div className="mid" aria-hidden>
                      <i style={{ background: TA.c }} />
                      <span className="x">↔</span>
                      <i style={{ background: TB.c }} />
                    </div>
                    {side(pair.b.directionCode, b, TB, 'r')}
                  </div>
                  <div className="stg-dup-tl">
                    <div className="yl">
                      {years.map((y) => (
                        <span key={y}>{y}</span>
                      ))}
                    </div>
                    {bar(a, TA.c)}
                    {bar(b, TB.c)}
                  </div>
                  <div className="stg-dup-foot">
                    <span className="lb">Objets partagés</span>
                    <div className="stg-chips">
                      {pair.shared.map((t) => (
                        <span key={t} className="stg-chip">
                          {displayLabel(t, 'Objet')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <StariumModal
        open={compareOpen}
        onOpenChange={setCompareOpen}
        title="Comparer deux directions"
        description="Ambition, moyens, alignement et maturité côte à côte"
        icon={Columns2}
        size="xl"
        footer={
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setCompareOpen(false)}
          >
            Fermer
          </Button>
        }
      >
        <div className="starium-form space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-cmp-a">
                Direction A
              </label>
              <Select value={dirA || undefined} onValueChange={(v) => setDirA(v ?? '')}>
                <SelectTrigger id="stg-cmp-a" className="min-h-11 w-full">
                  <SelectValue placeholder="Choisir une direction" />
                </SelectTrigger>
                <SelectContent>
                  {data.matrix.map((r) => (
                    <SelectItem key={r.directionId} value={r.directionId}>
                      {displayLabel(r.directionCode, 'Direction')} —{' '}
                      {displayLabel(r.directionName, 'Direction')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="stg-cmp-b">
                Direction B
              </label>
              <Select value={dirB || undefined} onValueChange={(v) => setDirB(v ?? '')}>
                <SelectTrigger id="stg-cmp-b" className="min-h-11 w-full">
                  <SelectValue placeholder="Choisir une direction" />
                </SelectTrigger>
                <SelectContent>
                  {data.matrix.map((r) => (
                    <SelectItem key={r.directionId} value={r.directionId}>
                      {displayLabel(r.directionCode, 'Direction')} —{' '}
                      {displayLabel(r.directionName, 'Direction')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="stg-cmp grid gap-4 sm:grid-cols-2">
            {[
              { row: rowA, mat: matA, tl: tlA },
              { row: rowB, mat: matB, tl: tlB },
            ].map((col, i) => {
              if (!col.row) {
                return (
                  <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-4">
                    <EmptyState title="Direction non sélectionnée" />
                  </div>
                );
              }
              const T = stgTone(col.row.accentTone);
              return (
                <div
                  key={col.row.directionId}
                  className="overflow-hidden rounded-lg border border-border/70 bg-card"
                >
                  <div
                    className="flex items-center gap-3 p-4"
                    style={{ background: T.bg }}
                  >
                    <div
                      className="stg-sigle"
                      style={{
                        width: 38,
                        height: 38,
                        fontSize: 12,
                        background: 'var(--neutral-0)',
                        color: T.c,
                      }}
                    >
                      {displayLabel(col.row.directionCode, 'Direction')}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">
                        {displayLabel(col.row.directionName, 'Direction')}
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground">
                        {displayLabel(col.row.sponsorLabel, 'Sponsor non renseigné')}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 border-b border-border/60 p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Score d’alignement</span>
                      <span className="font-bold tabular-nums" style={{ color: T.c }}>
                        {col.row.score}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Statut</span>
                      <span className="font-semibold">
                        {getStrategicDirectionStrategyStatusLabel(col.row.status)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Ambition</span>
                      <span className="max-w-[55%] text-right font-semibold line-clamp-2">
                        {displayLabel(col.row.ambition, 'Ambition non renseignée')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Horizon</span>
                      <span className="font-semibold">
                        {displayLabel(col.row.horizonLabel, horizonLbl)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">ETP</span>
                      <span className="font-semibold tabular-nums">
                        {col.row.fteCount != null ? `${col.row.fteCount} ETP` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Budget fonctionnement</span>
                      <span className="font-semibold tabular-nums">
                        {formatEurCents(col.row.operatingBudgetCents)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Budget schéma</span>
                      <span className="font-semibold tabular-nums">
                        {formatEurCents(col.row.budgetSchemaCents)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Axes propres</span>
                      <span className="font-semibold tabular-nums">{col.row.ownAxesCount}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">OKR</span>
                      <span className="font-semibold tabular-nums">{col.row.outcomesCount}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Risques</span>
                      <span className="font-semibold tabular-nums">{col.row.risksCount}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Chantiers</span>
                      <span className="font-semibold tabular-nums">
                        {col.row.initiativesCount} · moy. {col.row.initiativesProgressAvg}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Dernière revue</span>
                      <span className="font-semibold">
                        {formatReviewDate(col.row.lastReviewAt)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="starium-overline mb-2">Maturité</div>
                    <div className="stg-chips">
                      {MATURITY_DIMS.map((dim) => {
                        const v = col.mat?.maturity[dim] ?? 0;
                        const h = stgHeat(v);
                        return (
                          <span
                            key={dim}
                            className="stg-chip"
                            style={h.empty ? undefined : { background: h.bg, color: h.c }}
                          >
                            {dim} {h.t}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t border-border/60 p-4">
                    <div className="starium-overline mb-2">Contribution aux axes</div>
                    <div className="space-y-2">
                      {col.row.cells.map((cell) => (
                        <div
                          key={cell.axisId}
                          className="stg-contrib-row"
                          style={{ gridTemplateColumns: '1fr 90px 38px' }}
                        >
                          <div className="l">
                            <StrategicAxisNameLabel name={cell.axisName} />
                          </div>
                          <div className="t" style={{ height: 14 }}>
                            <i
                              style={{
                                width: `${cell.contributionPct}%`,
                                background: T.c,
                              }}
                            />
                          </div>
                          <div className="p">{cell.contributionPct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {strategyIdA && strategyIdB && strategyIdA !== strategyIdB ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="starium-overline mb-2">Différences de versions (API)</div>
              {compareQuery.isLoading ? (
                <LoadingState />
              ) : compareQuery.isError ? (
                <p className="text-sm text-muted-foreground">
                  Comparaison version indisponible pour ces stratégies.
                </p>
              ) : compareQuery.data ? (
                <ul className="space-y-1 text-sm">
                  {compareQuery.data.fields
                    .filter((f) => f.changed)
                    .slice(0, 8)
                    .map((f) => (
                      <li key={f.field}>
                        <span className="font-semibold">
                          {displayLabel(f.label, 'Champ')}
                        </span>
                        {' : '}
                        {displayLabel(f.left, '—')} → {displayLabel(f.right, '—')}
                      </li>
                    ))}
                  {!compareQuery.data.hasChanges ? (
                    <li className="text-muted-foreground">Aucun écart de version détecté.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </StariumModal>
    </div>
  );
}
