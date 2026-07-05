'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewDetail,
  ProjectReviewMeetingMode,
  ProjectReviewStatus,
} from '../types/project.types';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ChevronDown, ChevronUp, ListOrdered, Play, SkipForward, Square, Video } from 'lucide-react';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  agendaItems: ProjectReviewAgendaItemApi[];
  canEdit: boolean;
};

export function ReviewAgendaSection({
  projectId,
  reviewId,
  status,
  agendaItems,
  canEdit,
}: Props) {
  const {
    createAgendaItem,
    updateAgendaItem,
    reorderAgendaItems,
    startAgendaItem,
    completeAgendaItem,
    skipAgendaItem,
  } = useProjectReviewMutations(projectId);

  const [newTitle, setNewTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    agendaItems[0]?.id ?? null,
  );
  const [notes, setNotes] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('');

  const agendaEditable =
    canEdit && (status === 'PLANNED' || status === 'IN_REVIEW');
  const conductEditable = canEdit && status === 'IN_REVIEW';
  const readOnly = status === 'FINALIZED' || status === 'CANCELLED';

  const selected = agendaItems.find((i) => i.id === selectedId) ?? null;

  const onAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      await createAgendaItem.mutateAsync({
        reviewId,
        body: { title },
      });
      setNewTitle('');
    } catch {
      toast.error('Impossible d’ajouter le point.');
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= agendaItems.length) return;
    const items = [...agendaItems];
    [items[index], items[target]] = [items[target], items[index]];
    try {
      await reorderAgendaItems.mutateAsync({
        reviewId,
        items: items.map((item, orderIndex) => ({ id: item.id, orderIndex })),
      });
    } catch {
      toast.error('Réordonnancement impossible.');
    }
  };

  const saveConductFields = async () => {
    if (!selected || !conductEditable) return;
    try {
      await updateAgendaItem.mutateAsync({
        reviewId,
        agendaItemId: selected.id,
        body: { notes: notes.trim() || null, decisionSummary: decisionSummary.trim() || null },
      });
    } catch {
      toast.error('Enregistrement impossible.');
    }
  };

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="review-agenda-title">
      <h3 id="review-agenda-title" className="starium-form-section-title">
        <ListOrdered aria-hidden />
        Ordre du jour
      </h3>

      {agendaItems.length === 0 ? (
        <p className="starium-form-hint">Aucun point d’ordre du jour.</p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {agendaItems.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                'rounded-lg border p-3',
                selectedId === item.id ? 'border-primary/50 bg-muted/30' : 'border-border/70',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 text-left"
                  onClick={() => {
                    setSelectedId(item.id);
                    setNotes(item.notes ?? '');
                    setDecisionSummary(item.decisionSummary ?? '');
                  }}
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 starium-ds-badge starium-ds-badge--neutral">
                    {PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </button>
                {agendaEditable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label="Monter"
                      disabled={index === 0}
                      onClick={() => void moveItem(index, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label="Descendre"
                      disabled={index === agendaItems.length - 1}
                      onClick={() => void moveItem(index, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {conductEditable && selectedId === item.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    onClick={() =>
                      void startAgendaItem.mutateAsync({ reviewId, agendaItemId: item.id })
                    }
                  >
                    <Play className="size-4" aria-hidden />
                    Démarrer le point
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      void completeAgendaItem.mutateAsync({ reviewId, agendaItemId: item.id })
                    }
                  >
                    <Square className="size-4" aria-hidden />
                    Clôturer le point
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      void skipAgendaItem.mutateAsync({ reviewId, agendaItemId: item.id })
                    }
                  >
                    <SkipForward className="size-4" aria-hidden />
                    Reporter / non traité
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {agendaEditable ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="starium-form-input min-h-11 flex-1"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouveau point d’ordre du jour"
            aria-label="Titre du point"
          />
          <Button type="button" className="min-h-11" onClick={() => void onAdd()}>
            Ajouter
          </Button>
        </div>
      ) : null}

      {selected && conductEditable ? (
        <div className="mt-4 space-y-3 rounded-lg border border-border/70 p-3">
          <p className="text-sm font-medium">Point courant : {selected.title}</p>
          <div className="starium-form-field">
            <label htmlFor="agenda-notes" className="starium-form-label">
              Notes
            </label>
            <textarea
              id="agenda-notes"
              className="starium-form-textarea min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => void saveConductFields()}
            />
          </div>
          <div className="starium-form-field">
            <label htmlFor="agenda-decision" className="starium-form-label">
              Synthèse de décision
            </label>
            <textarea
              id="agenda-decision"
              className="starium-form-textarea min-h-[80px]"
              value={decisionSummary}
              onChange={(e) => setDecisionSummary(e.target.value)}
              onBlur={() => void saveConductFields()}
            />
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <p className="starium-form-hint mt-2">Ordre du jour figé (revue terminée ou annulée).</p>
      ) : null}
    </section>
  );
}

export function ReviewMeetingInfoBlock({
  detail,
}: {
  detail: Pick<
    ProjectReviewDetail,
    'meetingMode' | 'meetingUrl' | 'location' | 'startedAt' | 'startedByDisplayName'
  >;
}) {
  if (!detail.meetingMode && !detail.location && !detail.meetingUrl) return null;

  const modeLabel = detail.meetingMode
    ? PROJECT_REVIEW_MEETING_MODE_LABEL[detail.meetingMode] ?? detail.meetingMode
    : null;

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="review-meeting-info">
      <h3 id="review-meeting-info" className="starium-form-section-title">
        <Video className="size-3.5" aria-hidden />
        Infos réunion
      </h3>
      <div className="text-sm">
        {modeLabel ? (
          <p className="text-muted-foreground">
            Format : <span className="font-medium text-foreground">{modeLabel}</span>
          </p>
        ) : null}
        {detail.location ? (
          <p className="mt-1 text-muted-foreground">
            Lieu : <span className="font-medium text-foreground">{detail.location}</span>
          </p>
        ) : null}
        {detail.meetingUrl ? (
          <p className="mt-2">
            <a
              href={detail.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="starium-link inline-flex min-h-11 items-center font-medium"
            >
              Rejoindre la réunion
            </a>
          </p>
        ) : null}
        {detail.startedAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Démarrée le {new Date(detail.startedAt).toLocaleString('fr-FR')}
            {detail.startedByDisplayName ? ` par ${detail.startedByDisplayName}` : ''}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type { ProjectReviewMeetingMode };
