'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
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

const RECAP_EMPTY = "Aucune — saisir depuis un sujet de l'ordre du jour";

type Props = {
  decisions: ReviewDecisionFormRow[];
  onChange: (next: ReviewDecisionFormRow[]) => void;
  editable: boolean;
  agendaItems?: ProjectReviewAgendaItemApi[];
  embedded?: boolean;
  /** Onglet récap conduite : pas de CTA Ajouter, regroupement par sujet ODJ. */
  recapMode?: boolean;
  onOpenAgendaSubject?: (agendaItemId: string) => void;
};

function DecisionRowEditor({
  row,
  index,
  decisions,
  onChange,
  editable,
  agendaItems,
  showAgendaLink,
}: {
  row: ReviewDecisionFormRow;
  index: number;
  decisions: ReviewDecisionFormRow[];
  onChange: (next: ReviewDecisionFormRow[]) => void;
  editable: boolean;
  agendaItems: ProjectReviewAgendaItemApi[];
  showAgendaLink: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`pr-dec-title-${index}`}>Titre</Label>
          <Input
            id={`pr-dec-title-${index}`}
            value={row.title}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              onChange(decisions.map((x, j) => (j === index ? { ...x, title: v } : x)));
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-dec-type-${index}`}>Type</Label>
          <select
            id={`pr-dec-type-${index}`}
            className="starium-form-select min-h-11"
            value={row.decisionType}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value as ProjectReviewDecisionType;
              onChange(decisions.map((x, j) => (j === index ? { ...x, decisionType: v } : x)));
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
          <Label htmlFor={`pr-dec-status-${index}`}>Statut</Label>
          <select
            id={`pr-dec-status-${index}`}
            className="starium-form-select min-h-11"
            value={row.status}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value as ProjectReviewDecisionStatus;
              onChange(decisions.map((x, j) => (j === index ? { ...x, status: v } : x)));
            }}
          >
            {DECISION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_REVIEW_DECISION_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        {showAgendaLink && agendaItems.length > 0 ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`pr-dec-agenda-${index}`}>Point ODJ d&apos;origine</Label>
            <select
              id={`pr-dec-agenda-${index}`}
              className="starium-form-select min-h-11"
              value={row.agendaItemId}
              disabled={!editable}
              onChange={(e) => {
                const v = e.target.value;
                onChange(decisions.map((x, j) => (j === index ? { ...x, agendaItemId: v } : x)));
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
              onChange(decisions.map((x, j) => (j === index ? { ...x, description: v } : x)));
            }}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`pr-dec-impact-${index}`}>Impact</Label>
          <textarea
            id={`pr-dec-impact-${index}`}
            className={textareaClass}
            value={row.impact}
            disabled={!editable}
            placeholder="Conséquences, périmètre, budget, planning…"
            onChange={(e) => {
              const v = e.target.value;
              onChange(decisions.map((x, j) => (j === index ? { ...x, impact: v } : x)));
            }}
          />
        </div>
        {editable && decisions.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-destructive sm:col-span-2"
            onClick={() => onChange(decisions.filter((_, j) => j !== index))}
          >
            Retirer
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function groupDecisionsByAgenda(
  decisions: ReviewDecisionFormRow[],
): { agendaItemId: string; indices: number[] }[] {
  const order: string[] = [];
  const map = new Map<string, number[]>();
  decisions.forEach((row, index) => {
    const key = row.agendaItemId.trim() || '';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(index);
  });
  return order.map((agendaItemId) => ({
    agendaItemId,
    indices: map.get(agendaItemId) ?? [],
  }));
}

export function ReviewDecisionsSection({
  decisions,
  onChange,
  editable,
  agendaItems = [],
  embedded = false,
  recapMode = false,
  onOpenAgendaSubject,
}: Props) {
  const agendaTitleById = new Map(agendaItems.map((a) => [a.id, a.title]));

  const recapContent = (
    <div className="space-y-4">
      {decisions.length === 0 ? (
        <p className="starium-form-hint" role="status">
          {RECAP_EMPTY}
        </p>
      ) : (
        groupDecisionsByAgenda(decisions).map((group) => {
          const subjectTitle = group.agendaItemId
            ? displayLabel(agendaTitleById.get(group.agendaItemId), 'Sujet ODJ introuvable')
            : 'Sans sujet ODJ';
          return (
            <section
              key={group.agendaItemId || 'unlinked'}
              className="space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4"
              aria-label={`Décisions — ${subjectTitle}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">{subjectTitle}</h4>
                {group.agendaItemId && onOpenAgendaSubject ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onOpenAgendaSubject(group.agendaItemId)}
                  >
                    Ouvrir le sujet
                  </Button>
                ) : null}
              </div>
              {group.indices.map((index) => (
                <DecisionRowEditor
                  key={index}
                  row={decisions[index]}
                  index={index}
                  decisions={decisions}
                  onChange={onChange}
                  editable={editable}
                  agendaItems={agendaItems}
                  showAgendaLink={false}
                />
              ))}
            </section>
          );
        })
      )}
    </div>
  );

  const classicContent = (
    <>
      {agendaItems.length > 0 ? (
        <div
          className="mb-4 flex gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground"
          role="note"
        >
          <p>
            Une <strong className="font-medium text-foreground">décision formalisée</strong> est
            l&apos;acte tracé du point (type GO/NO GO, statut, impact). Elle peut être liée à un
            point d&apos;ordre du jour — distinct de la conclusion brouillon saisie lors de la
            conduite ODJ.
          </p>
        </div>
      ) : null}
      {editable ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
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
          <DecisionRowEditor
            key={i}
            row={row}
            index={i}
            decisions={decisions}
            onChange={onChange}
            editable={editable}
            agendaItems={agendaItems}
            showAgendaLink
          />
        ))}
      </div>
    </>
  );

  const content = recapMode ? recapContent : classicContent;

  if (embedded) return content;

  return (
    <ReviewEditorSection
      sectionId="pr-section-decisions"
      title={recapMode ? 'Récap décisions' : 'Décisions'}
      description={
        recapMode
          ? 'Synthèse des décisions formalisées — saisie depuis un sujet de l’ordre du jour.'
          : "Actes formalisés du point (type, validation, impact), rattachés optionnellement à un point d'ordre du jour."
      }
      icon={ListChecks}
    >
      {content}
    </ReviewEditorSection>
  );
}

export { emptyDecisionRow };
