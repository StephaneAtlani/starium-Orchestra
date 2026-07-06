'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
} from '../constants/project-enum-labels';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
} from '../types/project.types';
import { ReviewEditorSection } from './review-editor-section';
import { ListChecks } from 'lucide-react';

export type ReviewDecisionFormRow = {
  title: string;
  description: string;
  decisionType: ProjectReviewDecisionType;
  status: ProjectReviewDecisionStatus;
  impact: string;
  agendaItemId: string;
};

const DECISION_TYPES = Object.keys(
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
) as ProjectReviewDecisionType[];

const DECISION_STATUSES = Object.keys(
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
) as ProjectReviewDecisionStatus[];

const textareaClass = cn('starium-form-textarea min-h-[72px] resize-y');

const emptyDecisionRow = (): ReviewDecisionFormRow => ({
  title: '',
  description: '',
  decisionType: 'OTHER',
  status: 'VALIDATED',
  impact: '',
  agendaItemId: '',
});

type Props = {
  decisions: ReviewDecisionFormRow[];
  onChange: (next: ReviewDecisionFormRow[]) => void;
  editable: boolean;
  agendaItems?: ProjectReviewAgendaItemApi[];
  embedded?: boolean;
};

export function ReviewDecisionsSection({
  decisions,
  onChange,
  editable,
  agendaItems = [],
  embedded = false,
}: Props) {
  const content = (
    <>
      {editable ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...decisions, emptyDecisionRow()])}
          >
            Ajouter une décision
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {decisions.length === 0 ? (
          <p className="starium-form-hint">Aucune décision enregistrée.</p>
        ) : null}
        {decisions.map((row, i) => (
          <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`pr-dec-title-${i}`}>Titre</Label>
                <Input
                  id={`pr-dec-title-${i}`}
                  value={row.title}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange(decisions.map((x, j) => (j === i ? { ...x, title: v } : x)));
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`pr-dec-type-${i}`}>Type</Label>
                <select
                  id={`pr-dec-type-${i}`}
                  className="starium-form-select min-h-11"
                  value={row.decisionType}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value as ProjectReviewDecisionType;
                    onChange(
                      decisions.map((x, j) => (j === i ? { ...x, decisionType: v } : x)),
                    );
                  }}
                >
                  {DECISION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PROJECT_REVIEW_DECISION_TYPE_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`pr-dec-status-${i}`}>Statut</Label>
                <select
                  id={`pr-dec-status-${i}`}
                  className="starium-form-select min-h-11"
                  value={row.status}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value as ProjectReviewDecisionStatus;
                    onChange(decisions.map((x, j) => (j === i ? { ...x, status: v } : x)));
                  }}
                >
                  {DECISION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_REVIEW_DECISION_STATUS_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              {agendaItems.length > 0 ? (
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor={`pr-dec-agenda-${i}`}>Point d&apos;ordre du jour lié</Label>
                  <select
                    id={`pr-dec-agenda-${i}`}
                    className="starium-form-select min-h-11"
                    value={row.agendaItemId}
                    disabled={!editable}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange(
                        decisions.map((x, j) => (j === i ? { ...x, agendaItemId: v } : x)),
                      );
                    }}
                  >
                    <option value="">— Aucun —</option>
                    {agendaItems.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="grid gap-1.5 sm:col-span-2">
                <Label className="text-muted-foreground">Détail (optionnel)</Label>
                <textarea
                  className={textareaClass}
                  value={row.description}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange(
                      decisions.map((x, j) => (j === i ? { ...x, description: v } : x)),
                    );
                  }}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`pr-dec-impact-${i}`}>Impact</Label>
                <textarea
                  id={`pr-dec-impact-${i}`}
                  className={textareaClass}
                  value={row.impact}
                  disabled={!editable}
                  placeholder="Conséquences, périmètre, budget, planning…"
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange(decisions.map((x, j) => (j === i ? { ...x, impact: v } : x)));
                  }}
                />
              </div>
              {editable && decisions.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit text-destructive sm:col-span-2"
                  onClick={() => onChange(decisions.filter((_, j) => j !== i))}
                >
                  Retirer
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <ReviewEditorSection
      sectionId="pr-section-decisions"
      title="Décisions"
      description="Décisions formelles prises pendant le point : type, statut et impact."
      icon={ListChecks}
    >
      {content}
    </ReviewEditorSection>
  );
}

export { emptyDecisionRow };
