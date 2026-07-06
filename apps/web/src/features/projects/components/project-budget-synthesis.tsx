'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Code2,
  Info,
  LineChart,
  Palette,
  Users,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { projectBudget } from '../constants/project-routes';
import { useProjectBudgetLinksQuery } from '../hooks/use-project-budget-links-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import {
  budgetPercentOf,
  computeProjectBudgetMetrics,
  formatBudgetCompact,
  formatBudgetEur,
  projectLinkAllocatedBudget,
  projectLinkDisplayLineBudget,
  projectLinkEffectiveBudget,
  projectLinkEngaged,
  projectLinkLineOverrun,
  projectLinkRealized,
} from '../lib/project-budget-display';
import {
  ALLOCATION_MODE_LABELS,
  parseFixedLinkAmount,
} from '../lib/project-budget-allocation';
import type { ProjectBudgetLinkItem, ProjectDetail } from '../types/project.types';
import { ProjectBudgetKpiStrip } from './project-budget-kpi-strip';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';

const DONUT_RADIUS = 54;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const CATEGORY_ICON_TONES = [
  'starium-bcat-ico--purple',
  'starium-bcat-ico--green',
  'starium-bcat-ico--blue',
  'starium-bcat-ico--gold',
  'starium-bcat-ico--red',
] as const;

const CATEGORY_ICONS = [Palette, Code2, Cloud, CheckCircle2, Users] as const;

type BudgetWarningItem = {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: React.ReactNode;
  href?: string;
};

function categoryIconForLink(link: ProjectBudgetLinkItem, index: number) {
  if (link.budgetLine.expenseType === 'CAPEX') return Cloud;
  const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
  return Icon;
}

function progressFillClass(pct: number): string {
  if (pct >= 90) return 'starium-bud-pfill--bad';
  if (pct >= 75) return 'starium-bud-pfill--warn';
  if (pct >= 50) return 'starium-bud-pfill--ok';
  return 'starium-bud-pfill--blue';
}

function formatLinkAllocationValue(link: ProjectBudgetLinkItem): string {
  if (link.allocationType === 'FULL') return '100 %';
  if (
    link.allocationType === 'PERCENTAGE' ||
    link.allocationType === 'BUDGET_PERCENTAGE'
  ) {
    return link.percentage != null ? `${link.percentage} %` : '—';
  }
  const fixed = parseFixedLinkAmount(link.amount);
  return fixed != null ? formatBudgetEur(fixed) : '—';
}

function BudgetCategoryRow({
  link,
  index,
}: {
  link: ProjectBudgetLinkItem;
  index: number;
}) {
  const lineBudget = projectLinkDisplayLineBudget(link);
  const envelope = projectLinkEffectiveBudget(link);
  const overrun = projectLinkLineOverrun(link);
  const engaged = projectLinkEngaged(link);
  const consumed = projectLinkRealized(link);
  const rest =
    envelope != null && envelope > 0 ? Math.max(0, envelope - consumed) : null;
  const consumptionPct =
    envelope != null && envelope > 0 ? budgetPercentOf(consumed, envelope) : null;
  const isCritical = consumptionPct != null && consumptionPct >= 85;
  const Icon = categoryIconForLink(link, index);
  const tone = CATEGORY_ICON_TONES[index % CATEGORY_ICON_TONES.length];
  const lineLabel = link.budgetLine.code
    ? `${link.budgetLine.code} — ${link.budgetLine.name}`
    : link.budgetLine.name;

  return (
    <tr>
      <td>
        <div className="starium-bcat">
          <div className={cn('starium-bcat-ico', tone)} aria-hidden>
            <Icon strokeWidth={1.75} />
          </div>
          <span className="starium-dt-cell-strong truncate">{lineLabel}</span>
        </div>
      </td>
      <td>
        <div className="min-w-[9rem] text-sm text-foreground">
          {ALLOCATION_MODE_LABELS[link.allocationType]}
        </div>
        <div className="starium-dt-cell-sub tabular-nums">
          {formatLinkAllocationValue(link)}
        </div>
      </td>
      <td className="starium-dt__right tabular-nums">
        {lineBudget != null ? formatBudgetEur(lineBudget) : '—'}
      </td>
      <td className="starium-dt__right tabular-nums font-medium">
        {envelope != null ? formatBudgetEur(envelope) : '—'}
      </td>
      <td
        className={cn(
          'starium-dt__right tabular-nums',
          overrun > 0 && 'font-semibold text-[color:var(--state-danger)]',
        )}
      >
        {overrun > 0 ? formatBudgetEur(overrun) : '—'}
      </td>
      <td
        className="starium-dt__right tabular-nums font-semibold"
        style={{ color: 'var(--brand-gold-700)' }}
      >
        {formatBudgetEur(engaged)}
      </td>
      <td
        className={cn(
          'starium-dt__right tabular-nums font-bold',
          isCritical && 'text-[color:var(--state-danger)]',
        )}
        style={!isCritical ? { color: 'var(--state-info)' } : undefined}
      >
        {formatBudgetEur(consumed)}
      </td>
      <td className="starium-dt__right tabular-nums">
        {rest != null ? formatBudgetEur(rest) : '—'}
      </td>
      <td>
        {consumptionPct != null ? (
          <div className="starium-bud-prog-cell">
            <div className="starium-bud-ptrack" aria-hidden>
              <div
                className={cn('starium-bud-pfill', progressFillClass(consumptionPct))}
                style={{ width: `${consumptionPct}%` }}
              />
            </div>
            <span
              className={cn(
                'starium-dt-prog-pct shrink-0',
                isCritical && 'text-[color:var(--state-danger)]',
              )}
            >
              {consumptionPct}%
            </span>
          </div>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}

function BudgetDonut({
  consumedPct,
  consumed,
  remaining,
}: {
  consumedPct: number;
  consumed: number;
  remaining: number;
}) {
  const offset = DONUT_CIRCUMFERENCE * (1 - consumedPct / 100);

  return (
    <div className="starium-bud-donut-card">
      <h3 className="starium-bud-chart-title">Taux de consommation</h3>
      <div
        className="starium-bud-donut"
        role="img"
        aria-label={`${consumedPct}% du budget consommé`}
      >
        <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden>
          <circle
            cx="65"
            cy="65"
            r={DONUT_RADIUS}
            fill="none"
            stroke="var(--neutral-200)"
            strokeWidth="16"
          />
          <circle
            cx="65"
            cy="65"
            r={DONUT_RADIUS}
            fill="none"
            stroke="var(--state-info)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={DONUT_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="chart-donut-slice"
          />
        </svg>
        <div className="starium-bud-donut-center">
          <div className="starium-bud-donut-pct">{consumedPct}%</div>
          <div className="starium-bud-donut-lbl">consommé</div>
        </div>
      </div>
      <div className="starium-bud-donut-legend">
        <div className="starium-bud-leg">
          <span
            className="starium-bud-leg-dot"
            style={{ background: 'var(--state-info)' }}
            aria-hidden
          />
          {formatBudgetCompact(consumed)}
        </div>
        <div className="starium-bud-leg">
          <span
            className="starium-bud-leg-dot"
            style={{ background: 'var(--neutral-200)' }}
            aria-hidden
          />
          {formatBudgetCompact(remaining)}
        </div>
      </div>
    </div>
  );
}

function ProjectBudgetWarnings({
  warnings,
  categoriesHref,
}: {
  warnings: BudgetWarningItem[];
  categoriesHref: string;
}) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      aria-label="Alertes budgétaires"
    >
      {warnings.map((warning) => {
        const isDanger = warning.severity === 'danger';
        const isInfo = warning.severity === 'info';
        return (
          <div
            key={warning.id}
            className={cn(
              'starium-bud-alert',
              isDanger &&
                'border-[color:color-mix(in_srgb,var(--state-danger)_35%,transparent)] bg-[color:var(--state-danger-bg)]',
              isInfo &&
                'border-[color:color-mix(in_srgb,var(--state-info)_35%,transparent)] bg-[color:var(--state-info-bg)]',
            )}
          >
            <div
              className={cn(
                'starium-bud-alert-head',
                isDanger && 'text-[color:var(--state-danger)]',
                isInfo && 'text-[color:var(--state-info)]',
              )}
            >
              {isDanger ? (
                <AlertTriangle strokeWidth={2} aria-hidden />
              ) : isInfo ? (
                <Info strokeWidth={2} aria-hidden />
              ) : (
                <AlertTriangle strokeWidth={2} aria-hidden />
              )}
              {warning.title}
            </div>
            <p className="starium-bud-alert-text">{warning.message}</p>
            {warning.href ? (
              <a href={warning.href} className="starium-bud-alert-btn">
                Voir le détail
              </a>
            ) : warning.id.startsWith('critical-') ? (
              <a href={categoriesHref} className="starium-bud-alert-btn">
                Voir les catégories
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function BudgetOverviewGrid({
  metrics,
  topCritical,
  categoriesHref,
}: {
  metrics: {
    total: number | null;
    engaged: number;
    realized: number;
    available: number | null;
    realizedPct: number;
    engagedPct: number;
  };
  topCritical?: { link: ProjectBudgetLinkItem; pct: number };
  categoriesHref?: string;
}) {
  return (
    <div className="starium-g-budget">
      <div className="starium-bud-chart-card">
        <div className="starium-bud-chart-head">
          <div>
            <h3 className="starium-bud-chart-title">Synthèse budgétaire</h3>
            <p className="starium-bud-chart-sub">
              Engagements, consommation et disponible sur le périmètre lié
            </p>
          </div>
          <LineChart
            className="size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <div className="starium-bud-bo-stats">
          <div>
            <p className="starium-bud-bo-stat-label">Engagé</p>
            <p
              className="starium-bud-bo-stat-val"
              style={{ color: 'var(--brand-gold-700)' }}
            >
              {formatBudgetCompact(metrics.engaged)}
            </p>
            {metrics.total != null && metrics.total > 0 ? (
              <p
                className="starium-bud-bo-stat-sub"
                style={{ color: 'var(--brand-gold-700)' }}
              >
                {metrics.engagedPct}% du budget cible
              </p>
            ) : null}
          </div>
          <div>
            <p className="starium-bud-bo-stat-label">Réalisé</p>
            <p
              className="starium-bud-bo-stat-val"
              style={{ color: 'var(--state-info)' }}
            >
              {formatBudgetCompact(metrics.realized)}
            </p>
            {metrics.total != null && metrics.total > 0 ? (
              <p
                className="starium-bud-bo-stat-sub"
                style={{ color: 'var(--state-info)' }}
              >
                {metrics.realizedPct}% réalisé
              </p>
            ) : null}
          </div>
          <div>
            <p className="starium-bud-bo-stat-label">Disponible</p>
            <p className="starium-bud-bo-stat-val">
              {formatBudgetCompact(metrics.available)}
            </p>
            {metrics.total != null ? (
              <p className="starium-bud-bo-stat-sub">après consommation</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="starium-bud-side">
        <BudgetDonut
          consumedPct={metrics.realizedPct}
          consumed={metrics.realized}
          remaining={metrics.available ?? 0}
        />
        {topCritical && categoriesHref ? (
          <div className="starium-bud-alert" role="status">
            <div className="starium-bud-alert-head">
              <AlertTriangle strokeWidth={2} aria-hidden />
              Attention requise
            </div>
            <p className="starium-bud-alert-text">
              La ligne <b>{topCritical.link.budgetLine.name}</b> atteint{' '}
              <b>{topCritical.pct}%</b> du budget alloué.
            </p>
            <a href={categoriesHref} className="starium-bud-alert-btn">
              Voir le détail
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BudgetCategoriesTable({
  project,
  links,
  metrics,
  categoriesRefId,
  emptyMessage,
}: {
  project: ProjectDetail;
  links: ProjectBudgetLinkItem[];
  metrics: ReturnType<typeof computeProjectBudgetMetrics>;
  categoriesRefId: string;
  emptyMessage: React.ReactNode;
}) {
  const columnCount = 9;

  const tableTotals = useMemo(() => {
    let lineBudgetTotal = 0;
    let envelopeTotal = 0;
    let overrunTotal = 0;
    let hasLineBudget = false;
    let hasEnvelope = false;

    for (const link of links) {
      const lineBudget = projectLinkDisplayLineBudget(link);
      const envelope = projectLinkEffectiveBudget(link);
      if (lineBudget != null) {
        lineBudgetTotal += lineBudget;
        hasLineBudget = true;
      }
      if (envelope != null) {
        envelopeTotal += envelope;
        hasEnvelope = true;
      }
      overrunTotal += projectLinkLineOverrun(link);
    }

    return {
      lineBudgetTotal: hasLineBudget ? lineBudgetTotal : null,
      envelopeTotal: hasEnvelope ? envelopeTotal : null,
      overrunTotal: overrunTotal > 0 ? overrunTotal : null,
    };
  }, [links]);

  return (
    <div className="starium-tablecard" id={categoriesRefId}>
      <StariumTableWrap scrollLabel="Répartition budgétaire — glisser pour faire défiler">
        <table className="starium-dt starium-dt--wide starium-dt--budget-categories">
          <caption className="sr-only">
            Répartition budgétaire par ligne liée au projet {project.name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Catégorie</th>
              <th scope="col">Mode d&apos;allocation</th>
              <th scope="col" className="starium-dt__right" title="Montant validé dans le budget global">
                Budget ligne
              </th>
              <th scope="col" className="starium-dt__right" title="Périmètre financier imputé au projet">
                Enveloppe projet
              </th>
              <th scope="col" className="starium-dt__right" title="Écart imputé si enveloppe supérieure au budget ligne">
                Dépassement
              </th>
              <th scope="col" className="starium-dt__right">
                Engagé
              </th>
              <th scope="col" className="starium-dt__right">
                Réalisé
              </th>
              <th scope="col" className="starium-dt__right">
                Reste
              </th>
              <th scope="col">Consommation</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              links.map((link, index) => (
                <BudgetCategoryRow key={link.id} link={link} index={index} />
              ))
            )}
          </tbody>
          {links.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={2}>Total projet</td>
                <td className="starium-dt__right tabular-nums">
                  {tableTotals.lineBudgetTotal != null
                    ? formatBudgetEur(tableTotals.lineBudgetTotal)
                    : '—'}
                </td>
                <td className="starium-dt__right tabular-nums font-medium">
                  {tableTotals.envelopeTotal != null
                    ? formatBudgetEur(tableTotals.envelopeTotal)
                    : '—'}
                </td>
                <td
                  className={cn(
                    'starium-dt__right tabular-nums',
                    tableTotals.overrunTotal != null &&
                      'font-semibold text-[color:var(--state-danger)]',
                  )}
                >
                  {tableTotals.overrunTotal != null
                    ? formatBudgetEur(tableTotals.overrunTotal)
                    : '—'}
                </td>
                <td
                  className="starium-dt__right tabular-nums"
                  style={{ color: 'var(--brand-gold-700)' }}
                >
                  {formatBudgetEur(metrics.engaged)}
                </td>
                <td
                  className="starium-dt__right tabular-nums"
                  style={{ color: 'var(--state-info)' }}
                >
                  {formatBudgetEur(metrics.realized)}
                </td>
                <td className="starium-dt__right tabular-nums">
                  {formatBudgetEur(metrics.available)}
                </td>
                <td>{metrics.realizedPct}%</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </StariumTableWrap>
      <p className="flex items-start gap-1.5 border-t border-[color:var(--neutral-100)] px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span>
          <strong className="font-medium text-foreground">Budget ligne</strong> : montant validé
          dans le budget global (inchangé par le projet).{' '}
          <strong className="font-medium text-foreground">Enveloppe projet</strong> : périmètre
          financier imputé selon le mode d&apos;allocation (intégral, pourcentage de la ligne,
          pourcentage du budget ou montant fixe).{' '}
          <strong className="font-medium text-foreground">Dépassement</strong> : écart imputé
          lorsque l&apos;enveloppe dépasse le budget ligne (typiquement en «&nbsp;Pourcentage du
          budget&nbsp;»). Engagé, réalisé et reste sont calculés sur l&apos;enveloppe projet.
        </span>
      </p>
    </div>
  );
}

export function ProjectBudgetSynthesis({
  projectId,
  project,
  variant = 'overview',
}: {
  projectId: string;
  project: ProjectDetail;
  /** `overview` = aperçu projet ; `page` = onglet Budget complet (alertes + tableau). */
  variant?: 'overview' | 'page';
}) {
  const linksQuery = useProjectBudgetLinksQuery(projectId);
  const sheetQuery = useProjectSheetQuery(projectId);
  const links = useMemo(
    () => linksQuery.data?.items ?? [],
    [linksQuery.data?.items],
  );

  const metrics = useMemo(
    () =>
      computeProjectBudgetMetrics(links, {
        targetBudgetAmount: project.targetBudgetAmount,
        consumedBudgetAmount: project.consumedBudgetAmount,
        estimatedCost: sheetQuery.data?.estimatedCost ?? null,
      }),
    [
      links,
      project.consumedBudgetAmount,
      project.targetBudgetAmount,
      sheetQuery.data?.estimatedCost,
    ],
  );

  const criticalLinks = useMemo(
    () =>
      [...links]
        .map((link) => {
          const budget = projectLinkAllocatedBudget(link);
          const realizedLine = projectLinkRealized(link);
          const pct =
            budget != null && budget > 0
              ? budgetPercentOf(realizedLine, budget)
              : 0;
          return { link, pct };
        })
        .filter((row) => row.pct >= 85)
        .sort((a, b) => b.pct - a.pct),
    [links],
  );

  const categoriesRefId =
    variant === 'page' ? 'project-budget-categories' : 'project-synthesis-budget-categories';
  const categoriesHref = `#${categoriesRefId}`;
  const budgetPageHref = projectBudget(projectId);

  const budgetWarnings = useMemo((): BudgetWarningItem[] => {
    if (variant !== 'page') return [];

    const items: BudgetWarningItem[] = [];

    if (links.length === 0) {
      items.push({
        id: 'no-links',
        severity: 'info',
        title: 'Aucune liaison budgétaire',
        message:
          'Ce projet n’est pas encore relié à des lignes budgétaires. Ajoutez un lien pour suivre engagements et consommation.',
      });
    }

    for (const { link, pct } of criticalLinks) {
      items.push({
        id: `critical-${link.id}`,
        severity: pct >= 95 ? 'danger' : 'warning',
        title: pct >= 95 ? 'Dépassement imminent' : 'Attention requise',
        message: (
          <>
            La ligne <b>{link.budgetLine.name}</b> atteint <b>{pct}%</b> du budget alloué.
            Un dépassement est possible d&apos;ici la fin du projet.
          </>
        ),
      });
    }

    if (metrics.total != null && metrics.total > 0 && metrics.realized > metrics.total) {
      items.push({
        id: 'consumed-over-target',
        severity: 'danger',
        title: 'Budget cible dépassé',
        message: (
          <>
            Le réalisé (<b>{formatBudgetCompact(metrics.realized)}</b>) dépasse le budget
            cible (<b>{formatBudgetCompact(metrics.total)}</b>).
          </>
        ),
      });
    }

    if (metrics.total != null && metrics.total > 0 && metrics.engaged > metrics.total) {
      items.push({
        id: 'engaged-over-target',
        severity: 'warning',
        title: 'Engagements supérieurs au budget',
        message: (
          <>
            Les engagements (<b>{formatBudgetCompact(metrics.engaged)}</b>) dépassent le budget
            cible (<b>{formatBudgetCompact(metrics.total)}</b>).
          </>
        ),
      });
    }

    if (metrics.forecastDelta != null && metrics.forecastDelta < 0) {
      items.push({
        id: 'forecast-over-target',
        severity: 'warning',
        title: 'Prévision au-dessus du budget',
        message: (
          <>
            La prévision à fin de projet dépasse le budget cible de{' '}
            <b>{formatBudgetCompact(Math.abs(metrics.forecastDelta))}</b>.
          </>
        ),
      });
    }

    return items;
  }, [criticalLinks, links.length, metrics, variant]);

  const topCritical = criticalLinks[0];
  const showSidebarAlert = variant === 'overview' && topCritical != null;

  return (
    <section
      className="starium-proj-budget"
      aria-labelledby={
        variant === 'page' ? 'project-budget-heading' : 'project-synthesis-budget-heading'
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2
          id={
            variant === 'page'
              ? 'project-budget-heading'
              : 'project-synthesis-budget-heading'
          }
          className={variant === 'page' ? 'sr-only' : 'starium-sec-title'}
        >
          {variant === 'page'
            ? `Budget du projet ${project.name}`
            : 'Budget'}
        </h2>
        {variant === 'overview' ? (
          <Link href={budgetPageHref} className="starium-dt-footer-link text-sm">
            Gérer le budget
          </Link>
        ) : null}
      </div>

      {linksQuery.isLoading || sheetQuery.isLoading ? (
        <LoadingState rows={5} />
      ) : (
        <>
          {variant === 'page' ? (
            <ProjectBudgetWarnings
              warnings={budgetWarnings}
              categoriesHref={categoriesHref}
            />
          ) : null}

          <ProjectBudgetKpiStrip metrics={metrics} />

          <BudgetOverviewGrid
            metrics={metrics}
            topCritical={showSidebarAlert ? topCritical : undefined}
            categoriesHref={showSidebarAlert ? categoriesHref : undefined}
          />

          {variant === 'page' ? (
            <BudgetCategoriesTable
              project={project}
              links={links}
              metrics={metrics}
              categoriesRefId={categoriesRefId}
              emptyMessage="Aucune ligne budgétaire liée. Ajoutez un lien ci-dessous."
            />
          ) : (
            <BudgetCategoriesTable
              project={project}
              links={links}
              metrics={metrics}
              categoriesRefId={categoriesRefId}
              emptyMessage={
                <>
                  Aucune ligne budgétaire liée.{' '}
                  <Link href={budgetPageHref} className="underline underline-offset-2">
                    Configurer les liaisons
                  </Link>
                </>
              }
            />
          )}
        </>
      )}
    </section>
  );
}
