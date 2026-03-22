'use client';

import Link from 'next/link';
import { CloudSun } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import {
  ARBITRATION_LEVEL_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { projectSheet } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import type { ProjectDetail, ProjectReviewType, ProjectSheet } from '../types/project.types';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

const REVIEW_TYPES: ProjectReviewType[] = [
  'COPIL',
  'COPRO',
  'CODIR_REVIEW',
  'RISK_REVIEW',
  'MILESTONE_REVIEW',
  'AD_HOC',
];

const ACTION_STATUSES = Object.keys(TASK_STATUS_LABEL) as Array<keyof typeof TASK_STATUS_LABEL>;

function toLocalDatetimeInput(iso: string): string {
  try {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function fromLocalDatetimeInput(local: string): string {
  return new Date(local).toISOString();
}

type ParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
};

type DecisionRow = { title: string; description: string };

type ActionRow = {
  title: string;
  status: string;
  dueDate: string;
  linkedTaskId: string;
};

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function AdvancementBar({
  manual,
  derived,
}: {
  manual: number | null;
  derived: number | null;
}) {
  const primary = derived ?? manual ?? 0;
  const w = Math.min(100, Math.max(0, Math.round(primary)));
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">Avancement</span>
        <span className="tabular-nums text-muted-foreground">
          Manuel{' '}
          <span className="font-medium text-foreground">
            {manual != null ? `${manual} %` : '—'}
          </span>
          <span className="mx-1 text-border">·</span>
          Dérivé{' '}
          <span className="font-medium text-foreground">
            {derived != null ? `${derived} %` : '—'}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/90 transition-[width]"
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

function ProjectMeteoStrip({ project }: { project: ProjectDetail }) {
  return (
    <div
      className="mt-3 rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 to-muted/20 p-3 shadow-sm"
      aria-labelledby="meteo-projet-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CloudSun className="size-4 shrink-0 text-sky-600/80 dark:text-sky-400/90" aria-hidden />
        <h2
          id="meteo-projet-heading"
          className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Météo projet & indicateurs
        </h2>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <HealthBadge health={project.computedHealth} />
        <ProjectPortfolioBadges signals={project.signals} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Priorité · criticité
          </p>
          <p className="mt-0.5 text-sm text-foreground">
            {PROJECT_PRIORITY_LABEL[project.priority] ?? project.priority} ·{' '}
            {PROJECT_CRITICALITY_LABEL[project.criticality] ?? project.criticality}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Échéance cible
          </p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
            {formatShortDate(project.targetEndDate)}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_minmax(0,14rem)] lg:items-end">
        <AdvancementBar
          manual={project.progressPercent}
          derived={project.derivedProgressPercent}
        />
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-background/50 px-2 py-2">
          <div className="text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Tâches
            </p>
            <p className="text-lg font-semibold tabular-nums text-primary">{project.openTasksCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Risques
            </p>
            <p className="text-lg font-semibold tabular-nums text-amber-800 dark:text-amber-400">
              {project.openRisksCount}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Jalons ret.
            </p>
            <p className="text-lg font-semibold tabular-nums text-destructive">
              {project.delayedMilestonesCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArbitrationReadonlyBlock({ sheet }: { sheet: ProjectSheet }) {
  const m = sheet.arbitrationMetierStatus;
  const c = sheet.arbitrationComiteStatus;
  const d = sheet.arbitrationCodirStatus;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Métier
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {ARBITRATION_LEVEL_STATUS_LABEL[m] ?? m}
        </p>
        {sheet.arbitrationMetierRefusalNote && (
          <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {sheet.arbitrationMetierRefusalNote}
          </p>
        )}
      </div>
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Comité
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {c ? (ARBITRATION_LEVEL_STATUS_LABEL[c] ?? c) : '—'}
        </p>
        {sheet.arbitrationComiteRefusalNote && (
          <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {sheet.arbitrationComiteRefusalNote}
          </p>
        )}
      </div>
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Sponsor / CODIR
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {d ? (ARBITRATION_LEVEL_STATUS_LABEL[d] ?? d) : '—'}
        </p>
        {sheet.arbitrationCodirRefusalNote && (
          <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {sheet.arbitrationCodirRefusalNote}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectReviewEditorDialog({
  projectId,
  reviewId,
  open,
  onOpenChange,
  canEdit,
}: {
  projectId: string;
  reviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}) {
  const detailQuery = useProjectReviewDetailQuery(projectId, reviewId);
  const projectQuery = useProjectDetailQuery(projectId);
  const sheetQuery = useProjectSheetQuery(projectId, { enabled: open });
  const { update, finalize, cancel } = useProjectReviewMutations(projectId);

  const [reviewDate, setReviewDate] = useState('');
  const [reviewType, setReviewType] = useState<ProjectReviewType>('COPIL');
  const [title, setTitle] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);

  const lastInitRef = useRef<string | null>(null);

  const initFromDetail = useCallback(() => {
    const d = detailQuery.data;
    if (!d) return;
    setReviewDate(toLocalDatetimeInput(d.reviewDate));
    setReviewType(d.reviewType);
    setTitle(d.title ?? '');
    setExecutiveSummary(d.executiveSummary ?? '');
    setNextReviewDate(d.nextReviewDate ? toLocalDatetimeInput(d.nextReviewDate) : '');
    setParticipants(
      d.participants.length
        ? d.participants.map((p) => ({
            displayName: p.displayName ?? '',
            userId: p.userId ?? '',
            attended: p.attended,
            isRequired: p.isRequired,
          }))
        : [{ displayName: '', userId: '', attended: true, isRequired: false }],
    );
    setDecisions(
      d.decisions.length
        ? d.decisions.map((x) => ({ title: x.title, description: x.description ?? '' }))
        : [{ title: '', description: '' }],
    );
    setActions(
      d.actionItems.length
        ? d.actionItems.map((a) => ({
            title: a.title,
            status: a.status,
            dueDate: a.dueDate ? toLocalDatetimeInput(a.dueDate) : '',
            linkedTaskId: a.linkedTaskId ?? '',
          }))
        : [
            {
              title: '',
              status: 'TODO',
              dueDate: '',
              linkedTaskId: '',
            },
          ],
    );
  }, [detailQuery.data]);

  useEffect(() => {
    if (!open) {
      lastInitRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !reviewId || !detailQuery.data || detailQuery.data.id !== reviewId) return;
    if (lastInitRef.current === reviewId) return;
    initFromDetail();
    lastInitRef.current = reviewId;
  }, [open, reviewId, detailQuery.data, initFromDetail]);

  const d = detailQuery.data;
  const isDraft = d?.status === 'DRAFT';
  const editable = canEdit && isDraft;

  const buildPatchBody = () => {
    const parts = participants
      .filter((p) => p.displayName.trim() || p.userId.trim())
      .map((p) => ({
        userId: p.userId.trim() || null,
        displayName: p.displayName.trim() || null,
        attended: p.attended,
        isRequired: p.isRequired,
      }));
    const dec = decisions
      .filter((x) => x.title.trim())
      .map((x) => ({
        title: x.title.trim(),
        description: x.description.trim() || null,
      }));
    const act = actions
      .filter((a) => a.title.trim())
      .map((a) => ({
        title: a.title.trim(),
        status: a.status,
        dueDate: a.dueDate ? fromLocalDatetimeInput(a.dueDate) : null,
        linkedTaskId: a.linkedTaskId.trim() || null,
      }));
    return {
      reviewDate: fromLocalDatetimeInput(reviewDate),
      reviewType,
      title: title.trim() || null,
      executiveSummary: executiveSummary.trim() || null,
      nextReviewDate: nextReviewDate ? fromLocalDatetimeInput(nextReviewDate) : null,
      participants: parts,
      decisions: dec,
      actionItems: act,
    };
  };

  const onSave = async () => {
    if (!d || !editable) return;
    await update.mutateAsync({ reviewId: d.id, body: buildPatchBody() });
  };

  const onFinalize = async () => {
    if (!d || !editable) return;
    await update.mutateAsync({ reviewId: d.id, body: buildPatchBody() });
    await finalize.mutateAsync(d.id);
    onOpenChange(false);
  };

  const onCancelReview = async () => {
    if (!d || !editable) return;
    await cancel.mutateAsync(d.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="border-b border-border/60 px-4 py-4 sm:px-6">
          <DialogTitle className="text-left">
            {d ? (
              <>
                Point projet —{' '}
                {PROJECT_REVIEW_TYPE_LABEL[d.reviewType] ?? d.reviewType}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({PROJECT_REVIEW_STATUS_LABEL[d.status] ?? d.status})
                </span>
              </>
            ) : (
              'Point projet'
            )}
          </DialogTitle>
          <p className="text-left text-xs text-muted-foreground">
            Complétez le compte rendu, vérifiez l’arbitrage sur la fiche, puis enregistrez et finalisez
            pour figer le snapshot.
          </p>
          {open && projectQuery.isLoading && (
            <div
              className="mt-3 h-24 animate-pulse rounded-xl border border-border/50 bg-muted/40"
              aria-hidden
            />
          )}
          {open && projectQuery.data && <ProjectMeteoStrip project={projectQuery.data} />}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {detailQuery.isLoading || !reviewId ? (
            <LoadingState rows={6} />
          ) : detailQuery.error || !d ? (
            <p className="text-sm text-destructive">Impossible de charger ce point.</p>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground">Identification</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-ed-date">Date du point</Label>
                    <Input
                      id="pr-ed-date"
                      type="datetime-local"
                      value={reviewDate}
                      disabled={!editable}
                      onChange={(e) => setReviewDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-ed-type">Type</Label>
                    <select
                      id="pr-ed-type"
                      className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-50"
                      value={reviewType}
                      disabled={!editable}
                      onChange={(e) => setReviewType(e.target.value as ProjectReviewType)}
                    >
                      {REVIEW_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {PROJECT_REVIEW_TYPE_LABEL[t] ?? t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="pr-ed-title">Titre</Label>
                    <Input
                      id="pr-ed-title"
                      value={title}
                      disabled={!editable}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="pr-ed-next">Prochain point (optionnel)</Label>
                    <Input
                      id="pr-ed-next"
                      type="datetime-local"
                      value={nextReviewDate}
                      disabled={!editable}
                      onChange={(e) => setNextReviewDate(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground">
                  Vérification — arbitrage (fiche projet)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lecture seule : états issus de la fiche décisionnelle.{' '}
                  <Link
                    href={projectSheet(projectId)}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ouvrir la fiche projet
                  </Link>{' '}
                  pour modifier l’arbitrage.
                </p>
                {sheetQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : sheetQuery.data ? (
                  <ArbitrationReadonlyBlock sheet={sheetQuery.data} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Fiche projet indisponible — ouvrez la fiche projet pour consulter l’arbitrage.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <Label htmlFor="pr-ed-summary">Compte rendu / synthèse exécutive</Label>
                <textarea
                  id="pr-ed-summary"
                  className={textareaClass}
                  value={executiveSummary}
                  disabled={!editable}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  placeholder="Ordre du jour, décisions clés, sujets arbitrés…"
                  maxLength={20000}
                />
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">Participants</h3>
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParticipants((prev) => [
                          ...prev,
                          { displayName: '', userId: '', attended: true, isRequired: false },
                        ])
                      }
                    >
                      Ajouter
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {participants.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label>Nom affiché</Label>
                          <Input
                            value={p.displayName}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParticipants((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, displayName: v } : x)),
                              );
                            }}
                            placeholder="Nom, rôle…"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-muted-foreground">ID utilisateur (optionnel)</Label>
                          <Input
                            value={p.userId}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParticipants((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, userId: v } : x)),
                              );
                            }}
                            placeholder="Si membre du client sur la plateforme"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-input"
                            checked={p.attended}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setParticipants((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, attended: v } : x)),
                              );
                            }}
                          />
                          Présent
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-input"
                            checked={p.isRequired}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setParticipants((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, isRequired: v } : x)),
                              );
                            }}
                          />
                          Requis
                        </label>
                        {editable && participants.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() =>
                              setParticipants((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            Retirer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">Décisions</h3>
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDecisions((prev) => [...prev, { title: '', description: '' }])
                      }
                    >
                      Ajouter
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {decisions.map((row, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="grid gap-2">
                        <div className="grid gap-1.5">
                          <Label>Titre</Label>
                          <Input
                            value={row.title}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDecisions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, title: v } : x)),
                              );
                            }}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-muted-foreground">Détail (optionnel)</Label>
                          <textarea
                            className={cn(textareaClass, 'min-h-[72px]')}
                            value={row.description}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDecisions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                              );
                            }}
                          />
                        </div>
                        {editable && decisions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-fit text-destructive"
                            onClick={() => setDecisions((prev) => prev.filter((_, j) => j !== i))}
                          >
                            Retirer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">Actions / suivi</h3>
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActions((prev) => [
                          ...prev,
                          { title: '', status: 'TODO', dueDate: '', linkedTaskId: '' },
                        ])
                      }
                    >
                      Ajouter
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {actions.map((a, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1.5 sm:col-span-2">
                          <Label>Libellé</Label>
                          <Input
                            value={a.title}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setActions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, title: v } : x)),
                              );
                            }}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Statut (tâche)</Label>
                          <select
                            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-50"
                            value={a.status}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setActions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, status: v } : x)),
                              );
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
                          <Label>Échéance</Label>
                          <Input
                            type="datetime-local"
                            value={a.dueDate}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setActions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, dueDate: v } : x)),
                              );
                            }}
                          />
                        </div>
                        <div className="grid gap-1.5 sm:col-span-2">
                          <Label className="text-muted-foreground">
                            ID tâche projet liée (optionnel)
                          </Label>
                          <Input
                            value={a.linkedTaskId}
                            disabled={!editable}
                            onChange={(e) => {
                              const v = e.target.value;
                              setActions((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, linkedTaskId: v } : x)),
                              );
                            }}
                            placeholder="Référence tâche du même projet"
                          />
                        </div>
                        {editable && actions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-fit text-destructive sm:col-span-2"
                            onClick={() => setActions((prev) => prev.filter((_, j) => j !== i))}
                          >
                            Retirer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {d.snapshotPayload != null && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground">Snapshot figé</h3>
                  <pre className="max-h-48 overflow-auto rounded-md border border-border/60 bg-muted/40 p-3 text-xs">
                    {JSON.stringify(d.snapshotPayload, null, 2)}
                  </pre>
                </section>
              )}
            </div>
          )}
        </div>

        {d && (
          <DialogFooter className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onSave()}
                      disabled={update.isPending}
                    >
                      {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => void onFinalize()}
                      disabled={finalize.isPending || update.isPending}
                    >
                      {finalize.isPending ? 'Finalisation…' : 'Finaliser le point'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => void onCancelReview()}
                      disabled={cancel.isPending}
                    >
                      Annuler le point
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
