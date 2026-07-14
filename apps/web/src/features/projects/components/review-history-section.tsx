'use client';

import {
  PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL,
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import type { ProjectReviewStatus } from '../types/project.types';
import { ReviewEditorSection } from './review-editor-section';
import { History } from 'lucide-react';

type Props = {
  status: ProjectReviewStatus;
  snapshotPayload: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatIso(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export function ReviewHistorySection({ status, snapshotPayload }: Props) {
  if (status !== 'FINALIZED') {
    return (
      <ReviewEditorSection
        sectionId="pr-section-history"
        title="Historique"
        description="Le snapshot figé sera disponible après finalisation du point."
        icon={History}
      >
        <p className="starium-form-hint">
          Statut actuel : {PROJECT_REVIEW_STATUS_LABEL[status] ?? status}. Finalisez le point pour
          conserver une trace immuable.
        </p>
      </ReviewEditorSection>
    );
  }

  if (!snapshotPayload) {
    return (
      <ReviewEditorSection
        sectionId="pr-section-history"
        title="Historique"
        description="Snapshot de clôture du point."
        icon={History}
      >
        <p className="text-sm text-muted-foreground" role="status">
          Snapshot indisponible pour ce point finalisé.
        </p>
      </ReviewEditorSection>
    );
  }

  const review = asRecord(snapshotPayload.review);
  const meeting = asRecord(snapshotPayload.meeting);
  const decisions = asArray(snapshotPayload.decisions);
  const actions = asArray(snapshotPayload.actions);
  const attachments = asArray(snapshotPayload.attachments);
  const participants = asArray(snapshotPayload.participants);

  return (
    <ReviewEditorSection
      sectionId="pr-section-history"
      title="Historique"
      description="Snapshot figé à la finalisation — lecture seule."
      icon={History}
    >
      <div className="space-y-4 text-sm">
        {review ? (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Point
            </p>
            <p className="mt-1 font-medium text-foreground">
              {typeof review.title === 'string' && review.title.trim()
                ? review.title
                : PROJECT_REVIEW_TYPE_LABEL[String(review.type)] ?? String(review.type ?? '—')}
            </p>
            {review.objective ? (
              <p className="mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Objectif : </span>
                {String(review.objective)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Date : {formatIso(review.reviewDate)}
            </p>
          </div>
        ) : null}

        {meeting && (meeting.location || meeting.meetingMode) ? (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Réunion
            </p>
            {meeting.meetingMode ? (
              <p className="mt-1">Mode : {String(meeting.meetingMode)}</p>
            ) : null}
            {meeting.location ? <p className="mt-1">Lieu : {String(meeting.location)}</p> : null}
          </div>
        ) : null}

        {participants.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Participants ({participants.length})
            </p>
            <ul className="space-y-1 text-xs">
              {participants.map((p, i) => {
                const row = asRecord(p);
                if (!row) return null;
                const label =
                  typeof row.displayName === 'string' && row.displayName.trim()
                    ? row.displayName
                    : 'Participant';
                return (
                  <li key={i} className="rounded-md border border-border/60 px-2 py-1">
                    {label}
                    {row.roleLabel ? (
                      <span className="text-muted-foreground"> · {String(row.roleLabel)}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {decisions.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Décisions ({decisions.length})
            </p>
            <ul className="space-y-2 text-xs">
              {decisions.map((d, i) => {
                const row = asRecord(d);
                if (!row) return null;
                const typeKey = String(row.decisionType ?? '');
                const statusKey = String(row.status ?? '');
                return (
                  <li key={i} className="rounded-md border border-border/60 p-2">
                    <span className="font-medium">{String(row.title ?? '—')}</span>
                    <span className="ml-2 text-muted-foreground">
                      {PROJECT_REVIEW_DECISION_TYPE_LABEL[typeKey] ?? typeKey}
                      {' · '}
                      {PROJECT_REVIEW_DECISION_STATUS_LABEL[statusKey] ?? statusKey}
                    </span>
                    {row.impact ? (
                      <p className="mt-1 text-muted-foreground">{String(row.impact)}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions ({actions.length})
            </p>
            <ul className="space-y-1 text-xs">
              {actions.map((a, i) => {
                const row = asRecord(a);
                if (!row) return null;
                return (
                  <li key={i} className="rounded-md border border-border/60 px-2 py-1">
                    <span className="font-medium">{String(row.title ?? '—')}</span>
                    {row.responsibleDisplayName ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {String(row.responsibleDisplayName)}
                      </span>
                    ) : null}
                    {row.dueDate ? (
                      <span className="text-muted-foreground"> · {formatIso(row.dueDate)}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {attachments.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents & liens ({attachments.length})
            </p>
            <ul className="space-y-1 text-xs">
              {attachments.map((a, i) => {
                const row = asRecord(a);
                if (!row) return null;
                const typeKey = String(row.attachmentType ?? '');
                return (
                  <li key={i} className="rounded-md border border-border/60 px-2 py-1">
                    <span className="font-medium">{String(row.title ?? '—')}</span>
                    <span className="ml-2 text-muted-foreground">
                      {PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL[typeKey] ?? typeKey}
                    </span>
                    {row.agendaItemTitle ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {String(row.agendaItemTitle)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </ReviewEditorSection>
  );
}
