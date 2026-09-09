'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import {
  PROJECT_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewDecisionApi,
} from '../types/project.types';
import { ReviewEditorSection } from './review-editor-section';
import { ListTodo } from 'lucide-react';

export type ReviewActionContributorRow = {
  userId: string;
  displayName: string;
  roleLabel: string;
};

export type ReviewActionFormRow = {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  linkedTaskId: string;
  responsibleUserId: string;
  decisionId: string;
  agendaItemId: string;
  contributors: ReviewActionContributorRow[];
};

const ACTION_STATUSES = Object.keys(TASK_STATUS_LABEL);
const PRIORITIES = Object.keys(PROJECT_PRIORITY_LABEL);

const textareaClass = cn('starium-form-textarea min-h-[72px] resize-y');
const selectFieldClass = 'starium-form-select min-h-11';

export const emptyActionRow = (): ReviewActionFormRow => ({
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  linkedTaskId: '',
  responsibleUserId: '',
  decisionId: '',
  agendaItemId: '',
  contributors: [],
});

const RECAP_EMPTY = "Aucune — saisir depuis un sujet de l'ordre du jour";

function displayNameFromUser(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function groupActionsByAgenda(
  actions: ReviewActionFormRow[],
): { agendaItemId: string; indices: number[] }[] {
  const order: string[] = [];
  const map = new Map<string, number[]>();
  actions.forEach((row, index) => {
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

type Props = {
  projectId: string;
  decisions: ProjectReviewDecisionApi[];
  actions: ReviewActionFormRow[];
  onChange: (next: ReviewActionFormRow[]) => void;
  editable: boolean;
  embedded?: boolean;
  agendaItems?: ProjectReviewAgendaItemApi[];
  /** Onglet récap conduite : pas de CTA Ajouter, regroupement par sujet ODJ. */
  recapMode?: boolean;
  onOpenAgendaSubject?: (agendaItemId: string) => void;
};

export function ReviewActionsSection({
  projectId,
  decisions,
  actions,
  onChange,
  editable,
  embedded = false,
  agendaItems = [],
  recapMode = false,
  onOpenAgendaSubject,
}: Props) {
  const assignable = useProjectAssignableUsers();
  const tasksQuery = useProjectTasksQuery(projectId);
  const agendaTitleById = new Map(agendaItems.map((a) => [a.id, a.title]));

  const renderActionRow = (a: ReviewActionFormRow, i: number) => (
    <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`pr-act-title-${i}`}>Libellé</Label>
          <Input
            id={`pr-act-title-${i}`}
            value={a.title}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, title: v } : x)));
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-act-status-${i}`}>Statut</Label>
          <select
            id={`pr-act-status-${i}`}
            className={selectFieldClass}
            value={a.status}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, status: v } : x)));
            }}
          >
            {ACTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-act-priority-${i}`}>Priorité</Label>
          <select
            id={`pr-act-priority-${i}`}
            className={selectFieldClass}
            value={a.priority}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, priority: v } : x)));
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PROJECT_PRIORITY_LABEL[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-act-due-${i}`}>Échéance</Label>
          <ProjectDatetimeLocalInput
            id={`pr-act-due-${i}`}
            value={a.dueDate}
            disabled={!editable}
            onChange={(v) => {
              onChange(actions.map((x, j) => (j === i ? { ...x, dueDate: v } : x)));
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`pr-act-resp-${i}`}>Responsable</Label>
          <select
            id={`pr-act-resp-${i}`}
            className={selectFieldClass}
            value={a.responsibleUserId}
            disabled={!editable || assignable.isLoading}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, responsibleUserId: v } : x)));
            }}
          >
            <option value="">— Choisir —</option>
            {assignable.data?.users?.map((u) => (
              <option key={u.id} value={u.id}>
                {displayNameFromUser(u)}
              </option>
            ))}
          </select>
        </div>
        {decisions.filter((d) => d.title.trim()).length > 0 ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`pr-act-dec-${i}`}>Décision liée</Label>
            <select
              id={`pr-act-dec-${i}`}
              className={selectFieldClass}
              value={a.decisionId}
              disabled={!editable}
              onChange={(e) => {
                const v = e.target.value;
                onChange(actions.map((x, j) => (j === i ? { ...x, decisionId: v } : x)));
              }}
            >
              <option value="">— Aucune —</option>
              {decisions
                .filter((d) => d.title.trim())
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-1.5 sm:col-span-2">
          <Label className="text-muted-foreground">Description (optionnel)</Label>
          <textarea
            className={textareaClass}
            value={a.description}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, description: v } : x)));
            }}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`pr-act-task-${i}`}>Tâche projet liée</Label>
          <select
            id={`pr-act-task-${i}`}
            className={selectFieldClass}
            value={a.linkedTaskId}
            disabled={!editable || tasksQuery.isLoading}
            onChange={(e) => {
              const v = e.target.value;
              onChange(actions.map((x, j) => (j === i ? { ...x, linkedTaskId: v } : x)));
            }}
          >
            <option value="">— Aucune —</option>
            {(tasksQuery.data?.items ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.code ? ` (${t.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Contributeurs</Label>
            {editable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() =>
                  onChange(
                    actions.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            contributors: [
                              ...x.contributors,
                              { userId: '', displayName: '', roleLabel: '' },
                            ],
                          }
                        : x,
                    ),
                  )
                }
              >
                Ajouter
              </Button>
            ) : null}
          </div>
          {a.contributors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun contributeur.</p>
          ) : (
            <ul className="space-y-2">
              {a.contributors.map((c, ci) => (
                <li
                  key={ci}
                  className="grid gap-2 rounded-md border border-border/60 bg-background/80 p-2 sm:grid-cols-3"
                >
                  <select
                    className={selectFieldClass}
                    value={c.userId}
                    disabled={!editable}
                    aria-label={`Contributeur ${ci + 1}`}
                    onChange={(e) => {
                      const uid = e.target.value;
                      const u = assignable.data?.users?.find((x) => x.id === uid);
                      onChange(
                        actions.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                contributors: x.contributors.map((cc, cj) =>
                                  cj === ci
                                    ? {
                                        ...cc,
                                        userId: uid,
                                        displayName: u ? displayNameFromUser(u) : cc.displayName,
                                      }
                                    : cc,
                                ),
                              }
                            : x,
                        ),
                      );
                    }}
                  >
                    <option value="">— Membre —</option>
                    {assignable.data?.users?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {displayNameFromUser(u)}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={c.roleLabel}
                    disabled={!editable}
                    placeholder="Rôle"
                    aria-label={`Rôle contributeur ${ci + 1}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange(
                        actions.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                contributors: x.contributors.map((cc, cj) =>
                                  cj === ci ? { ...cc, roleLabel: v } : cc,
                                ),
                              }
                            : x,
                        ),
                      );
                    }}
                  />
                  {editable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 text-destructive"
                      onClick={() =>
                        onChange(
                          actions.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  contributors: x.contributors.filter((_, cj) => cj !== ci),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      Retirer
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        {editable && actions.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit min-h-11 text-destructive sm:col-span-2"
            onClick={() => onChange(actions.filter((_, j) => j !== i))}
          >
            Retirer l&apos;action
          </Button>
        ) : null}
      </div>
    </div>
  );

  const recapContent = (
    <div className="space-y-4">
      {actions.length === 0 ? (
        <p className="starium-form-hint" role="status">
          {RECAP_EMPTY}
        </p>
      ) : (
        groupActionsByAgenda(actions).map((group) => {
          const subjectTitle = group.agendaItemId
            ? displayLabel(agendaTitleById.get(group.agendaItemId), 'Sujet ODJ introuvable')
            : 'Sans sujet ODJ';
          return (
            <section
              key={group.agendaItemId || 'unlinked'}
              className="space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4"
              aria-label={`Actions — ${subjectTitle}`}
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
              {group.indices.map((index) => renderActionRow(actions[index], index))}
            </section>
          );
        })
      )}
    </div>
  );

  const classicContent = (
    <>
      {editable ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => onChange([...actions, emptyActionRow()])}
          >
            Ajouter une action
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <p className="starium-form-hint">Aucune action enregistrée.</p>
        ) : null}
        {actions.map((a, i) => renderActionRow(a, i))}
      </div>
    </>
  );

  const content = recapMode ? recapContent : classicContent;

  if (embedded) return content;

  return (
    <ReviewEditorSection
      sectionId="pr-section-actions"
      title={recapMode ? 'Récap actions' : 'Actions et suivi'}
      description={
        recapMode
          ? 'Synthèse des actions — saisie depuis un sujet de l’ordre du jour.'
          : 'Actions issues du point : responsable, contributeurs, priorité et lien décision.'
      }
      icon={ListTodo}
    >
      {content}
    </ReviewEditorSection>
  );
}
