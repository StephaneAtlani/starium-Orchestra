'use client';

import Link from 'next/link';
import {
  CalendarRange,
  CloudRain,
  CloudSun,
  Database,
  FileText,
  Info,
  ListChecks,
  ListTodo,
  Scale,
  Sun,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

/** Selects / champs — bordure tokenisée (FRONTEND_UI-UX §2). */
const selectFieldClass = cn(
  'border-input bg-background h-9 w-full rounded-md border border-border/70 px-2.5 text-sm shadow-xs',
  'transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

const SECTION_ACCENTS = {
  sky: {
    bar: 'border-l-[3px] border-l-sky-500/70',
    icon: 'bg-sky-500/10 text-sky-800 dark:text-sky-300',
  },
  violet: {
    bar: 'border-l-[3px] border-l-violet-500/70',
    icon: 'bg-violet-500/10 text-violet-800 dark:text-violet-300',
  },
  emerald: {
    bar: 'border-l-[3px] border-l-emerald-500/70',
    icon: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  },
  amber: {
    bar: 'border-l-[3px] border-l-amber-500/70',
    icon: 'bg-amber-500/15 text-amber-950 dark:text-amber-300',
  },
  slate: {
    bar: 'border-l-[3px] border-l-slate-400/60',
    icon: 'bg-muted text-muted-foreground',
  },
} as const;

type SectionAccent = keyof typeof SECTION_ACCENTS;

function ReviewFormSection({
  sectionId,
  title,
  description,
  icon: Icon,
  accent = 'sky',
  children,
}: {
  sectionId: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  accent?: SectionAccent;
  children: React.ReactNode;
}) {
  const a = SECTION_ACCENTS[accent];
  return (
    <section
      className={cn(
        'rounded-xl border border-border/70 bg-card p-4 shadow-sm',
        a.bar,
      )}
      aria-labelledby={sectionId}
    >
      <div className="mb-4 flex gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            a.icon,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id={sectionId}
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

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

export type CommitteeMood = 'GREEN' | 'ORANGE' | 'RED';

const COMMITTEE_MOOD_KEY = 'committeeMood';

function parseContentPayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function readCommitteeMood(raw: unknown): CommitteeMood | null {
  const p = parseContentPayload(raw);
  const v = p[COMMITTEE_MOOD_KEY];
  if (v === 'GREEN' || v === 'ORANGE' || v === 'RED') return v;
  return null;
}

/** Bandeau compact en tête : santé + signaux + chiffres clés (lecture seule). */
function ProjectMeteoInline({ project }: { project: ProjectDetail }) {
  const av =
    project.derivedProgressPercent ?? project.progressPercent ?? null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs">
      <span className="font-medium text-muted-foreground">Indicateurs projet</span>
      <HealthBadge health={project.computedHealth} compact />
      <ProjectPortfolioBadges signals={project.signals} />
      <span className="hidden text-border sm:inline">|</span>
      <span className="tabular-nums text-muted-foreground">
        Av. {av != null ? `${av} %` : '—'}
      </span>
      <span className="tabular-nums text-muted-foreground">
        T·R·J {project.openTasksCount}/{project.openRisksCount}/{project.delayedMilestonesCount}
      </span>
    </div>
  );
}

const MOOD_CARDS: {
  id: CommitteeMood;
  label: string;
  hint: string;
  Icon: typeof Sun;
  accent: string;
  iconWrap: string;
}[] = [
  {
    id: 'GREEN',
    label: 'Serein',
    hint: 'Bon alignement, dynamique positive',
    Icon: Sun,
    accent: 'border-l-emerald-500/80',
    iconWrap: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'ORANGE',
    label: 'Mitigé',
    hint: 'Points de vigilance, sujets ouverts',
    Icon: CloudSun,
    accent: 'border-l-amber-500/80',
    iconWrap: 'bg-amber-500/15 text-amber-900 dark:text-amber-300',
  },
  {
    id: 'RED',
    label: 'Difficile',
    hint: 'Tensions fortes, risques ou blocages',
    Icon: CloudRain,
    accent: 'border-l-red-500/80',
    iconWrap: 'bg-destructive/15 text-destructive',
  },
];

function CommitteeMoodPicker({
  value,
  onChange,
  disabled,
}: {
  value: CommitteeMood | null;
  onChange: (v: CommitteeMood | null) => void;
  disabled?: boolean;
}) {
  return (
    <ReviewFormSection
      sectionId="pr-section-committee-mood"
      title="Météo du comité"
      description="Ressenti à la fin du point : enregistré dans le point et figé à la finalisation avec le snapshot."
      icon={CloudSun}
      accent="sky"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {MOOD_CARDS.map(({ id, label, hint, Icon, accent, iconWrap }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border border-border/60 bg-card p-3 text-left transition-all',
                'border-l-[3px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                accent,
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                disabled && 'pointer-events-none opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg',
                  iconWrap,
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
            </button>
          );
        })}
      </div>
      {!disabled && value != null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onChange(null)}
        >
          Effacer le choix
        </Button>
      )}
    </ReviewFormSection>
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
  const [committeeMood, setCommitteeMood] = useState<CommitteeMood | null>(null);

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
    setCommitteeMood(readCommitteeMood(d.contentPayload));
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
    const payloadBase = parseContentPayload(d?.contentPayload);
    const contentPayload = {
      ...payloadBase,
      [COMMITTEE_MOOD_KEY]: committeeMood,
    };
    return {
      reviewDate: fromLocalDatetimeInput(reviewDate),
      reviewType,
      title: title.trim() || null,
      executiveSummary: executiveSummary.trim() || null,
      nextReviewDate: nextReviewDate ? fromLocalDatetimeInput(nextReviewDate) : null,
      participants: parts,
      decisions: dec,
      actionItems: act,
      contentPayload,
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
        className="flex h-[min(92vh,900px)] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]"
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
          {open && projectQuery.data && <ProjectMeteoInline project={projectQuery.data} />}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6">
          {detailQuery.isLoading || !reviewId ? (
            <LoadingState rows={6} />
          ) : detailQuery.error || !d ? (
            <p className="text-sm text-destructive">Impossible de charger ce point.</p>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              <ReviewFormSection
                sectionId="pr-section-ident"
                title="Identification"
                description="Date, type de comité et libellé du point. Planifiez le prochain rendez-vous si besoin."
                icon={CalendarRange}
                accent="sky"
              >
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
                    <Label htmlFor="pr-ed-type">Type de point</Label>
                    <select
                      id="pr-ed-type"
                      className={selectFieldClass}
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
                      placeholder="Ex. COPIL — revue budget T2"
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
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-arb"
                title="Arbitrage (fiche projet)"
                description="Lecture seule : états des trois niveaux au moment de la consultation."
                icon={Scale}
                accent="violet"
              >
                <Alert className="border-border/70 bg-muted/40">
                  <Info className="size-4 text-muted-foreground" aria-hidden />
                  <AlertDescription className="text-xs text-muted-foreground">
                    Pour modifier les statuts d’arbitrage,{' '}
                    <Link
                      href={projectSheet(projectId)}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      ouvrez la fiche projet
                    </Link>
                    .
                  </AlertDescription>
                </Alert>
                {sheetQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : sheetQuery.data ? (
                  <ArbitrationReadonlyBlock sheet={sheetQuery.data} />
                ) : (
                  <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Fiche projet indisponible — ouvrez la fiche projet pour consulter l’arbitrage.
                  </p>
                )}
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-summary"
                title="Compte rendu"
                description="Synthèse exécutive : ordre du jour, décisions clés, arbitrages évoqués."
                icon={FileText}
                accent="emerald"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-ed-summary">Texte</Label>
                  <textarea
                    id="pr-ed-summary"
                    className={textareaClass}
                    value={executiveSummary}
                    disabled={!editable}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    placeholder="Ordre du jour, décisions clés, sujets arbitrés…"
                    maxLength={20000}
                  />
                </div>
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-participants"
                title="Parties prenantes"
                description="Présents au comité : rattachement compte optionnel, nom affiché, présence et obligation."
                icon={Users}
                accent="amber"
              >
                <div className="flex justify-end">
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
                      Ajouter un participant
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {participants.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/70 bg-muted/30 p-3"
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
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-decisions"
                title="Décisions"
                description="Décisions formelles prises pendant le point."
                icon={ListChecks}
                accent="sky"
              >
                <div className="flex justify-end">
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDecisions((prev) => [...prev, { title: '', description: '' }])
                      }
                    >
                      Ajouter une décision
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {decisions.map((row, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-3">
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
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-actions"
                title="Actions et suivi"
                description="Actions issues du point : statut type tâche, échéance, lien optionnel vers une tâche du projet."
                icon={ListTodo}
                accent="slate"
              >
                <div className="flex justify-end">
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
                      Ajouter une action
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {actions.map((a, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-3">
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
                            className={selectFieldClass}
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
              </ReviewFormSection>

              <CommitteeMoodPicker
                value={committeeMood}
                onChange={setCommitteeMood}
                disabled={!editable}
              />

              {d.snapshotPayload != null && (
                <ReviewFormSection
                  sectionId="pr-section-snapshot"
                  title="Snapshot figé"
                  description="État projet figé à la finalisation (lecture seule)."
                  icon={Database}
                  accent="slate"
                >
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
                    {JSON.stringify(d.snapshotPayload, null, 2)}
                  </pre>
                </ReviewFormSection>
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
