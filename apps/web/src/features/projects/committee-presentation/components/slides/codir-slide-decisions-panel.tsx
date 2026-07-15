'use client';

import { Check, ClipboardCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../../../constants/project-enum-labels';
import { formatDateFr } from '../../widgets/committee-widget-helpers';
import type {
  ProjectReviewDecisionApi,
  ProjectReviewDetail,
  ProjectReviewListItem,
} from '../../../types/project.types';

function decisionBadge(decision: ProjectReviewDecisionApi): {
  label: string;
  tone: 'ok' | 'info' | 'warn' | 'muted';
} {
  if (decision.status === 'VALIDATED') {
    return { label: 'Acté', tone: 'ok' };
  }
  if (decision.decisionType === 'ARBITRATION') {
    return { label: 'Arbitrage', tone: 'info' };
  }
  if (decision.status === 'REJECTED') {
    return { label: 'Refusé', tone: 'warn' };
  }
  return {
    label:
      PROJECT_REVIEW_DECISION_TYPE_LABEL[decision.decisionType] ??
      PROJECT_REVIEW_DECISION_STATUS_LABEL[decision.status] ??
      'Décision',
    tone: 'muted',
  };
}

function decisionMeta(
  decision: ProjectReviewDecisionApi,
  review: ProjectReviewListItem | null,
): string {
  const reviewLabel = review
    ? (PROJECT_REVIEW_TYPE_LABEL[review.reviewType] ?? review.reviewType)
    : 'Point projet';
  const date = formatDateFr(decision.decidedAt ?? review?.reviewDate ?? review?.finalizedAt);
  return `${reviewLabel} · ${date}`;
}

type CodirSlideDecisionsPanelProps = {
  review: ProjectReviewListItem | null;
  reviewDetail: ProjectReviewDetail | null;
  isLoading?: boolean;
};

export function CodirSlideDecisionsPanel({
  review,
  reviewDetail,
  isLoading,
}: CodirSlideDecisionsPanelProps) {
  const decisions = (reviewDetail?.decisions ?? [])
    .filter((d) => d.status !== 'SUPERSEDED')
    .slice(0, 2);

  return (
    <section className="starium-present-decisions shrink-0" aria-label="Dernières décisions">
      <p className="starium-present-decisions__eyebrow">
        <ClipboardCheck className="size-3.5 shrink-0" aria-hidden />
        Dernières décisions
      </p>

      {isLoading ? (
        <p className="text-xs starium-present-text-muted">Chargement des décisions…</p>
      ) : decisions.length === 0 ? (
        <p className="text-xs starium-present-text-muted">Aucune décision sur le dernier point projet.</p>
      ) : (
        <ul className="starium-present-decisions__list">
          {decisions.map((decision) => {
            const badge = decisionBadge(decision);
            const isValidated = decision.status === 'VALIDATED';
            return (
              <li key={decision.id} className="starium-present-decision-card">
                <span
                  className={cn(
                    'starium-present-decision-card__icon',
                    isValidated
                      ? 'starium-present-decision-card__icon--ok'
                      : 'starium-present-decision-card__icon--info',
                  )}
                  aria-hidden
                >
                  {isValidated ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Clock className="size-4" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="starium-present-decision-card__title">{decision.title}</p>
                  <p className="starium-present-decision-card__meta">
                    {decisionMeta(decision, review)}
                  </p>
                </div>
                <span
                  className={cn(
                    'starium-present-decision-card__badge',
                    `starium-present-decision-card__badge--${badge.tone}`,
                  )}
                >
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
