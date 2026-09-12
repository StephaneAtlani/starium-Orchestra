'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectReviewEscalationsQuery } from '../hooks/use-project-review-escalations-query';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import {
  riskCriticalityLabel,
  riskCriticalityTone,
} from '../lib/project-risk-display';
import { formatProjectDateLong } from '../lib/projects-list-display';
import type {
  ProjectReviewActionItemApi,
  ProjectReviewAgendaItemApi,
  ProjectReviewDecisionApi,
  ProjectReviewDetail,
  ProjectReviewListItem,
} from '../types/project.types';

/** Onglets kit `prep-workspace.js` : prev / remontes / hist. */
export type RepriseTab = 'prev' | 'remontes' | 'hist';

type Props = {
  projectId: string;
  reviewId: string;
  reviewDate: string | null | undefined;
  previousDetail: ProjectReviewDetail | null | undefined;
  previousLoading: boolean;
  previousError: boolean;
  canEdit: boolean;
  agendaLocked: boolean;
  resumedTitles: string[];
  onAddToOdj: (input: {
    title: string;
    itemType: string;
    description?: string | null;
  }) => Promise<void>;
};

const TABS: Array<{ id: RepriseTab; label: string }> = [
  { id: 'prev', label: 'Séance précédente' },
  { id: 'remontes', label: 'Remontés' },
  { id: 'hist', label: 'Mémoire' },
];

type PillTone =
  | 'gold'
  | 'danger'
  | 'warn'
  | 'success'
  | 'info'
  | 'muted'
  | 'purple';

function isOpenAction(a: ProjectReviewActionItemApi): boolean {
  const s = (a.status ?? '').toUpperCase();
  return s !== 'DONE' && s !== 'CANCELLED' && s !== 'CLOSED';
}

function isOpenDecision(d: ProjectReviewDecisionApi): boolean {
  const s = (d.status ?? '').toUpperCase();
  return s !== 'REJECTED' && s !== 'SUPERSEDED';
}

function isOpenArbitration(item: ProjectReviewAgendaItemApi): boolean {
  if (item.itemType !== 'ARBITRATION') return false;
  if (item.status === 'DONE' || item.status === 'SKIPPED') return false;
  return !(item.decisionSummary?.trim());
}

function formatDateShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const label = formatProjectDateLong(iso);
  return label && label !== '—' ? label : null;
}

function formatHistDate(iso: string | null | undefined): string {
  if (!iso) return 'Sans date';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return 'Sans date';
  }
}

export function PrepareWorkspaceReprise({
  projectId,
  reviewId,
  reviewDate,
  previousDetail,
  previousLoading,
  previousError,
  canEdit,
  agendaLocked,
  resumedTitles,
  onAddToOdj,
}: Props) {
  const [tab, setTab] = useState<RepriseTab>('prev');
  const [busyId, setBusyId] = useState<string | null>(null);

  const risksQuery = useProjectRisksQuery(projectId, { enabled: true });
  const escalationsQuery = useProjectReviewEscalationsQuery(
    projectId,
    reviewId,
    true,
  );
  const reviewsQuery = useProjectReviewsQuery(projectId, { enabled: true });

  const resumed = useMemo(
    () => new Set(resumedTitles.map((t) => t.trim().toLowerCase())),
    [resumedTitles],
  );

  const decisions = (previousDetail?.decisions ?? []).filter(isOpenDecision);
  const actions = (previousDetail?.actionItems ?? []).filter(isOpenAction);
  const arbs = (previousDetail?.agendaItems ?? []).filter(isOpenArbitration);
  const risks = (risksQuery.data ?? []).filter((r) => {
    const s = (r.status ?? '').toUpperCase();
    return s !== 'CLOSED' && s !== 'MITIGATED' && s !== 'ACCEPTED';
  });

  const remontes = useMemo(
    () =>
      (escalationsQuery.data?.items ?? []).filter((e) => e.status === 'PENDING'),
    [escalationsQuery.data?.items],
  );

  const memoryReviews = useMemo(() => {
    const list = reviewsQuery.data ?? [];
    const curTs = reviewDate ? new Date(reviewDate).getTime() : Date.now();
    return list
      .filter((r) => {
        if (r.id === reviewId) return false;
        if (!r.reviewDate) return r.status === 'FINALIZED';
        return new Date(r.reviewDate).getTime() < curTs;
      })
      .sort((a, b) => {
        const ta = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
        const tb = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 6);
  }, [reviewsQuery.data, reviewDate, reviewId]);

  const prevCount =
    decisions.length + actions.length + arbs.length + risks.length;
  const tabCounts: Record<RepriseTab, number> = {
    prev: prevCount,
    remontes: remontes.length,
    hist: 0,
  };
  const openTotal = prevCount;

  const editable = canEdit && !agendaLocked;

  const add = async (
    id: string,
    title: string,
    itemType: string,
    description?: string | null,
  ) => {
    if (!editable || resumed.has(title.trim().toLowerCase())) return;
    setBusyId(id);
    try {
      await onAddToOdj({ title, itemType, description });
    } finally {
      setBusyId(null);
    }
  };

  const prevEmpty =
    !previousLoading &&
    !previousError &&
    (!previousDetail ||
      (decisions.length === 0 &&
        actions.length === 0 &&
        arbs.length === 0 &&
        risks.length === 0));

  return (
    <div className="prepare-reprise">
      <div className="prepare-reprise__h">
        <h3 className="prepare-reprise__t">À reprendre</h3>
        <span className="prepare-reprise__n">
          {openTotal} élément{openTotal > 1 ? 's' : ''} en attente
        </span>
      </div>

      <div
        className="prepare-reprise__tabs"
        role="tablist"
        aria-label="Sources à reprendre"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`prepare-reprise__tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {tabCounts[t.id] > 0 ? (
              <span className="prepare-reprise__tab-n">{tabCounts[t.id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="prepare-reprise__list" role="tabpanel">
        {tab === 'prev' ? (
          previousLoading || risksQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : previousError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger la séance précédente
            </div>
          ) : !previousDetail ? (
            <div className="prepare-workspace__empty">
              Première séance de la série.
            </div>
          ) : prevEmpty ? (
            <div className="prepare-workspace__empty">
              Première séance de la série.
            </div>
          ) : (
            <>
              {decisions.length > 0 ? (
                <Group label="Décisions">
                  {decisions.map((d) => {
                    const title = displayLabel(d.title, 'Décision');
                    return (
                      <SrcRow
                        key={d.id}
                        lead="dot"
                        leadTone="gold"
                        title={title}
                        meta={firstDisplayLabel(
                          [d.impact, d.description],
                          'Décision précédente',
                        )}
                        pill="À appliquer"
                        pillTone="gold"
                        already={resumed.has(title.trim().toLowerCase())}
                        busy={busyId === d.id}
                        editable={editable}
                        onAdd={() =>
                          void add(
                            d.id,
                            `Décision — ${title}`,
                            'DECISION',
                            d.description,
                          )
                        }
                      />
                    );
                  })}
                </Group>
              ) : null}

              {actions.length > 0 ? (
                <Group label="Actions">
                  {actions.map((a) => {
                    const title = displayLabel(a.title, 'Action');
                    const owner = a.responsibleDisplayName?.trim() || null;
                    const due = formatDateShort(a.dueDate);
                    return (
                      <SrcRow
                        key={a.id}
                        lead="dot"
                        leadTone="info"
                        title={title}
                        meta={firstDisplayLabel(
                          [owner, due, a.description],
                          'Action précédente',
                        )}
                        pill="Ouverte"
                        pillTone="info"
                        already={resumed.has(title.trim().toLowerCase())}
                        busy={busyId === a.id}
                        editable={editable}
                        onAdd={() =>
                          void add(a.id, title, 'ACTION_REVIEW', a.description)
                        }
                      />
                    );
                  })}
                </Group>
              ) : null}

              {arbs.length > 0 ? (
                <Group label="Arbitrages">
                  {arbs.map((item) => {
                    const title = displayLabel(item.title, 'Arbitrage');
                    return (
                      <SrcRow
                        key={item.id}
                        lead="dot"
                        leadTone="warn"
                        title={title}
                        meta={firstDisplayLabel(
                          [item.description, 'Reporté — à trancher'],
                          'Arbitrage reporté',
                        )}
                        pill="Reporté"
                        pillTone="warn"
                        already={resumed.has(title.trim().toLowerCase())}
                        busy={busyId === item.id}
                        editable={editable}
                        onAdd={() =>
                          void add(
                            item.id,
                            `Arbitrage — ${title}`,
                            'ARBITRATION',
                            item.description,
                          )
                        }
                      />
                    );
                  })}
                </Group>
              ) : null}

              {risks.length > 0 ? (
                <Group label="Risques">
                  {risks.map((r) => {
                    const title = displayLabel(r.title, 'Risque');
                    const crit = riskCriticalityLabel(r.criticalityLevel);
                    const tone = riskCriticalityTone(r.criticalityLevel);
                    const pillTone: PillTone =
                      tone === 'danger'
                        ? 'danger'
                        : tone === 'warn'
                          ? 'warn'
                          : 'success';
                    return (
                      <SrcRow
                        key={r.id}
                        lead="dot"
                        leadTone={pillTone}
                        title={title}
                        meta="Risque projet ouvert"
                        pill={crit}
                        pillTone={pillTone}
                        already={resumed.has(title.trim().toLowerCase())}
                        busy={busyId === r.id}
                        editable={editable}
                        onAdd={() =>
                          void add(
                            r.id,
                            `Risque — ${title}`,
                            'RISK',
                            r.description,
                          )
                        }
                      />
                    );
                  })}
                </Group>
              ) : null}

              {risksQuery.isError ? (
                <div className="prepare-workspace__empty" role="alert">
                  Impossible de charger les risques
                </div>
              ) : null}
            </>
          )
        ) : null}

        {tab === 'remontes' ? (
          escalationsQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : escalationsQuery.isError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger les sujets remontés
            </div>
          ) : remontes.length === 0 ? (
            <div className="prepare-workspace__empty">Rien à reprendre.</div>
          ) : (
            remontes.map((e) => {
              const title = displayLabel(e.title, 'Sujet remonté');
              const from = firstDisplayLabel(
                [
                  e.sourceReviewTitle,
                  formatDateShort(e.sourceReviewDate),
                  e.summary,
                ],
                'Remontée du niveau inférieur',
              );
              return (
                <SrcRow
                  key={e.id}
                  lead="dot"
                  leadTone="purple"
                  title={title}
                  meta={from}
                  pill="Remonté"
                  pillTone="purple"
                  already={resumed.has(title.trim().toLowerCase())}
                  busy={busyId === e.id}
                  editable={editable}
                  onAdd={() =>
                    void add(e.id, title, 'ARBITRATION', e.summary)
                  }
                />
              );
            })
          )
        ) : null}

        {tab === 'hist' ? (
          reviewsQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : reviewsQuery.isError ? (
            <div className="prepare-workspace__empty" role="alert">
              Impossible de charger la mémoire des séances
            </div>
          ) : memoryReviews.length === 0 ? (
            <div className="prepare-workspace__empty">
              Première séance de la série — aucune mémoire encore.
            </div>
          ) : (
            memoryReviews.map((r, idx) => (
              <HistCard
                key={r.id}
                review={r}
                decisions={
                  idx === 0 && previousDetail?.id === r.id
                    ? (previousDetail.decisions ?? []).slice(0, 8)
                    : []
                }
              />
            ))
          )
        ) : null}
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="prepare-reprise__grp">
      <div className="prepare-reprise__grp-l">{label}</div>
      {children}
    </div>
  );
}

function HistCard({
  review,
  decisions,
}: {
  review: ProjectReviewListItem;
  decisions: ProjectReviewDecisionApi[];
}) {
  const title = displayLabel(review.title, 'Séance');
  const nDec = review.decisionsCount ?? 0;
  const nAct = review.actionItemsCount ?? 0;
  return (
    <div className="prepare-reprise__hist">
      <div className="prepare-reprise__hist-h">
        <span className="prepare-reprise__hist-d">
          {formatHistDate(review.reviewDate)}
        </span>
        <span className="prepare-reprise__hist-n">{title}</span>
        <span className="prepare-reprise__hist-s">
          {nDec} déc. · {nAct} act.
        </span>
      </div>
      {decisions.length > 0 ? (
        <ul className="prepare-reprise__hist-list">
          {decisions.map((d) => (
            <li key={d.id} className="prepare-reprise__hrow">
              <span className="prepare-reprise__lead is-dot is-gold" aria-hidden />
              <span className="prepare-reprise__ht">
                {displayLabel(d.title, 'Décision')}
              </span>
              <span className="prepare-reprise__hm">
                {firstDisplayLabel([d.impact, d.description], 'Décision')}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SrcRow({
  lead,
  leadTone,
  title,
  meta,
  pill,
  pillTone,
  already,
  busy,
  editable,
  onAdd,
}: {
  lead: 'dot' | 'diamond';
  leadTone: PillTone;
  title: string;
  meta: string;
  pill: string;
  pillTone: PillTone;
  already: boolean;
  busy: boolean;
  editable: boolean;
  onAdd: () => void;
}) {
  return (
    <div className={`prepare-reprise__row${already ? ' is-done' : ''}`}>
      <span
        className={`prepare-reprise__lead is-${lead} is-${leadTone}`}
        aria-hidden
      />
      <div className="prepare-reprise__body">
        <div className="prepare-reprise__title">{title}</div>
        <div className="prepare-reprise__meta">{meta}</div>
      </div>
      <span className={`prepare-reprise__pill is-${pillTone}`}>{pill}</span>
      <div className="prepare-reprise__acts">
        {already ? (
          <span className="prepare-reprise__btn is-on">
            <Check className="size-2.5" aria-hidden strokeWidth={3} />
            À l&apos;ODJ
          </span>
        ) : (
          <button
            type="button"
            className="prepare-reprise__btn"
            disabled={!editable || busy}
            onClick={onAdd}
          >
            → ODJ
          </button>
        )}
      </div>
    </div>
  );
}
