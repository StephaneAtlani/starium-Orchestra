'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumTableWrap, useStariumTablePan } from '@/components/ui/starium-table-wrap';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import type {
  ProjectAssignableUser,
  ProjectReviewCreationMode,
  ProjectReviewListItem,
  ProjectReviewMeetingMode,
  ProjectReviewType,
  ProjectTeamMemberApi,
} from '../types/project.types';
import { cn } from '@/lib/utils';
import type { ApiFormError } from '@/features/budgets/api/types';
import { toast } from '@/lib/toast';
import {
  BookOpen,
  Calendar,
  CalendarRange,
  ClipboardList,
  FileText,
  ListChecks,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
  REVIEW_TYPES_PILOTAGE,
} from '../lib/project-review-post-mortem';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';
import { ProjectReviewsContextBanner } from './project-reviews-context-banner';

const REVIEW_ROW_ICON_TONES = [
  'starium-dt-ti-blue',
  'starium-dt-ti-purple',
  'starium-dt-ti-gold',
  'starium-dt-ti-green',
] as const;

function reviewStatusDsBadgeClass(status: string): string {
  if (status === 'FINALIZED') return 'starium-ds-badge--success';
  if (status === 'IN_REVIEW' || status === 'DRAFT') return 'starium-ds-badge--warn';
  if (status === 'PLANNED') return 'starium-ds-badge--info';
  if (status === 'CANCELLED') return 'starium-ds-badge--neutral';
  return 'starium-ds-badge--info';
}

function reviewTypeDsBadgeClass(reviewType: string): string {
  if (reviewType === 'POST_MORTEM') return 'starium-ds-badge--warn';
  return 'starium-ds-badge--info';
}

function reviewRowIcon(reviewType: string) {
  if (reviewType === 'POST_MORTEM') return BookOpen;
  return ClipboardList;
}

function ReviewTableRow({
  row,
  index,
  onOpen,
}: {
  row: ProjectReviewListItem;
  index: number;
  onOpen: (id: string) => void;
}) {
  const { shouldSuppressClick } = useStariumTablePan();
  const RowIcon = reviewRowIcon(row.reviewType);
  const iconTone = REVIEW_ROW_ICON_TONES[index % REVIEW_ROW_ICON_TONES.length];
  const typeLabel = PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ?? row.reviewType;
  const statusLabel = PROJECT_REVIEW_STATUS_LABEL[row.status] ?? row.status;
  const title = row.title?.trim() || typeLabel;
  const actionLabel =
    row.status === 'IN_REVIEW' || row.status === 'DRAFT'
      ? 'Continuer'
      : row.status === 'PLANNED'
        ? 'Ouvrir'
        : 'Voir';

  return (
    <tr
      className="cursor-pointer"
      onClick={() => {
        if (shouldSuppressClick()) return;
        onOpen(row.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(row.id);
        }
      }}
      tabIndex={0}
    >
      <td>
        <div className="starium-dt-date min-w-[10rem]">
          <Calendar strokeWidth={1.75} aria-hidden />
          <time dateTime={row.reviewDate}>{formatProjectDateTimeFr(row.reviewDate)}</time>
        </div>
      </td>
      <td>
        <span className={cn('starium-ds-badge', reviewTypeDsBadgeClass(row.reviewType))}>
          {typeLabel}
        </span>
      </td>
      <td>
        <span className={cn('starium-ds-badge', reviewStatusDsBadgeClass(row.status))}>
          {statusLabel}
        </span>
      </td>
      <td>
        <div className="starium-dt-tname min-w-[12rem] max-w-[24rem]">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <RowIcon strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{title}</div>
            {row.title?.trim() ? (
              <div className="starium-dt-cell-sub truncate">{typeLabel}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="starium-dt__right">
        <button
          type="button"
          className="starium-btn starium-btn-secondary starium-btn-sm"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.id);
          }}
        >
          {actionLabel}
        </button>
      </td>
    </tr>
  );
}

function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatAssignableUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
}

function displayNameFromUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

/** Initiales pour l’avatar d’un participant ; repli sur le rang si nom vide. */
function participantInitials(displayName: string, index: number): string {
  const trimmed = displayName.trim();
  if (!trimmed) return String(index + 1);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : trimmed.slice(0, 2);
  return letters.toUpperCase();
}

type CreateParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
};

const emptyParticipantRow = (): CreateParticipantRow => ({
  displayName: '',
  userId: '',
  attended: true,
  isRequired: false,
});

/** Élément à trancher (arbitrage) — mappé sur `decisions` (title + détail) à la création. */
type CreateDecisionRow = {
  title: string;
  description: string;
};

const emptyDecisionRow = (): CreateDecisionRow => ({ title: '', description: '' });

/** Une ligne par membre de l’équipe projet (compte client si présent, sinon nom libre). */
function isApiFormError(e: unknown): e is ApiFormError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as ApiFormError).message === 'string'
  );
}

function createParticipantsFromProjectTeam(
  team: ProjectTeamMemberApi[],
  assignable: ProjectAssignableUser[] | undefined,
): CreateParticipantRow[] {
  if (!team.length) {
    return [emptyParticipantRow()];
  }
  return team.map((m) => {
    const uid = m.userId?.trim() ?? '';
    if (uid && assignable?.length) {
      const u = assignable.find((a) => a.id === uid);
      return {
        userId: uid,
        displayName: u ? displayNameFromUser(u) : m.displayName.trim() || m.email,
        attended: true,
        isRequired: false,
      };
    }
    return {
      userId: '',
      displayName: m.displayName.trim() || m.email,
      attended: true,
      isRequired: false,
    };
  });
}

export function ProjectReviewsTab({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus: string;
}) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const postMortemEligible = isPostMortemEligibleProjectStatus(projectStatus);
  const createTypeOptions: ProjectReviewType[] = postMortemEligible
    ? ['POST_MORTEM']
    : REVIEW_TYPES_PILOTAGE;

  const [createOpen, setCreateOpen] = useState(false);
  const [editorReviewId, setEditorReviewId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const list = useProjectReviewsQuery(projectId);
  const draftPostMortem = useMemo(
    () => findDraftPostMortemReview(list.data),
    [list.data],
  );
  const finalizedPostMortem = useMemo(
    () => hasFinalizedPostMortemReview(list.data),
    [list.data],
  );
  const assignable = useProjectAssignableUsers();
  const teamForCreate = useProjectTeamQuery(projectId, { enabled: createOpen });
  const { create } = useProjectReviewMutations(projectId);

  const [formDate, setFormDate] = useState(defaultDatetimeLocal);
  const [formType, setFormType] = useState<ProjectReviewType>('COPIL');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [createParticipants, setCreateParticipants] = useState<CreateParticipantRow[]>([
    emptyParticipantRow(),
  ]);
  const [createDecisions, setCreateDecisions] = useState<CreateDecisionRow[]>([
    emptyDecisionRow(),
  ]);
  const [formMeetingMode, setFormMeetingMode] = useState<ProjectReviewMeetingMode | ''>('');
  const [formMeetingUrl, setFormMeetingUrl] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCreationMode, setFormCreationMode] =
    useState<ProjectReviewCreationMode>('IMMEDIATE');

  const createFormSeededRef = useRef(false);
  const openedPostMortemFromQueryRef = useRef(false);
  const openedOpenReviewRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const resetCreateFormFields = useCallback(() => {
    setFormDate(defaultDatetimeLocal());
    setFormType(postMortemEligible ? 'POST_MORTEM' : 'COPIL');
    setFormTitle('');
    setFormSummary('');
    setFormMeetingMode('');
    setFormMeetingUrl('');
    setFormLocation('');
    setFormCreationMode('IMMEDIATE');
    setCreateDecisions([emptyDecisionRow()]);
  }, [postMortemEligible]);

  const openEditor = useCallback((id: string) => {
    setEditorReviewId(id);
    setEditorOpen(true);
  }, []);

  /** Synthèse projet : `?createRetourExperience=1` ouvre la création ; si un brouillon REX existe, l’éditeur. */
  useEffect(() => {
    if (searchParams.get('createRetourExperience') !== '1') {
      openedPostMortemFromQueryRef.current = false;
      return;
    }
    if (!postMortemEligible || !canEdit) return;
    if (list.isLoading) return;
    if (openedPostMortemFromQueryRef.current) return;

    const stripCreateParam = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('createRetourExperience');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const draft = findDraftPostMortemReview(list.data);
    if (draft) {
      openedPostMortemFromQueryRef.current = true;
      openEditor(draft.id);
      stripCreateParam();
      return;
    }

    if (
      hasFinalizedPostMortemReview(list.data) &&
      !findDraftPostMortemReview(list.data)
    ) {
      openedPostMortemFromQueryRef.current = true;
      stripCreateParam();
      return;
    }

    openedPostMortemFromQueryRef.current = true;
    resetCreateFormFields();
    setCreateOpen(true);
    stripCreateParam();
  }, [
    searchParams,
    pathname,
    router,
    postMortemEligible,
    canEdit,
    resetCreateFormFields,
    list.isLoading,
    list.data,
    openEditor,
  ]);

  /** Lien « Continuer » depuis la synthèse : `?openReview=<id>`. */
  useEffect(() => {
    const id = searchParams.get('openReview');
    if (!id?.trim()) {
      openedOpenReviewRef.current = null;
      return;
    }
    if (openedOpenReviewRef.current === id) return;
    openedOpenReviewRef.current = id;
    openEditor(id);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('openReview');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, openEditor]);

  useEffect(() => {
    if (!createOpen) {
      createFormSeededRef.current = false;
      return;
    }
    if (createFormSeededRef.current) return;
    if (teamForCreate.isLoading) return;

    if (teamForCreate.isError) {
      createFormSeededRef.current = true;
      setCreateParticipants([emptyParticipantRow()]);
      return;
    }
    if (!teamForCreate.isSuccess) return;

    const team = teamForCreate.data ?? [];
    if (team.length === 0) {
      createFormSeededRef.current = true;
      setCreateParticipants([emptyParticipantRow()]);
      return;
    }

    const needsAssignable = team.some((m) => (m.userId?.trim() ?? '') !== '');
    if (needsAssignable && assignable.isLoading) return;

    createFormSeededRef.current = true;
    setCreateParticipants(createParticipantsFromProjectTeam(team, assignable.data?.users));
  }, [
    createOpen,
    teamForCreate.isLoading,
    teamForCreate.isSuccess,
    teamForCreate.isError,
    teamForCreate.data,
    assignable.isLoading,
    assignable.data,
  ]);

  const onCreate = async () => {
    const reviewDate = new Date(formDate).toISOString();
    const participants = createParticipants
      .filter((p) => p.displayName.trim() || p.userId.trim())
      .map((p) => ({
        userId: p.userId.trim() || null,
        displayName: p.displayName.trim() || null,
        attended: p.attended,
        isRequired: p.isRequired,
      }));
    const decisions = createDecisions
      .filter((x) => x.title.trim())
      .map((x) => ({
        title: x.title.trim(),
        description: x.description.trim() || null,
      }));
    const summary = formSummary.trim();
    try {
      const created = await create.mutateAsync({
        reviewDate,
        reviewType: formType,
        creationMode: postMortemEligible ? 'IMMEDIATE' : formCreationMode,
        title: formTitle.trim() || undefined,
        ...(summary ? { executiveSummary: summary } : {}),
        ...(formMeetingMode
          ? {
              meetingMode: formMeetingMode,
              ...(formMeetingUrl.trim() ? { meetingUrl: formMeetingUrl.trim() } : {}),
              ...(formLocation.trim() ? { location: formLocation.trim() } : {}),
            }
          : {}),
        ...(participants.length > 0 ? { participants } : {}),
        ...(decisions.length > 0 ? { decisions } : {}),
      });
      setCreateOpen(false);
      const openEditorAfterCreate =
        postMortemEligible || formCreationMode === 'IMMEDIATE';
      if (openEditorAfterCreate) {
        openEditor(created.id);
      }
    } catch (err) {
      const msg = isApiFormError(err) ? err.message : 'Création du point impossible.';
      toast.error(msg);
    }
  };

  const onPrimaryReviewAction = () => {
    if (postMortemEligible && draftPostMortem) {
      openEditor(draftPostMortem.id);
    } else {
      setCreateOpen(true);
    }
  };

  const primaryReviewLabel = postMortemEligible
    ? draftPostMortem
      ? "Continuer le retour d'expérience"
      : "Créer un retour d'expérience"
    : 'Nouveau point projet';

  const showPrimaryCta =
    canEdit && !(postMortemEligible && finalizedPostMortem && !draftPostMortem);

  const hasReviews = (list.data?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      {!postMortemEligible ? (
        <ProjectReviewsContextBanner
          postMortemEligible={false}
          finalizedPostMortem={false}
          draftPostMortem={null}
          canEdit={canEdit}
          onPrimaryAction={onPrimaryReviewAction}
          variant="tab"
        />
      ) : null}

      {/* Le bandeau ci-dessus porte le CTA quand le projet n'est pas clos ; ce header
          garantit un bouton de création persistant pour les projets terminés (REX). */}
      {postMortemEligible && showPrimaryCta && hasReviews ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="starium-btn starium-btn-primary min-h-11"
            onClick={onPrimaryReviewAction}
          >
            <Plus strokeWidth={2.5} aria-hidden />
            {primaryReviewLabel}
          </button>
        </div>
      ) : null}

      <div className="starium-tablecard">
        {list.isLoading ? (
          <div className="p-6">
            <LoadingState rows={4} />
          </div>
        ) : list.error ? (
          <div className="p-6" role="alert">
            <p className="text-sm text-destructive">Impossible de charger les points projet.</p>
          </div>
        ) : !list.data?.length ? (
          <EmptyState
            title={postMortemEligible ? "Aucun retour d'expérience" : 'Aucun point projet'}
            description={
              postMortemEligible
                ? 'Créez le bilan de clôture pour capitaliser objectifs, écarts et leçons apprises.'
                : 'Planifiez un COPIL, COPRO ou une revue pour documenter arbitrages et décisions.'
            }
            action={
              canEdit ? (
                <button
                  type="button"
                  className="starium-btn starium-btn-primary"
                  onClick={onPrimaryReviewAction}
                >
                  <Plus strokeWidth={2.5} aria-hidden />
                  {postMortemEligible ? "Créer un retour d'expérience" : 'Créer un point projet'}
                </button>
              ) : undefined
            }
            className="py-14"
          />
        ) : (
          <StariumTableWrap scrollLabel="Historique des points projet — glisser pour faire défiler">
            <table className="starium-dt starium-dt--wide">
              <caption className="sr-only">Historique des points projet</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Titre</th>
                  <th scope="col" className="starium-dt__right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((row, index) => (
                  <ReviewTableRow key={row.id} row={row} index={index} onOpen={openEditor} />
                ))}
              </tbody>
            </table>
          </StariumTableWrap>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (o) resetCreateFormFields();
        }}
      >
        <DialogContent
          showCloseButton
          size="xl"
          className="flex max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-4 lg:max-w-3xl"
        >
          <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="-mx-4 -mt-4 shrink-0 space-y-0 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
              <div className="pr-8">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <DialogTitle className="text-left">
                    {postMortemEligible ? "Nouveau retour d'expérience" : 'Nouveau point projet'}
                  </DialogTitle>
                  <span className="starium-ds-badge starium-ds-badge--neutral">
                    {postMortemEligible ? 'Bilan de clôture' : 'Revue de pilotage'}
                  </span>
                </div>
                <DialogDescription className="mt-2 text-left">
                  {postMortemEligible
                    ? "Date, parties prenantes, puis grille de retour d'expérience dans l'éditeur."
                    : "Date, type et parties prenantes ; le compte rendu se complète dans l'éditeur juste après la création."}
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogBody className="min-h-0 flex-1 py-4">
              <div className="starium-form">
                <section className="starium-form-section" aria-labelledby="create-pr-ident">
                  <h3 id="create-pr-ident" className="starium-form-section-title">
                    <CalendarRange aria-hidden />
                    Identification
                  </h3>
                  <p className="starium-form-hint mb-3">
                    Contexte du point : date, nature de la revue, libellé libre optionnel.
                  </p>
                  <div className="starium-form-grid starium-form-grid--2">
                    <div className="starium-form-field">
                      <label htmlFor="pr-date" className="starium-form-label">
                        Date du point
                      </label>
                      <Input
                        id="pr-date"
                        type="datetime-local"
                        className="starium-form-input"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>
                    <div className="starium-form-field">
                      <label htmlFor="pr-type" className="starium-form-label">
                        Type
                      </label>
                      <select
                        id="pr-type"
                        className="starium-form-select"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ProjectReviewType)}
                        disabled={postMortemEligible && createTypeOptions.length === 1}
                      >
                        {createTypeOptions.map((t) => (
                          <option key={t} value={t}>
                            {PROJECT_REVIEW_TYPE_LABEL[t] ?? t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="starium-form-field starium-form-grid--span-2">
                      <label htmlFor="pr-title" className="starium-form-label">
                        Titre (optionnel)
                      </label>
                      <Input
                        id="pr-title"
                        className="starium-form-input"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        maxLength={500}
                        placeholder="Ex. COPIL mensuel — arbitrage budget"
                      />
                    </div>
                  </div>
                </section>

                <section className="starium-form-section" aria-labelledby="create-pr-framing">
                  <h3 id="create-pr-framing" className="starium-form-section-title">
                    <FileText aria-hidden />
                    Cadrage
                  </h3>
                  <p className="starium-form-hint mb-3">
                    Objectif, ordre du jour et synthèse de préparation du point. Complétez le compte
                    rendu détaillé dans l’éditeur après la création.
                  </p>
                  <div className="starium-form-field">
                    <label htmlFor="pr-summary" className="starium-form-label">
                      Objectif &amp; ordre du jour (optionnel)
                    </label>
                    <textarea
                      id="pr-summary"
                      className="starium-form-textarea min-h-[96px]"
                      value={formSummary}
                      onChange={(e) => setFormSummary(e.target.value)}
                      maxLength={20000}
                      rows={4}
                      placeholder={
                        'Ex.\n1. Avancement & jalons\n2. Points bloquants\n3. Arbitrage budget\n4. Prochaines étapes'
                      }
                    />
                  </div>
                </section>

                {!postMortemEligible ? (
                  <section className="starium-form-section" aria-labelledby="create-pr-meeting">
                    <h3 id="create-pr-meeting" className="starium-form-section-title">
                      <Calendar aria-hidden />
                      Réunion
                    </h3>
                    <div className="starium-form-grid starium-form-grid--2">
                      <div className="starium-form-field starium-form-grid--span-2">
                        <span className="starium-form-label">Mode</span>
                        <div className="flex flex-wrap gap-3">
                          {(['REMOTE', 'ONSITE', 'HYBRID'] as const).map((mode) => (
                            <label key={mode} className="inline-flex min-h-11 items-center gap-2">
                              <input
                                type="radio"
                                name="pr-meeting-mode"
                                checked={formMeetingMode === mode}
                                onChange={() => setFormMeetingMode(mode)}
                              />
                              {PROJECT_REVIEW_MEETING_MODE_LABEL[mode]}
                            </label>
                          ))}
                          <label className="inline-flex min-h-11 items-center gap-2">
                            <input
                              type="radio"
                              name="pr-meeting-mode"
                              checked={formMeetingMode === ''}
                              onChange={() => setFormMeetingMode('')}
                            />
                            Non renseigné
                          </label>
                        </div>
                      </div>
                      {(formMeetingMode === 'REMOTE' || formMeetingMode === 'HYBRID') && (
                        <div className="starium-form-field starium-form-grid--span-2">
                          <label htmlFor="pr-meeting-url" className="starium-form-label">
                            Lien de réunion
                          </label>
                          <Input
                            id="pr-meeting-url"
                            type="url"
                            className="starium-form-input min-h-11"
                            value={formMeetingUrl}
                            onChange={(e) => setFormMeetingUrl(e.target.value)}
                            placeholder="https://…"
                          />
                        </div>
                      )}
                      {(formMeetingMode === 'ONSITE' || formMeetingMode === 'HYBRID') && (
                        <div className="starium-form-field starium-form-grid--span-2">
                          <label htmlFor="pr-location" className="starium-form-label">
                            Lieu
                          </label>
                          <Input
                            id="pr-location"
                            className="starium-form-input min-h-11"
                            value={formLocation}
                            onChange={(e) => setFormLocation(e.target.value)}
                            maxLength={300}
                          />
                        </div>
                      )}
                      <div className="starium-form-field starium-form-grid--span-2">
                        <span className="starium-form-label">Création</span>
                        <div className="flex flex-wrap gap-3">
                          <label className="inline-flex min-h-11 items-center gap-2">
                            <input
                              type="radio"
                              name="pr-creation-mode"
                              checked={formCreationMode === 'IMMEDIATE'}
                              onChange={() => setFormCreationMode('IMMEDIATE')}
                            />
                            Créer et saisir
                          </label>
                          <label className="inline-flex min-h-11 items-center gap-2">
                            <input
                              type="radio"
                              name="pr-creation-mode"
                              checked={formCreationMode === 'PLANNED'}
                              onChange={() => setFormCreationMode('PLANNED')}
                            />
                            Planifier
                          </label>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="starium-form-section" aria-labelledby="create-pr-decisions">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="create-pr-decisions"
                      className="starium-form-section-title mb-0 min-w-0 flex-1"
                    >
                      <ListChecks aria-hidden />
                      Éléments à trancher
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9 shrink-0 gap-1.5"
                      onClick={() =>
                        setCreateDecisions((prev) => [...prev, emptyDecisionRow()])
                      }
                    >
                      <Plus className="size-4" aria-hidden />
                      Ajouter
                    </Button>
                  </div>
                  <p className="starium-form-hint mb-3">
                    Arbitrages ou décisions attendus du point. Vous les finaliserez (validés / reportés)
                    dans l’éditeur.
                  </p>
                  <ul className="space-y-2.5">
                    {createDecisions.map((row, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-border/70 bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="starium-form-field">
                              <label
                                htmlFor={`pr-decision-title-${i}`}
                                className="starium-form-label"
                              >
                                Sujet à trancher
                              </label>
                              <Input
                                id={`pr-decision-title-${i}`}
                                className="starium-form-input"
                                value={row.title}
                                maxLength={500}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCreateDecisions((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, title: v } : x)),
                                  );
                                }}
                                placeholder="Ex. Valider le dépassement budgétaire de 12 k€"
                              />
                            </div>
                            <div className="starium-form-field">
                              <label
                                htmlFor={`pr-decision-desc-${i}`}
                                className="starium-form-label"
                              >
                                Contexte / options (optionnel)
                              </label>
                              <textarea
                                id={`pr-decision-desc-${i}`}
                                className="starium-form-textarea min-h-[72px]"
                                value={row.description}
                                maxLength={8000}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCreateDecisions((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                                  );
                                }}
                                placeholder="Enjeux, options envisagées, recommandation…"
                              />
                            </div>
                          </div>
                          {createDecisions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Retirer l’élément ${row.title.trim() || i + 1}`}
                              onClick={() =>
                                setCreateDecisions((prev) => prev.filter((_, j) => j !== i))
                              }
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="starium-form-section" aria-labelledby="create-pr-participants">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="create-pr-participants"
                      className="starium-form-section-title mb-0 min-w-0 flex-1"
                    >
                      <Users aria-hidden />
                      Parties prenantes
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9 shrink-0 gap-1.5"
                      onClick={() =>
                        setCreateParticipants((prev) => [...prev, emptyParticipantRow()])
                      }
                    >
                      <UserPlus className="size-4" aria-hidden />
                      Ajouter
                    </Button>
                  </div>
                  <p className="starium-form-hint mb-3" aria-live="polite">
                    L’équipe projet est préremplie à l’ouverture — {createParticipants.length}{' '}
                    {createParticipants.length > 1 ? 'participants' : 'participant'}. Ajustez, retirez
                    ou ajoutez des membres (compte client ou nom libre).
                  </p>
                  {teamForCreate.isLoading ? (
                    <p className="text-xs text-muted-foreground">Chargement de l’équipe projet…</p>
                  ) : null}
                  {assignable.isLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Chargement de la liste des membres du client…
                    </p>
                  ) : null}
                  <ul className="space-y-2.5">
                    {createParticipants.map((row, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-border/70 bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-gold)_16%,transparent)] text-xs font-semibold text-[color:var(--brand-gold-700)]"
                            aria-hidden
                          >
                            {participantInitials(row.displayName, i)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="starium-form-grid starium-form-grid--2">
                              <div className="starium-form-field">
                                <label
                                  htmlFor={`pr-part-user-${i}`}
                                  className="starium-form-label"
                                >
                                  Membre du client (optionnel)
                                </label>
                                <select
                                  id={`pr-part-user-${i}`}
                                  className="starium-form-select"
                                  disabled={assignable.isLoading}
                                  value={row.userId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const u = assignable.data?.users?.find((x) => x.id === id);
                                    setCreateParticipants((prev) =>
                                      prev.map((p, j) =>
                                        j === i
                                          ? {
                                              ...p,
                                              userId: id,
                                              displayName: u
                                                ? displayNameFromUser(u)
                                                : p.displayName,
                                            }
                                          : p,
                                      ),
                                    );
                                  }}
                                >
                                  <option value="">— Choisir dans la liste —</option>
                                  {assignable.data?.users?.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {formatAssignableUser(u)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="starium-form-field">
                                <label
                                  htmlFor={`pr-part-name-${i}`}
                                  className="starium-form-label"
                                >
                                  Nom affiché
                                </label>
                                <Input
                                  id={`pr-part-name-${i}`}
                                  className="starium-form-input"
                                  value={row.displayName}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCreateParticipants((prev) =>
                                      prev.map((p, j) => (j === i ? { ...p, displayName: v } : p)),
                                    );
                                  }}
                                  placeholder="Nom, rôle, organisation…"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border border-input"
                                  checked={row.attended}
                                  onChange={(e) => {
                                    const v = e.target.checked;
                                    setCreateParticipants((prev) =>
                                      prev.map((p, j) => (j === i ? { ...p, attended: v } : p)),
                                    );
                                  }}
                                />
                                Présent
                              </label>
                              <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border border-input"
                                  checked={row.isRequired}
                                  onChange={(e) => {
                                    const v = e.target.checked;
                                    setCreateParticipants((prev) =>
                                      prev.map((p, j) => (j === i ? { ...p, isRequired: v } : p)),
                                    );
                                  }}
                                />
                                Requis
                              </label>
                            </div>
                          </div>
                          {createParticipants.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Retirer le participant ${row.displayName.trim() || i + 1}`}
                              onClick={() =>
                                setCreateParticipants((prev) => prev.filter((_, j) => j !== i))
                              }
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </DialogBody>

            <DialogFooter>
              <button
                type="button"
                className="starium-btn starium-btn-secondary"
                onClick={() => setCreateOpen(false)}
                disabled={create.isPending}
              >
                Annuler
              </button>
              <button
                type="button"
                className="starium-btn starium-btn-primary"
                onClick={() => void onCreate()}
                disabled={create.isPending}
              >
                {create.isPending ? 'Création…' : 'Créer et ouvrir'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProjectReviewEditorDialog
        projectId={projectId}
        reviewId={editorReviewId}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditorReviewId(null);
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
