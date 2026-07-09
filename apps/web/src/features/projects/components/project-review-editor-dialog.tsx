'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ChevronDown,
  CloudRain,
  CloudSun,
  FileText,
  Flag,
  History,
  Info,
  Scale,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  ARBITRATION_LEVEL_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  projectWarningLabel,
} from '../constants/project-enum-labels';
import {
  POST_MORTEM_EMPTY,
  readPostMortemPayload,
  type PostMortemPayload,
} from '../lib/project-post-mortem-payload';
import { getReviewTypeOptionsForEditor } from '../lib/project-review-post-mortem';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import { PostMortemIndicatorsBlock } from './post-mortem-indicators-block';
import { ReviewEditorSection } from './review-editor-section';
import { ReviewAgendaSection, ReviewMeetingInfoBlock } from './review-agenda-section';
import { ReviewParticipantsSection } from './review-participants-section';
import { ReviewInvitationsSection } from './review-invitations-section';
import { ReviewPlannedPlanningFields } from './review-planned-planning-fields';
import {
  ReviewDecisionsSection,
  emptyDecisionRow,
  type ReviewDecisionFormRow,
} from './review-decisions-section';
import {
  ReviewActionsSection,
  emptyActionRow,
  type ReviewActionFormRow,
} from './review-actions-section';
import { ReviewAttachmentsSection } from './review-attachments-section';
import { ReviewHistorySection } from './review-history-section';
import {
  canStartReview,
  isReviewContentEditable,
  isReviewPlanningEditable,
  normalizeReviewStatus,
} from '../lib/project-review-status';
import { projectSheet } from '../constants/project-routes';
import { updateProject } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import type {
  ProjectDetail,
  ProjectReviewActionItemApi,
  ProjectReviewListItem,
  ProjectReviewType,
  ProjectSheet,
} from '../types/project.types';

const textareaClass = cn(
  'starium-form-textarea min-h-[100px] resize-y',
);

const selectFieldClass = 'starium-form-select min-h-11';

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
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

function formatLocalDatetimeFr(local: string): string {
  if (!local.trim()) return '';
  try {
    return new Date(local).toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch {
    return local;
  }
}

type DecisionRow = ReviewDecisionFormRow;
type ActionRow = ReviewActionFormRow;

function pickPreviousReviewId(
  items: ProjectReviewListItem[],
  currentId: string,
): string | null {
  const sorted = [...items].sort((a, b) => {
    const ta = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
    const tb = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
    return tb - ta || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const idx = sorted.findIndex((x) => x.id === currentId);
  if (idx === -1 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1]?.id ?? null;
}

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

/** Bandeau indicateurs projet (lecture seule). */
function ProjectMeteoInline({
  project,
  badgeMerged,
  embedded = false,
}: {
  project: ProjectDetail;
  badgeMerged: MergedUiBadges;
  embedded?: boolean;
}) {
  const av =
    project.derivedProgressPercent ?? project.progressPercent ?? null;
  const content = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <HealthBadge health={project.computedHealth} compact merged={badgeMerged} />
        <ProjectPortfolioBadges signals={project.signals} merged={badgeMerged} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs sm:border-t-0 sm:pt-0">
        <span className="tabular-nums text-muted-foreground">
          <span className="starium-overline mr-1">Avancement</span>
          <span className="font-semibold text-foreground">
            {av != null ? `${av} %` : '—'}
          </span>
        </span>
        <span className="hidden h-4 w-px bg-border/70 sm:block" aria-hidden />
        <span className="tabular-nums text-muted-foreground" title="Tâches · Risques · Jalons en retard">
          <span className="starium-overline mr-1">T·R·J</span>
          <span className="font-semibold text-foreground">
            {project.openTasksCount}/{project.openRisksCount}/{project.delayedMilestonesCount}
          </span>
        </span>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">{content}</div>
    );
  }

  return (
    <ReviewEditorSection
      sectionId="pr-ed-meteo"
      title="Indicateurs projet"
      description="Santé, signaux et avancement au moment du point."
      icon={Target}
    >
      {content}
    </ReviewEditorSection>
  );
}

function classifyPrevReviewAction(
  a: ProjectReviewActionItemApi,
): 'done' | 'in_progress' | 'late' {
  const done = a.status === 'DONE' || a.status === 'CANCELLED';
  if (done) return 'done';
  const due = a.dueDate ? new Date(a.dueDate).getTime() : null;
  if (due != null && due < Date.now()) return 'late';
  return 'in_progress';
}

const POST_MORTEM_NARRATIVE_FIELDS = [
  ['objectifs', 'Objectifs / cadrage initial'],
  ['resultats', 'Résultats obtenus'],
  ['ecarts', 'Écarts (plan, budget, délais…)'],
  ['causes', 'Causes / analyse'],
  ['leconsApprises', 'Leçons apprises'],
  ['recommandations', 'Recommandations / capitalisation'],
] as const;

function reviewEditorStatusBadgeClass(status: string): string {
  const normalized = normalizeReviewStatus(status as import('../types/project.types').ProjectReviewStatus);
  if (status === 'FINALIZED') return 'starium-ds-badge--success';
  if (
    normalized === 'IN_PROGRESS' ||
    status === 'IN_REVIEW' ||
    status === 'DRAFT'
  ) {
    return 'starium-ds-badge--warn';
  }
  if (normalized === 'SCHEDULED' || status === 'PLANNED') return 'starium-ds-badge--info';
  if (normalized === 'PREPARING') return 'starium-ds-badge--neutral';
  if (status === 'CANCELLED') return 'starium-ds-badge--neutral';
  return 'starium-ds-badge--info';
}

function formatReviewDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function formatDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
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
    <ReviewEditorSection
      sectionId="pr-section-committee-mood"
      title="Météo du comité"
      description="Ressenti à la fin du point : enregistré dans le point et figé à la finalisation avec le snapshot."
      icon={CloudSun}
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
    </ReviewEditorSection>
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
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const sheetQuery = useProjectSheetQuery(projectId, { enabled: open });
  const reviewsListQuery = useProjectReviewsQuery(projectId, { enabled: open });
  const previousReviewId = useMemo(() => {
    if (!open || !reviewId || !reviewsListQuery.data?.length) return null;
    return pickPreviousReviewId(reviewsListQuery.data, reviewId);
  }, [open, reviewId, reviewsListQuery.data]);

  const previousDetailQuery = useProjectReviewDetailQuery(projectId, previousReviewId);
  const milestonesQuery = useProjectMilestonesQuery(projectId, { enabled: open });
  const risksQuery = useProjectRisksQuery(projectId, { enabled: open });
  const tasksQuery = useProjectTasksQuery(projectId, { enabled: open });
  const { update, finalize, cancel, startReview } = useProjectReviewMutations(projectId);

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canUpdateProject = has('projects.update');
  const updateProjectStatusMutation = useMutation({
    mutationFn: (status: string) => updateProject(authFetch, projectId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
  });

  const [reviewDate, setReviewDate] = useState('');
  const [reviewType, setReviewType] = useState<ProjectReviewType>('COPIL');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');
  /** Saisie locale (datetime-local) — peut différer du créneau validé pour l’API. */
  const [nextReviewDate, setNextReviewDate] = useState('');
  /** Créneau du prochain point accepté : envoyé au PATCH et déclenche la création du brouillon côté API. */
  const [committedNextReviewDate, setCommittedNextReviewDate] = useState<string | null>(null);
  const [confirmNextOpen, setConfirmNextOpen] = useState(false);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [committeeMood, setCommitteeMood] = useState<CommitteeMood | null>(null);
  const [postMortemForm, setPostMortemForm] = useState<PostMortemPayload>(POST_MORTEM_EMPTY);
  const [editorTab, setEditorTab] = useState('general');

  const lastInitRef = useRef<string | null>(null);
  /** Snapshot JSON de `buildPatchBody()` — évite les PATCH inutiles et sert de ligne de base après init. */
  const lastSavedSerializedRef = useRef<string | null>(null);

  const initFromDetail = useCallback(() => {
    const d = detailQuery.data;
    if (!d) return;
    setReviewDate(d.reviewDate ? toLocalDatetimeInput(d.reviewDate) : '');
    setReviewType(d.reviewType);
    setTitle(d.title ?? '');
    setObjective(d.objective ?? d.executiveSummary ?? '');
    setExecutiveSummary(d.executiveSummary ?? '');
    const nextLocal = d.nextReviewDate ? toLocalDatetimeInput(d.nextReviewDate) : '';
    setNextReviewDate(nextLocal);
    setCommittedNextReviewDate(nextLocal === '' ? null : nextLocal);
    setDecisions(
      d.decisions.length
        ? d.decisions.map((x) => ({
            title: x.title,
            description: x.description ?? '',
            decisionType: x.decisionType,
            status: x.status,
            impact: x.impact ?? '',
            agendaItemId: x.agendaItemId ?? '',
          }))
        : [emptyDecisionRow()],
    );
    setActions(
      d.actionItems.length
        ? d.actionItems.map((a) => ({
            title: a.title,
            description: a.description ?? '',
            status: a.status,
            priority: a.priority ?? 'MEDIUM',
            dueDate: a.dueDate ? toLocalDatetimeInput(a.dueDate) : '',
            linkedTaskId: a.linkedTaskId ?? '',
            responsibleUserId: a.responsibleUserId ?? '',
            decisionId: a.decisionId ?? '',
            contributors: (a.contributors ?? []).map((c) => ({
              userId: c.userId ?? '',
              displayName: c.displayName ?? '',
              roleLabel: c.roleLabel ?? '',
            })),
          }))
        : [emptyActionRow()],
    );
    setCommitteeMood(readCommitteeMood(d.contentPayload));
    setPostMortemForm(readPostMortemPayload(d.contentPayload));
  }, [detailQuery.data]);

  useEffect(() => {
    if (reviewType === 'POST_MORTEM') {
      setNextReviewDate('');
      setCommittedNextReviewDate(null);
      setConfirmNextOpen(false);
    }
  }, [reviewType]);

  useEffect(() => {
    if (!open) {
      lastInitRef.current = null;
      lastSavedSerializedRef.current = null;
      setConfirmNextOpen(false);
      setEditorTab('general');
    }
  }, [open]);

  useEffect(() => {
    lastSavedSerializedRef.current = null;
  }, [reviewId]);

  useEffect(() => {
    if (!open || !reviewId || !detailQuery.data || detailQuery.data.id !== reviewId) return;
    if (lastInitRef.current === reviewId) return;
    initFromDetail();
    lastInitRef.current = reviewId;
  }, [open, reviewId, detailQuery.data, initFromDetail]);

  const d = detailQuery.data;
  const canStart = d ? canStartReview(d.status) : false;
  const editable = canEdit && d ? isReviewContentEditable(d.status) : false;
  const planningEditable = canEdit && d ? isReviewPlanningEditable(d.status) : false;
  const projectStatus = projectQuery.data?.status;
  const reviewTypeOptions = useMemo(
    () => getReviewTypeOptionsForEditor(projectStatus, reviewType),
    [projectStatus, reviewType],
  );

  const buildPatchBody = useCallback(
    (opts?: { committedNextReviewOverride?: string | null }) => {
      const committedForApi =
        opts?.committedNextReviewOverride !== undefined
          ? opts.committedNextReviewOverride
          : committedNextReviewDate;
      const dec = decisions
        .filter((x) => x.title.trim())
        .map((x) => ({
          title: x.title.trim(),
          description: x.description.trim() || null,
          decisionType: x.decisionType,
          status: x.status,
          impact: x.impact.trim() || null,
          agendaItemId: x.agendaItemId.trim() || null,
        }));
      const act = actions
        .filter((a) => a.title.trim())
        .map((a) => ({
          title: a.title.trim(),
          description: a.description.trim() || null,
          status: a.status,
          priority: a.priority || null,
          dueDate: a.dueDate ? fromLocalDatetimeInput(a.dueDate) : null,
          linkedTaskId: a.linkedTaskId.trim() || null,
          responsibleUserId: a.responsibleUserId.trim() || null,
          decisionId: a.decisionId.trim() || null,
          contributors: a.contributors
            .filter((c) => c.userId.trim() || c.displayName.trim())
            .map((c) => ({
              userId: c.userId.trim() || null,
              displayName: c.displayName.trim() || null,
              roleLabel: c.roleLabel.trim() || null,
            })),
        }));
      const payloadBase = parseContentPayload(d?.contentPayload);
      const contentPayload: Record<string, unknown> =
        reviewType === 'POST_MORTEM'
          ? {
              ...payloadBase,
              postMortem: { ...postMortemForm },
            }
          : {
              ...payloadBase,
              [COMMITTEE_MOOD_KEY]: committeeMood,
            };
      if (reviewType === 'POST_MORTEM') {
        delete contentPayload[COMMITTEE_MOOD_KEY];
      } else {
        delete contentPayload.postMortem;
      }
      return {
        ...(reviewDate.trim() ? { reviewDate: fromLocalDatetimeInput(reviewDate) } : { reviewDate: null }),
        reviewType,
        title: title.trim() || null,
        objective: objective.trim() || null,
        executiveSummary: executiveSummary.trim() || objective.trim() || null,
        nextReviewDate:
          reviewType === 'POST_MORTEM'
            ? null
            : committedForApi && committedForApi.trim()
              ? fromLocalDatetimeInput(committedForApi)
              : null,
        decisions: dec,
        actionItems: act,
        contentPayload,
      };
    },
    [
      committedNextReviewDate,
      decisions,
      actions,
      objective,
      d,
      reviewType,
      postMortemForm,
      committeeMood,
      reviewDate,
      title,
      executiveSummary,
    ],
  );

  const buildPlannedPatchBody = useCallback(
    () => ({
      ...(reviewDate.trim() ? { reviewDate: fromLocalDatetimeInput(reviewDate) } : { reviewDate: null }),
      title: title.trim() || null,
      objective: objective.trim() || null,
    }),
    [reviewDate, title, objective],
  );

  /** Sauvegarde automatique du brouillon (debounce) — pas de clic « Enregistrer » requis. */
  useEffect(() => {
    if (!open || !editable || !d || !reviewId) return;
    if (lastInitRef.current !== reviewId) return;

    const t = window.setTimeout(() => {
      const body = buildPatchBody();
      const s = JSON.stringify(body);
      if (lastSavedSerializedRef.current === null) {
        lastSavedSerializedRef.current = s;
        return;
      }
      if (s === lastSavedSerializedRef.current) return;
      update.mutate(
        { reviewId: d.id, body },
        {
          onSuccess: () => {
            lastSavedSerializedRef.current = s;
          },
        },
      );
    }, 1200);

    return () => window.clearTimeout(t);
  }, [
    open,
    editable,
    d,
    reviewId,
    reviewDate,
    reviewType,
    title,
    objective,
    executiveSummary,
    committedNextReviewDate,
    decisions,
    actions,
    committeeMood,
    postMortemForm,
    update,
    buildPatchBody,
  ]);

  useEffect(() => {
    if (!open || !planningEditable || !d || !reviewId) return;
    if (lastInitRef.current !== reviewId) return;

    const t = window.setTimeout(() => {
      const body = buildPlannedPatchBody();
      const s = JSON.stringify(body);
      if (lastSavedSerializedRef.current === null) {
        lastSavedSerializedRef.current = s;
        return;
      }
      if (s === lastSavedSerializedRef.current) return;
      update.mutate(
        { reviewId: d.id, body },
        {
          onSuccess: () => {
            lastSavedSerializedRef.current = s;
          },
        },
      );
    }, 1200);

    return () => window.clearTimeout(t);
  }, [
    open,
    planningEditable,
    d,
    reviewId,
    reviewDate,
    title,
    update,
    buildPlannedPatchBody,
  ]);

  const pilotageSinceLast = useMemo(() => {
    const prev = previousDetailQuery.data;
    const tasks = tasksQuery.data?.items;
    if (!prev || !tasks) return null;
    const refDate = prev.finalizedAt ?? prev.reviewDate;
    if (!refDate) return null;
    const t0 = new Date(refDate).getTime();
    const tasksDoneSince = tasks.filter(
      (x) =>
        x.actualEndDate &&
        new Date(x.actualEndDate).getTime() >= t0 &&
        (x.status === 'DONE' || x.status === 'CANCELLED'),
    );
    return {
      tasksDoneSinceCount: tasksDoneSince.length,
      openRisksCount: risksQuery.data?.filter((r) => r.status === 'OPEN').length ?? 0,
    };
  }, [previousDetailQuery.data, tasksQuery.data, risksQuery.data]);

  const needsNextPointConfirmation = useMemo(
    () =>
      Boolean(
        editable &&
          nextReviewDate.trim() !== '' &&
          nextReviewDate !== (committedNextReviewDate ?? ''),
      ),
    [editable, nextReviewDate, committedNextReviewDate],
  );

  const nextReviewParticipantPreview = useMemo(() => {
    return (d?.participants ?? [])
      .filter((p) => p.displayName?.trim() || p.userId?.trim())
      .map((p) => ({
        key: p.id,
        label: p.displayName?.trim() || 'Participant',
        isRequired: false,
      }));
  }, [d?.participants]);

  const handleConfirmNextReview = async () => {
    if (!d || !editable) return;
    const nextCommit = nextReviewDate.trim();
    if (!nextCommit) return;
    const body = buildPatchBody({ committedNextReviewOverride: nextCommit });
    try {
      await update.mutateAsync({ reviewId: d.id, body });
      setCommittedNextReviewDate(nextCommit);
      lastSavedSerializedRef.current = JSON.stringify(body);
      setConfirmNextOpen(false);
    } catch {
      /* erreur affichée par la mutation / boundary */
    }
  };

  const actionFormAlerts = useMemo(() => {
    const filled = actions.filter((a) => a.title.trim());
    const msgs: string[] = [];
    if (editable && filled.length === 0) {
      msgs.push('Aucune action enregistrée pour ce point — une réunion sans sortie est difficile à piloter.');
    }
    for (const a of filled) {
      if (!a.dueDate.trim()) {
        msgs.push(`Échéance manquante : « ${a.title.length > 48 ? `${a.title.slice(0, 48)}…` : a.title} »`);
      }
    }
    return msgs;
  }, [actions, editable]);

  const onSave = async () => {
    if (!d || !editable) return;
    const body = buildPatchBody();
    await update.mutateAsync({ reviewId: d.id, body });
    lastSavedSerializedRef.current = JSON.stringify(body);
  };

  const onFinalize = async () => {
    if (!d || !editable) return;
    if (needsNextPointConfirmation) {
      setConfirmNextOpen(true);
      return;
    }
    const body = buildPatchBody();
    await update.mutateAsync({ reviewId: d.id, body });
    lastSavedSerializedRef.current = JSON.stringify(body);
    await finalize.mutateAsync(d.id);
    onOpenChange(false);
  };

  const onCancelReview = async () => {
    if (!d || (!editable && !planningEditable)) return;
    await cancel.mutateAsync(d.id);
    onOpenChange(false);
  };

  const onStartReview = async () => {
    if (!d || !canStart || !canEdit) return;
    try {
      await startReview.mutateAsync(d.id);
    } catch {
      toast.error('Impossible de démarrer le point.');
    }
  };

  const isPostMortemReview = reviewType === 'POST_MORTEM';

  const reviewTabPanelClass =
    'starium-form mt-0 flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain';

  return (
    <>
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="min-w-0 flex-1">
          <p className="starium-overline mb-1">
            {isPostMortemReview ? 'Clôture projet' : 'Point de pilotage'}
          </p>
          <span className="text-left text-lg font-semibold leading-snug">
            {d
              ? `${PROJECT_REVIEW_TYPE_LABEL[d.reviewType] ?? d.reviewType}${projectQuery.data?.name ? ` — ${projectQuery.data.name}` : ''}`
              : 'Point projet'}
          </span>
          {d ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 text-muted-foreground">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                {formatReviewDateTime(d.reviewDate)}
              </span>
              {d.title ? (
                <span className="text-muted-foreground">
                  Objet :{' '}
                  <span className="font-medium text-foreground">{d.title}</span>
                </span>
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  {isPostMortemReview ? 'Sans titre de bilan' : 'Sans titre de séance'}
                </span>
              )}
            </div>
          ) : null}
        </div>
      }
      description={
        isPostMortemReview
          ? "Éditeur de retour d'expérience — bilan, écarts et leçons apprises"
          : 'Éditeur de point projet — compte rendu, décisions et actions'
      }
      icon={isPostMortemReview ? BookOpen : CalendarClock}
      size="xl"
      contentClassName="flex h-[min(92vh,900px)] max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-3 sm:p-4"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden py-2"
      status={
        d ? (
          <span
            className={cn(
              'starium-ds-badge shrink-0',
              reviewEditorStatusBadgeClass(d.status),
            )}
          >
            {PROJECT_REVIEW_STATUS_LABEL[d.status] ?? d.status}
          </span>
        ) : undefined
      }
      footer={
        d ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              {editable && (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {update.isPending
                    ? 'Enregistrement…'
                    : isPostMortemReview
                      ? 'REX synchronisé automatiquement'
                      : 'Point synchronisé automatiquement'}
                </span>
              )}
              {canStart && startReview.isSuccess ? (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Point démarré — vous pouvez saisir le compte rendu.
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canStart && canEdit && (
                <Button
                  type="button"
                  variant="default"
                  className="min-h-11"
                  onClick={() => void onStartReview()}
                  disabled={startReview.isPending}
                >
                  {startReview.isPending ? 'Démarrage…' : 'Démarrer le point'}
                </Button>
              )}
              {editable && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onSave()}
                    disabled={update.isPending}
                  >
                    {update.isPending ? 'Enregistrement…' : 'Enregistrer maintenant'}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => void onFinalize()}
                    disabled={finalize.isPending || update.isPending}
                  >
                    {finalize.isPending
                      ? 'Finalisation…'
                      : isPostMortemReview
                        ? "Finaliser le retour d'expérience"
                        : 'Finaliser le point'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => void onCancelReview()}
                    disabled={cancel.isPending}
                  >
                    {isPostMortemReview ? 'Annuler le brouillon' : 'Annuler le point'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : undefined
      }
    >
          {detailQuery.isLoading || !reviewId ? (
            <div className="flex min-h-0 flex-1 items-start">
              <LoadingState rows={6} />
            </div>
          ) : detailQuery.error || !d ? (
            <p className="text-sm text-destructive" role="alert">
              Impossible de charger ce point.
            </p>
          ) : (
            <Tabs
              value={editorTab}
              onValueChange={setEditorTab}
              className="flex h-full min-h-0 w-full flex-1 flex-col gap-2"
            >
              <TabsList variant="line" className="w-full shrink-0">
                <TabsTrigger value="general">Vue générale</TabsTrigger>
                {!isPostMortemReview ? (
                  <>
                    <TabsTrigger value="agenda">Ordre du jour</TabsTrigger>
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                    <TabsTrigger value="decisions">Décisions</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="attachments">Documents & liens</TabsTrigger>
                  </>
                ) : null}
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className={reviewTabPanelClass}>
              <ReviewEditorSection
                sectionId="pr-ed-params"
                title={isPostMortemReview ? 'Identification du bilan' : 'Paramètres du point'}
                description={
                  isPostMortemReview
                    ? 'Date de clôture, libellé du retour d’expérience.'
                    : 'Type de point, date et titre de la séance.'
                }
                icon={isPostMortemReview ? BookOpen : CalendarClock}
              >
                <div className="starium-form-grid starium-form-grid--2">
                  <div className="starium-form-field">
                    <label htmlFor="pr-ed-type-h" className="starium-form-label">
                      Type de point
                    </label>
                    <select
                      id="pr-ed-type-h"
                      className={selectFieldClass}
                      value={reviewType}
                      disabled={!editable}
                      onChange={(e) => setReviewType(e.target.value as ProjectReviewType)}
                    >
                      {reviewTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {PROJECT_REVIEW_TYPE_LABEL[t] ?? t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="starium-form-field">
                    <label htmlFor="pr-ed-date-h" className="starium-form-label">
                      {isPostMortemReview ? 'Date du bilan' : 'Date et heure (optionnel en préparation)'}
                    </label>
                    <ProjectDatetimeLocalInput
                      id="pr-ed-date-h"
                      value={reviewDate}
                      disabled={!editable && !planningEditable}
                      onChange={setReviewDate}
                    />
                  </div>
                  <div className="starium-form-field starium-form-grid--span-2">
                    <label htmlFor="pr-ed-title-h" className="starium-form-label">
                      {isPostMortemReview ? 'Titre du bilan' : 'Titre de la séance'}
                    </label>
                    <Input
                      id="pr-ed-title-h"
                      value={title}
                      disabled={!editable && !planningEditable}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={500}
                      placeholder={
                        isPostMortemReview
                          ? 'Ex. Retour d’expérience — intégration API éditeur'
                          : 'Ex. COPIL — arbitrage budget T2'
                      }
                      className="starium-form-input min-h-11"
                    />
                  </div>
                  {!isPostMortemReview ? (
                    <div className="starium-form-field starium-form-grid--span-2">
                      <label htmlFor="pr-ed-objective" className="starium-form-label">
                        Objectif du point
                      </label>
                      <textarea
                        id="pr-ed-objective"
                        className={textareaClass}
                        value={objective}
                        disabled={!editable && !planningEditable}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Pourquoi ce point, quels arbitrages ou décisions attendus…"
                        maxLength={20000}
                      />
                    </div>
                  ) : null}
                </div>
              </ReviewEditorSection>

              {!isPostMortemReview ? (
                <details className="group rounded-lg border border-border/70 bg-muted/15 open:bg-card open:shadow-sm">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Planification</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Lieu, visio, invitations — secondaire
                      </span>
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
                    <ReviewMeetingInfoBlock detail={d} />
                    {planningEditable ? (
                      <ReviewPlannedPlanningFields
                        projectId={projectId}
                        reviewId={d.id}
                        detail={d}
                        canEdit={planningEditable}
                      />
                    ) : null}
                    <ReviewInvitationsSection
                      projectId={projectId}
                      reviewId={d.id}
                      status={d.status}
                      meetingMode={d.meetingMode}
                      meetingUrl={d.meetingUrl}
                      microsoftOnlineMeetingId={d.microsoftOnlineMeetingId}
                      participants={d.participants ?? []}
                      canEdit={canEdit}
                    />
                  </div>
                </details>
              ) : (
                <ReviewMeetingInfoBlock detail={d} />
              )}

              {isPostMortemReview && projectQuery.data && (
                <ReviewEditorSection
                  sectionId="pr-ed-context"
                  title="Contexte à la clôture"
                  description="Indicateurs projet au moment du bilan — lecture seule."
                  icon={Target}
                >
                  <ProjectMeteoInline
                    project={projectQuery.data}
                    badgeMerged={badgeMerged}
                    embedded
                  />
                </ReviewEditorSection>
              )}

              {!isPostMortemReview && projectQuery.isLoading && (
                <div
                  className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/40"
                  aria-hidden
                />
              )}
              {!isPostMortemReview && projectQuery.data && (
                <ProjectMeteoInline project={projectQuery.data} badgeMerged={badgeMerged} />
              )}

              {(!!projectQuery.data?.warnings?.length ||
                (!isPostMortemReview && actionFormAlerts.length > 0)) && (
                <div className="space-y-2">
                  {projectQuery.data?.warnings?.map((w) => (
                    <Alert key={w} variant="default" className="border-amber-300/60 bg-amber-50/90 text-foreground dark:border-amber-400/40 dark:bg-amber-100/90 dark:text-foreground">
                      <AlertTriangle className="size-4" aria-hidden />
                      <AlertDescription className="text-sm">
                        {projectWarningLabel(w)}
                      </AlertDescription>
                    </Alert>
                  ))}
                  {actionFormAlerts.map((msg, i) => (
                    <Alert key={`act-${i}`} className="border-border/70 bg-muted/40">
                      <Info className="size-4 text-muted-foreground" aria-hidden />
                      <AlertDescription className="text-xs text-muted-foreground">{msg}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}


              {!isPostMortemReview && (
              <>
              {previousReviewId != null && (
                <ReviewEditorSection
                  sectionId="pr-section-since"
                  title="Depuis le dernier point"
                  description="Indicateurs projet et activité depuis la clôture du point précédent (référence temporelle : date du point précédent)."
                  icon={TrendingUp}
                >
                  {previousDetailQuery.isLoading || tasksQuery.isLoading ? (
                    <LoadingState rows={2} />
                  ) : pilotageSinceLast ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Tâches terminées (période)
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                          {pilotageSinceLast.tasksDoneSinceCount}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Risques ouverts
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                          {pilotageSinceLast.openRisksCount}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Jalons en retard (projet)
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                          {projectQuery.data?.delayedMilestonesCount ?? '—'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Données projet indisponibles.</p>
                  )}
                </ReviewEditorSection>
              )}

              <ReviewEditorSection
                sectionId="pr-section-prev-actions"
                title="Suivi des actions du point précédent"
                description="Actions issues du dernier point enregistré (statut et échéances)."
                icon={History}
              >
                {!previousReviewId ? (
                  <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                    Aucun point antérieur sur ce projet — premier comité ou historique vide.
                  </p>
                ) : previousDetailQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : previousDetailQuery.error || !previousDetailQuery.data ? (
                  <p className="text-xs text-destructive">Impossible de charger le point précédent.</p>
                ) : previousDetailQuery.data.actionItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Le point précédent ne comporte pas d’actions enregistrées.
                  </p>
                ) : (
                  (() => {
                    const buckets = { done: [] as ProjectReviewActionItemApi[], in_progress: [] as ProjectReviewActionItemApi[], late: [] as ProjectReviewActionItemApi[] };
                    for (const a of previousDetailQuery.data.actionItems) {
                      const k = classifyPrevReviewAction(a);
                      if (k === 'done') buckets.done.push(a);
                      else if (k === 'late') buckets.late.push(a);
                      else buckets.in_progress.push(a);
                    }
                    const Row = ({ a }: { a: ProjectReviewActionItemApi }) => (
                      <li className="rounded-md border border-border/60 bg-background/80 px-2 py-1.5 text-xs">
                        <span className="font-medium text-foreground">{a.title}</span>
                        <span className="ml-2 text-muted-foreground">
                          {TASK_STATUS_LABEL[a.status] ?? a.status}
                          {a.dueDate
                            ? ` · ${formatReviewDateTime(a.dueDate)}`
                            : ''}
                        </span>
                      </li>
                    );
                    return (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                            Terminées ({buckets.done.length})
                          </p>
                          <ul className="space-y-1.5">
                            {buckets.done.map((a) => (
                              <Row key={a.id} a={a} />
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                            En cours ({buckets.in_progress.length})
                          </p>
                          <ul className="space-y-1.5">
                            {buckets.in_progress.map((a) => (
                              <Row key={a.id} a={a} />
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">
                            En retard ({buckets.late.length})
                          </p>
                          <ul className="space-y-1.5">
                            {buckets.late.map((a) => (
                              <Row key={a.id} a={a} />
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()
                )}
              </ReviewEditorSection>

              <ReviewEditorSection
                sectionId="pr-section-progress"
                title="Avancement projet"
                description="Vue consolidée : avancement, jalons atteints / à venir / en dérive."
                icon={Target}
              >
                {milestonesQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : (
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Avancement global (manuel / dérivé) : </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {projectQuery.data?.progressPercent != null
                          ? `${projectQuery.data.progressPercent} %`
                          : '—'}
                        {' / '}
                        {projectQuery.data?.derivedProgressPercent != null
                          ? `${projectQuery.data.derivedProgressPercent} %`
                          : '—'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Jalons atteints
                        </p>
                        <ul className="space-y-1 text-xs text-foreground">
                          {(milestonesQuery.data?.items ?? [])
                            .filter((m) => m.status === 'ACHIEVED')
                            .slice(0, 6)
                            .map((m) => (
                              <li key={m.id} className="truncate">
                                {m.name}
                              </li>
                            ))}
                          {(milestonesQuery.data?.items ?? []).filter((m) => m.status === 'ACHIEVED').length ===
                            0 && <li className="text-muted-foreground">—</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Prochains jalons
                        </p>
                        <ul className="space-y-1 text-xs text-foreground">
                          {(milestonesQuery.data?.items ?? [])
                            .filter((m) => m.status === 'PLANNED')
                            .slice(0, 6)
                            .map((m) => (
                              <li key={m.id} className="truncate">
                                {m.name}
                                {m.targetDate ? ` · ${formatDateOnly(m.targetDate)}` : ''}
                              </li>
                            ))}
                          {(milestonesQuery.data?.items ?? []).filter((m) => m.status === 'PLANNED').length ===
                            0 && <li className="text-muted-foreground">—</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Dérives
                        </p>
                        <ul className="space-y-1 text-xs text-foreground">
                          {(milestonesQuery.data?.items ?? [])
                            .filter((m) => m.status === 'DELAYED')
                            .slice(0, 6)
                            .map((m) => (
                              <li key={m.id} className="truncate text-amber-900 dark:text-amber-200">
                                {m.name}
                              </li>
                            ))}
                          {(milestonesQuery.data?.items ?? []).filter((m) => m.status === 'DELAYED').length ===
                            0 && <li className="text-muted-foreground">—</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </ReviewEditorSection>

              <ReviewEditorSection
                sectionId="pr-section-risks"
                title="Risques et blocages"
                description="Risques ouverts : criticité (probabilité × impact), plan d’action."
                icon={Flag}
              >
                {risksQuery.isLoading ? (
                  <LoadingState rows={2} />
                ) : !risksQuery.data?.length ? (
                  <p className="text-xs text-muted-foreground">Aucun risque enregistré sur le projet.</p>
                ) : (
                  <ul className="space-y-2">
                    {risksQuery.data
                      .filter((r) => r.status === 'OPEN')
                      .map((r) => {
                        const crit = riskCriticalityForRisk(r);
                        return (
                          <li
                            key={r.id}
                            className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-medium text-foreground">{r.title}</span>
                              <span className="text-xs text-muted-foreground">
                                Criticité : {PROJECT_CRITICALITY_LABEL[crit] ?? crit}
                              </span>
                            </div>
                            {r.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                            ) : null}
                            {r.mitigationPlan ? (
                              <p className="mt-2 border-t border-border/50 pt-2 text-xs text-foreground">
                                <span className="font-medium">Plan d’action : </span>
                                {r.mitigationPlan}
                              </p>
                            ) : (
                              <p className="starium-text-warning-emphasis mt-2 text-xs font-semibold">
                                Plan d’action non renseigné
                              </p>
                            )}
                          </li>
                        );
                      })}
                    {risksQuery.data.filter((r) => r.status === 'OPEN').length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun risque au statut ouvert.</p>
                    )}
                  </ul>
                )}
              </ReviewEditorSection>

              <ReviewEditorSection
                sectionId="pr-section-arb"
                title="Arbitrage (fiche projet)"
                description="Lecture seule : états des trois niveaux au moment de la consultation."
                icon={Scale}
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
              </ReviewEditorSection>

              </>
              )}

              {isPostMortemReview ? (
                <>
                  <ReviewEditorSection
                    sectionId="pr-section-rex-narrative"
                    title="Bilan narratif"
                    description="Structure RETEX : objectifs, résultats, écarts, causes, leçons et recommandations."
                    icon={FileText}
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      {POST_MORTEM_NARRATIVE_FIELDS.map(([key, label]) => (
                        <div
                          key={key}
                          className={cn(
                            'grid gap-1.5',
                            (key === 'leconsApprises' || key === 'recommandations') &&
                              'lg:col-span-2',
                          )}
                        >
                          <Label className="text-xs font-medium">{label}</Label>
                          <textarea
                            className={textareaClass}
                            value={postMortemForm[key]}
                            disabled={!editable}
                            onChange={(e) =>
                              setPostMortemForm((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="…"
                            rows={key === 'leconsApprises' || key === 'recommandations' ? 4 : 3}
                          />
                        </div>
                      ))}
                    </div>
                  </ReviewEditorSection>

                  <ReviewEditorSection
                    sectionId="pr-section-rex-indicators"
                    title="Indicateurs de perception"
                    description="Notation 0–5 sur budget, délais, qualité, communication et pilotage des risques."
                    icon={Target}
                  >
                    <PostMortemIndicatorsBlock
                      indicateurs={postMortemForm.indicateurs}
                      editable={editable}
                      embedded
                      onChange={(next) =>
                        setPostMortemForm((prev) => ({ ...prev, indicateurs: next }))
                      }
                    />
                  </ReviewEditorSection>

                  <ReviewEditorSection
                    sectionId="pr-section-summary"
                    title="Synthèse exécutive"
                    description="Message clé pour le CODIR — faits marquants et capitalisation."
                    icon={Sparkles}
                  >
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="pr-ed-summary">Synthèse du bilan</Label>
                        <textarea
                          id="pr-ed-summary"
                          className={textareaClass}
                          value={executiveSummary}
                          disabled={!editable}
                          onChange={(e) => setExecutiveSummary(e.target.value)}
                          placeholder="Ce que le comité doit retenir : faits marquants, écarts majeurs, leçons prioritaires…"
                          maxLength={20000}
                        />
                      </div>
                      {projectQuery.data && (
                        <div className="grid gap-1.5 sm:max-w-md">
                          <Label htmlFor="pr-project-status">Statut du projet</Label>
                          <Select
                            value={projectQuery.data.status}
                            onValueChange={(v) => {
                              if (v && canUpdateProject) {
                                updateProjectStatusMutation.mutate(v);
                              }
                            }}
                            disabled={!canUpdateProject || updateProjectStatusMutation.isPending}
                          >
                            <SelectTrigger
                              id="pr-project-status"
                              size="sm"
                              className="h-9 w-full border-border/70"
                            >
                              <SelectValue placeholder="Statut">
                                {PROJECT_STATUS_LABEL[projectQuery.data.status] ??
                                  projectQuery.data.status}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                                <SelectItem key={k} value={k}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!canUpdateProject ? (
                            <p className="text-[0.7rem] text-muted-foreground">
                              Permission « mise à jour projets » requise pour modifier le statut.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </ReviewEditorSection>
                </>
              ) : (
              <ReviewEditorSection
                sectionId="pr-section-summary"
                title="Résumé exécutif"
                description="Faits marquants, alertes, décisions clés — ce que le comité doit retenir."
                icon={Sparkles}
              >
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-ed-summary">Synthèse du point</Label>
                    <textarea
                      id="pr-ed-summary"
                      className={textareaClass}
                      value={executiveSummary}
                      disabled={!editable}
                      onChange={(e) => setExecutiveSummary(e.target.value)}
                      placeholder="Ce qui s’est passé, ce qui bloque, ce qu’on décide — faits marquants, alertes, décisions clés…"
                      maxLength={20000}
                    />
                  </div>
                  {projectQuery.data && (
                    <div className="grid gap-1.5 sm:max-w-md">
                      <Label htmlFor="pr-project-status">Changer le statut du projet</Label>
                      <Select
                        value={projectQuery.data.status}
                        onValueChange={(v) => {
                          if (v && canUpdateProject) {
                            updateProjectStatusMutation.mutate(v);
                          }
                        }}
                        disabled={!canUpdateProject || updateProjectStatusMutation.isPending}
                      >
                        <SelectTrigger
                          id="pr-project-status"
                          size="sm"
                          className="h-9 w-full border-border/70"
                        >
                          <SelectValue placeholder="Statut">
                            {PROJECT_STATUS_LABEL[projectQuery.data.status] ??
                              projectQuery.data.status}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                            <SelectItem key={k} value={k}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!canUpdateProject ? (
                        <p className="text-[0.7rem] text-muted-foreground">
                          Permission « mise à jour projets » requise pour modifier le statut.
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="grid gap-1.5 sm:max-w-xl">
                    <Label htmlFor="pr-ed-next">Prochain point (optionnel)</Label>
                    <ProjectDatetimeLocalInput
                      id="pr-ed-next"
                      value={nextReviewDate}
                      disabled={!editable}
                      onChange={(v) => {
                        setNextReviewDate(v);
                        if (!v.trim()) {
                          setCommittedNextReviewDate(null);
                        }
                      }}
                    />
                    {editable && needsNextPointConfirmation ? (
                      <p className="text-[0.7rem] font-medium text-amber-700 dark:text-amber-400">
                        Créneau saisi mais non confirmé — validez pour créer ou mettre à jour le brouillon du
                        prochain point avec les participants ci-dessous.
                      </p>
                    ) : null}
                    {editable &&
                    !needsNextPointConfirmation &&
                    committedNextReviewDate &&
                    committedNextReviewDate.trim() ? (
                      <p className="text-[0.7rem] text-emerald-700 dark:text-emerald-400">
                        Créneau confirmé : le brouillon du prochain point sera créé ou synchronisé avec les
                        participants de ce point à l’enregistrement.
                      </p>
                    ) : null}
                    <p className="text-[0.7rem] text-muted-foreground">
                      Après confirmation, un brouillon est créé ou mis à jour à la date choisie (participants =
                      section Participants de ce point).
                    </p>
                    {editable && needsNextPointConfirmation ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-fit"
                        disabled={update.isPending}
                        onClick={() => setConfirmNextOpen(true)}
                      >
                        Confirmer le créneau et les participants
                      </Button>
                    ) : null}
                  </div>
                </div>
              </ReviewEditorSection>
              )}

              {!isPostMortemReview && (
              <CommitteeMoodPicker
                value={committeeMood}
                onChange={setCommitteeMood}
                disabled={!editable}
              />
              )}
              </TabsContent>

              {!isPostMortemReview ? (
                <>
                  <TabsContent value="agenda" className={reviewTabPanelClass}>
                    <ReviewAgendaSection
                      projectId={projectId}
                      reviewId={d.id}
                      status={d.status}
                      agendaItems={d.agendaItems ?? []}
                      canEdit={canEdit}
                    />
                  </TabsContent>
                  <TabsContent value="participants" className={reviewTabPanelClass}>
                    <ReviewParticipantsSection
                      projectId={projectId}
                      reviewId={d.id}
                      status={d.status}
                      participants={d.participants ?? []}
                      canEdit={canEdit}
                    />
                  </TabsContent>
                  <TabsContent value="decisions" className={reviewTabPanelClass}>
                    <ReviewDecisionsSection
                      decisions={decisions}
                      onChange={setDecisions}
                      editable={editable}
                      agendaItems={d.agendaItems ?? []}
                    />
                  </TabsContent>
                  <TabsContent value="actions" className={reviewTabPanelClass}>
                    <ReviewActionsSection
                      projectId={projectId}
                      decisions={d.decisions ?? []}
                      actions={actions}
                      onChange={setActions}
                      editable={editable}
                    />
                  </TabsContent>
                  <TabsContent value="attachments" className={reviewTabPanelClass}>
                    <ReviewAttachmentsSection
                      projectId={projectId}
                      reviewId={d.id}
                      status={d.status}
                      attachments={d.attachments ?? []}
                      agendaItems={d.agendaItems ?? []}
                      decisions={d.decisions ?? []}
                      actionItems={d.actionItems ?? []}
                      canEdit={canEdit}
                    />
                  </TabsContent>
                </>
              ) : null}

              <TabsContent value="history" className={reviewTabPanelClass}>
                <ReviewHistorySection status={d.status} snapshotPayload={d.snapshotPayload} />
              </TabsContent>
            </Tabs>
          )}
    </StariumModal>

    <StariumModal
      open={confirmNextOpen}
      onOpenChange={setConfirmNextOpen}
      title="Confirmer le prochain point"
      description="Un brouillon de point sera créé ou mis à jour à la date ci-dessous. Les participants suivants y seront associés (copie depuis ce point)."
      icon={CalendarClock}
      size="lg"
      contentClassName="z-[90] max-h-[min(85vh,560px)] overflow-y-auto"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => setConfirmNextOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirmNextReview()}
            disabled={!nextReviewDate.trim() || update.isPending}
          >
            {update.isPending ? 'Enregistrement…' : 'Confirmer et créer le brouillon'}
          </Button>
        </>
      }
    >
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Créneau</p>
            <p className="mt-1 font-medium text-foreground">
              {nextReviewDate.trim() ? formatLocalDatetimeFr(nextReviewDate) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Participants associés ({nextReviewParticipantPreview.length})
            </p>
            {nextReviewParticipantPreview.length === 0 ? (
              <p className="mt-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-muted-foreground">
                Aucun participant renseigné dans ce point — complétez la section « Participants » avant de
                confirmer, ou validez quand même pour un brouillon sans liste.
              </p>
            ) : (
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                {nextReviewParticipantPreview.map((p) => (
                  <li key={p.key}>
                    <span className="font-medium text-foreground">{p.label}</span>
                    {p.isRequired ? (
                      <span className="ml-1 text-xs text-muted-foreground">(requis)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
    </StariumModal>
    </>
  );
}
