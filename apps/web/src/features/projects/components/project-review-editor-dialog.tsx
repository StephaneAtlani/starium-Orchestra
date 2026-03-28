'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CloudRain,
  CloudSun,
  Flag,
  History,
  Info,
  ListChecks,
  ListTodo,
  Scale,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import {
  ARBITRATION_LEVEL_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import {
  POST_MORTEM_EMPTY,
  readPostMortemPayload,
  type PostMortemPayload,
} from '../lib/project-post-mortem-payload';
import { getReviewTypeOptionsForEditor } from '../lib/project-review-post-mortem';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { PostMortemIndicatorsBlock } from './post-mortem-indicators-block';
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
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import type {
  ProjectAssignableUser,
  ProjectDetail,
  ProjectReviewActionItemApi,
  ProjectReviewListItem,
  ProjectReviewType,
  ProjectSheet,
  ProjectTeamMemberApi,
} from '../types/project.types';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

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

type ParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
  /** Membre matrice équipe projet vs saisie libre (interne / externe). */
  source: 'team' | 'free';
  /** `ProjectTeamMemberApi.id` si `source === 'team'`. */
  teamMemberId?: string;
  /** Fonction sur le projet (affichage, issu de la matrice). */
  projectRoleName?: string | null;
};

function formatAssignableUserLabel(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
}

function displayNameFromAssignable(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function teamMembersSorted(team: ProjectTeamMemberApi[]): ProjectTeamMemberApi[] {
  return [...team].sort((a, b) => {
    const r = a.roleName.localeCompare(b.roleName, 'fr');
    if (r !== 0) return r;
    return a.displayName.localeCompare(b.displayName, 'fr');
  });
}

function affiliationLabel(
  a: ProjectTeamMemberApi['affiliation'],
): string | null {
  if (a === 'INTERNAL') return 'Interne';
  if (a === 'EXTERNAL') return 'Externe';
  return null;
}

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

/** Bandeau indicateurs — carte légère, alignée FRONTEND_UI-UX §2. */
function ProjectMeteoInline({ project }: { project: ProjectDetail }) {
  const av =
    project.derivedProgressPercent ?? project.progressPercent ?? null;
  return (
    <div className="rounded-xl border border-border/70 border-l-4 border-l-sky-500/50 bg-card p-3 shadow-sm">
      <p className="mb-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Indicateurs projet
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge health={project.computedHealth} compact />
          <ProjectPortfolioBadges signals={project.signals} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs sm:border-t-0 sm:pt-0">
          <span className="tabular-nums text-muted-foreground">
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground/90">
              Avancement{' '}
            </span>
            <span className="font-semibold text-foreground">
              {av != null ? `${av} %` : '—'}
            </span>
          </span>
          <span className="hidden h-4 w-px bg-border/70 sm:block" aria-hidden />
          <span className="tabular-nums text-muted-foreground" title="Tâches · Risques · Jalons en retard">
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground/90">
              T·R·J{' '}
            </span>
            <span className="font-semibold text-foreground">
              {project.openTasksCount}/{project.openRisksCount}/{project.delayedMilestonesCount}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function pickPreviousReviewId(
  items: ProjectReviewListItem[],
  currentId: string,
): string | null {
  const sorted = [...items].sort(
    (a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime(),
  );
  const idx = sorted.findIndex((x) => x.id === currentId);
  if (idx === -1 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1]?.id ?? null;
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

function formatReviewDateTime(iso: string): string {
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
  const reviewsListQuery = useProjectReviewsQuery(projectId, { enabled: open });
  const previousReviewId = useMemo(() => {
    if (!open || !reviewId || !reviewsListQuery.data?.length) return null;
    return pickPreviousReviewId(reviewsListQuery.data, reviewId);
  }, [open, reviewId, reviewsListQuery.data]);

  const previousDetailQuery = useProjectReviewDetailQuery(projectId, previousReviewId);
  const milestonesQuery = useProjectMilestonesQuery(projectId, { enabled: open });
  const risksQuery = useProjectRisksQuery(projectId, { enabled: open });
  const tasksQuery = useProjectTasksQuery(projectId, { enabled: open });
  const teamQuery = useProjectTeamQuery(projectId, { enabled: open });
  const assignableUsersQuery = useProjectAssignableUsers({ enabled: open });

  const { update, finalize, cancel } = useProjectReviewMutations(projectId);

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
  const [executiveSummary, setExecutiveSummary] = useState('');
  /** Saisie locale (datetime-local) — peut différer du créneau validé pour l’API. */
  const [nextReviewDate, setNextReviewDate] = useState('');
  /** Créneau du prochain point accepté : envoyé au PATCH et déclenche la création du brouillon côté API. */
  const [committedNextReviewDate, setCommittedNextReviewDate] = useState<string | null>(null);
  const [confirmNextOpen, setConfirmNextOpen] = useState(false);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [committeeMood, setCommitteeMood] = useState<CommitteeMood | null>(null);
  const [postMortemForm, setPostMortemForm] = useState<PostMortemPayload>(POST_MORTEM_EMPTY);

  const lastInitRef = useRef<string | null>(null);
  /** Snapshot JSON de `buildPatchBody()` — évite les PATCH inutiles et sert de ligne de base après init. */
  const lastSavedSerializedRef = useRef<string | null>(null);

  const initFromDetail = useCallback(() => {
    const d = detailQuery.data;
    if (!d) return;
    setReviewDate(toLocalDatetimeInput(d.reviewDate));
    setReviewType(d.reviewType);
    setTitle(d.title ?? '');
    setExecutiveSummary(d.executiveSummary ?? '');
    const nextLocal = d.nextReviewDate ? toLocalDatetimeInput(d.nextReviewDate) : '';
    setNextReviewDate(nextLocal);
    setCommittedNextReviewDate(nextLocal === '' ? null : nextLocal);
    setParticipants(
      d.participants.length
        ? d.participants.map((p) => ({
            displayName: p.displayName ?? '',
            userId: p.userId ?? '',
            attended: p.attended,
            isRequired: p.isRequired,
            source: 'free' as const,
            teamMemberId: undefined,
            projectRoleName: null,
          }))
        : [
            {
              displayName: '',
              userId: '',
              attended: true,
              isRequired: false,
              source: 'team',
              teamMemberId: '',
              projectRoleName: null,
            },
          ],
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
  const isDraft = d?.status === 'DRAFT';
  const editable = canEdit && isDraft;
  const projectStatus = projectQuery.data?.status;
  const reviewTypeOptions = useMemo(
    () => getReviewTypeOptionsForEditor(projectStatus, reviewType),
    [projectStatus, reviewType],
  );

  const buildPatchBody = (opts?: { committedNextReviewOverride?: string | null }) => {
    const committedForApi =
      opts?.committedNextReviewOverride !== undefined
        ? opts.committedNextReviewOverride
        : committedNextReviewDate;
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
      reviewDate: fromLocalDatetimeInput(reviewDate),
      reviewType,
      title: title.trim() || null,
      executiveSummary: executiveSummary.trim() || null,
      nextReviewDate:
        reviewType === 'POST_MORTEM'
          ? null
          : committedForApi && committedForApi.trim()
            ? fromLocalDatetimeInput(committedForApi)
            : null,
      participants: parts,
      decisions: dec,
      actionItems: act,
      contentPayload,
    };
  };

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
    executiveSummary,
    committedNextReviewDate,
    participants,
    decisions,
    actions,
    committeeMood,
    postMortemForm,
    update,
  ]);

  const pilotageSinceLast = useMemo(() => {
    const prev = previousDetailQuery.data;
    const tasks = tasksQuery.data?.items;
    if (!prev || !tasks) return null;
    const t0 = new Date(prev.finalizedAt ?? prev.reviewDate).getTime();
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
    return participants
      .filter((p) => p.displayName.trim() || p.userId.trim())
      .map((p, i) => ({
        key: `${p.userId}-${p.displayName}-${i}`,
        label: p.displayName.trim() || p.userId.trim(),
        attended: p.attended,
        isRequired: p.isRequired,
      }));
  }, [participants]);

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
    if (!d || !editable) return;
    await cancel.mutateAsync(d.id);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,900px)] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/35 via-background to-background px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start gap-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-sky-700 shadow-inner dark:text-sky-400"
              aria-hidden
            >
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-left text-xl font-semibold leading-snug tracking-tight text-foreground">
                    {d ? (
                      PROJECT_REVIEW_TYPE_LABEL[d.reviewType] ?? d.reviewType
                    ) : (
                      'Point projet'
                    )}
                  </DialogTitle>
                  {d && projectQuery.data?.name && (
                    <p className="mt-1 text-sm font-medium text-foreground/90">
                      {projectQuery.data.name}
                    </p>
                  )}
                  {d && !projectQuery.data?.name && (
                    <p className="mt-1 text-sm text-muted-foreground">Projet</p>
                  )}
                  {d && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        {formatReviewDateTime(d.reviewDate)}
                      </span>
                      {d.title ? (
                        <span className="text-xs text-muted-foreground">
                          <span className="text-muted-foreground/80">Objet : </span>
                          <span className="font-medium text-foreground">{d.title}</span>
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Sans titre de séance</span>
                      )}
                    </div>
                  )}
                </div>
                {d && (
                  <Badge
                    variant={d.status === 'FINALIZED' ? 'secondary' : 'outline'}
                    className="shrink-0 border-border/70 px-2.5 py-0.5 text-xs font-medium"
                  >
                    {PROJECT_REVIEW_STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6">
          {detailQuery.isLoading || !reviewId ? (
            <LoadingState rows={6} />
          ) : detailQuery.error || !d ? (
            <p className="text-sm text-destructive">Impossible de charger ce point.</p>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-5">
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Paramètres du point
                </p>
                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="grid gap-1.5 sm:col-span-4 lg:col-span-3">
                    <Label htmlFor="pr-ed-type-h" className="text-xs font-medium text-foreground">
                      Type de revue
                    </Label>
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
                  <div className="grid gap-1.5 sm:col-span-4 lg:col-span-4">
                    <Label htmlFor="pr-ed-date-h" className="text-xs font-medium text-foreground">
                      Date et heure
                    </Label>
                    <Input
                      id="pr-ed-date-h"
                      type="datetime-local"
                      value={reviewDate}
                      disabled={!editable}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="border-border/70"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-12 lg:col-span-5">
                    <Label htmlFor="pr-ed-title-h" className="text-xs font-medium text-foreground">
                      Titre de la séance
                    </Label>
                    <Input
                      id="pr-ed-title-h"
                      value={title}
                      disabled={!editable}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={500}
                      placeholder="Ex. COPIL — revue budget T2"
                      className="border-border/70"
                    />
                  </div>
                </div>
              </div>

              {projectQuery.isLoading && (
                <div
                  className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/40"
                  aria-hidden
                />
              )}
              {projectQuery.data && <ProjectMeteoInline project={projectQuery.data} />}

              {(!!projectQuery.data?.warnings?.length || actionFormAlerts.length > 0) && (
                <div className="space-y-2">
                  {projectQuery.data?.warnings?.map((w) => (
                    <Alert key={w} variant="default" className="border-amber-300/60 bg-amber-50/90 text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90 dark:text-foreground">
                      <AlertTriangle className="size-4" aria-hidden />
                      <AlertDescription className="text-sm">
                        {WARNING_CODE_LABEL[w] ?? w}
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

              <ReviewFormSection
                sectionId="pr-section-participants"
                title="Parties prenantes"
                description="Choisissez des membres dans la matrice équipe projet (nom + fonction) ou ajoutez des collaborateurs internes / externes hors matrice."
                icon={Users}
                accent="amber"
              >
                <div className="flex flex-wrap justify-end gap-2">
                  {editable && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setParticipants((prev) => [
                            ...prev,
                            {
                              displayName: '',
                              userId: '',
                              attended: true,
                              isRequired: false,
                              source: 'team',
                              teamMemberId: '',
                              projectRoleName: null,
                            },
                          ])
                        }
                      >
                        Ajouter (équipe projet)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setParticipants((prev) => [
                            ...prev,
                            {
                              displayName: '',
                              userId: '',
                              attended: true,
                              isRequired: false,
                              source: 'free',
                              teamMemberId: undefined,
                              projectRoleName: null,
                            },
                          ])
                        }
                      >
                        Ajouter (autre collaborateur)
                      </Button>
                    </>
                  )}
                </div>
                <div className="space-y-3">
                  {participants.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Participant {i + 1}
                        </span>
                        {editable && participants.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive"
                            onClick={() =>
                              setParticipants((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            Retirer
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-1.5 sm:max-w-md">
                          <Label htmlFor={`pr-part-source-${i}`}>Origine</Label>
                          <select
                            id={`pr-part-source-${i}`}
                            className={selectFieldClass}
                            value={p.source}
                            disabled={!editable}
                            onChange={(e) => {
                              const src = e.target.value as 'team' | 'free';
                              setParticipants((prev) =>
                                prev.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        source: src,
                                        teamMemberId: src === 'team' ? '' : undefined,
                                        projectRoleName: null,
                                        displayName: src === 'team' ? '' : x.displayName,
                                        userId: src === 'team' ? '' : x.userId,
                                      }
                                    : x,
                                ),
                              );
                            }}
                          >
                            <option value="team">Membre de l’équipe projet (matrice)</option>
                            <option value="free">Autre collaborateur (interne ou externe)</option>
                          </select>
                        </div>

                        {p.source === 'team' ? (
                          <div className="grid gap-2">
                            <div className="grid gap-1.5">
                              <Label htmlFor={`pr-part-team-${i}`}>
                                Membre et fonction sur le projet
                              </Label>
                              {teamQuery.isLoading ? (
                                <p className="text-xs text-muted-foreground">
                                  Chargement de l’équipe…
                                </p>
                              ) : (
                                <select
                                  id={`pr-part-team-${i}`}
                                  className={selectFieldClass}
                                  value={p.teamMemberId ?? ''}
                                  disabled={!editable}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const m = teamQuery.data?.find((x) => x.id === id);
                                    setParticipants((prev) =>
                                      prev.map((x, j) =>
                                        j === i
                                          ? {
                                              ...x,
                                              teamMemberId: id,
                                              userId: m?.userId ?? '',
                                              displayName: m?.displayName ?? '',
                                              projectRoleName: m?.roleName ?? null,
                                            }
                                          : x,
                                      ),
                                    );
                                  }}
                                >
                                  <option value="">— Choisir dans la matrice équipe —</option>
                                  {teamMembersSorted(teamQuery.data ?? []).map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.displayName} — {m.roleName} ({m.email})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {(() => {
                              const tm = teamQuery.data?.find((x) => x.id === p.teamMemberId);
                              const aff =
                                tm?.affiliation != null
                                  ? affiliationLabel(tm.affiliation)
                                  : null;
                              if (!p.projectRoleName && !aff) return null;
                              return (
                                <p className="text-xs text-muted-foreground">
                                  {p.projectRoleName ? (
                                    <>
                                      <span className="font-medium text-foreground">
                                        Fonction :{' '}
                                      </span>
                                      {p.projectRoleName}
                                    </>
                                  ) : null}
                                  {aff ? (
                                    <span>
                                      {p.projectRoleName ? ' · ' : null}
                                      {aff}
                                    </span>
                                  ) : null}
                                </p>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5 sm:col-span-2">
                              <Label htmlFor={`pr-part-name-${i}`}>Nom affiché</Label>
                              <Input
                                id={`pr-part-name-${i}`}
                                value={p.displayName}
                                disabled={!editable}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setParticipants((prev) =>
                                    prev.map((x, j) =>
                                      j === i ? { ...x, displayName: v } : x,
                                    ),
                                  );
                                }}
                                placeholder="Nom, organisation, rôle invité…"
                              />
                            </div>
                            <div className="grid gap-1.5 sm:col-span-2">
                              <Label htmlFor={`pr-part-assign-${i}`}>
                                Compte utilisateur (optionnel)
                              </Label>
                              <select
                                id={`pr-part-assign-${i}`}
                                className={selectFieldClass}
                                value={p.userId}
                                disabled={!editable}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const u = assignableUsersQuery.data?.users?.find((x) => x.id === id);
                                  setParticipants((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            userId: id,
                                            displayName: u
                                              ? displayNameFromAssignable(u)
                                              : x.displayName,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                              >
                                <option value="">— Aucun compte / saisie manuelle du nom —</option>
                                {assignableUsersQuery.data?.users?.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {formatAssignableUserLabel(u)}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[0.7rem] text-muted-foreground">
                                Rattachez un compte client si la personne existe sur la plateforme ;
                                sinon laissez vide pour un externe ou un invité.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 border-t border-border/50 pt-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border border-border/70"
                              checked={p.attended}
                              disabled={!editable}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setParticipants((prev) =>
                                  prev.map((x, j) =>
                                    j === i ? { ...x, attended: v } : x,
                                  ),
                                );
                              }}
                            />
                            Présent
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border border-border/70"
                              checked={p.isRequired}
                              disabled={!editable}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setParticipants((prev) =>
                                  prev.map((x, j) =>
                                    j === i ? { ...x, isRequired: v } : x,
                                  ),
                                );
                              }}
                            />
                            Requis
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ReviewFormSection>

              {previousReviewId != null && (
                <ReviewFormSection
                  sectionId="pr-section-since"
                  title="Depuis le dernier point"
                  description="Indicateurs projet et activité depuis la clôture du point précédent (référence temporelle : date du point précédent)."
                  icon={TrendingUp}
                  accent="sky"
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
                </ReviewFormSection>
              )}

              <ReviewFormSection
                sectionId="pr-section-prev-actions"
                title="Suivi des actions du point précédent"
                description="Actions issues du dernier point enregistré (statut et échéances)."
                icon={History}
                accent="amber"
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
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-progress"
                title="Avancement projet"
                description="Vue consolidée : avancement, jalons atteints / à venir / en dérive."
                icon={Target}
                accent="sky"
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
              </ReviewFormSection>

              <ReviewFormSection
                sectionId="pr-section-risks"
                title="Risques et blocages"
                description="Risques ouverts : criticité (probabilité × impact), plan d’action."
                icon={Flag}
                accent="violet"
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
                              <p className="mt-2 text-xs font-semibold text-yellow-950 dark:text-amber-400">
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

              <ReviewFormSection
                sectionId="pr-section-summary"
                title="Résumé exécutif"
                description="Faits marquants, alertes, décisions clés — ce que le comité doit retenir."
                icon={Sparkles}
                accent="emerald"
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
                  {reviewType === 'POST_MORTEM' && (
                    <div className="grid gap-3 border-t border-border/60 pt-3">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Retour d&apos;expérience
                      </p>
                      <PostMortemIndicatorsBlock
                        indicateurs={postMortemForm.indicateurs}
                        editable={editable}
                        onChange={(next) =>
                          setPostMortemForm((prev) => ({ ...prev, indicateurs: next }))
                        }
                      />
                      {(
                        [
                          ['objectifs', 'Objectifs / cadrage initial'],
                          ['resultats', 'Résultats obtenus'],
                          ['ecarts', 'Écarts (plan, budget, délais…)'],
                          ['causes', 'Causes / analyse'],
                          ['leconsApprises', 'Leçons apprises'],
                          ['recommandations', 'Recommandations / capitalisation'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="grid gap-1.5">
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
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
                  {reviewType !== 'POST_MORTEM' ? (
                  <div className="grid gap-1.5 sm:max-w-xl">
                    <Label htmlFor="pr-ed-next">Prochain point (optionnel)</Label>
                    <Input
                      id="pr-ed-next"
                      type="datetime-local"
                      value={nextReviewDate}
                      disabled={!editable}
                      onChange={(e) => {
                        const v = e.target.value;
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
                  ) : null}
                </div>
              </ReviewFormSection>

              {reviewType !== 'POST_MORTEM' ? (
              <CommitteeMoodPicker
                value={committeeMood}
                onChange={setCommitteeMood}
                disabled={!editable}
              />
              ) : null}
            </div>
          )}
        </div>

        {d && (
          <DialogFooter className="border-t border-border/60 bg-muted/20 px-4 pt-3 pb-5 sm:px-6 sm:pb-6">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                {editable && (
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {update.isPending ? 'Enregistrement…' : 'Brouillon synchronisé automatiquement'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
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

    <Dialog open={confirmNextOpen} onOpenChange={setConfirmNextOpen}>
      <DialogContent className="z-[90] max-h-[min(85vh,560px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmer le prochain point</DialogTitle>
          <DialogDescription>
            Un brouillon de point sera créé ou mis à jour à la date ci-dessous. Les personnes suivantes y
            seront associées (copie depuis ce point).
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter className="gap-2 sm:justify-end">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
