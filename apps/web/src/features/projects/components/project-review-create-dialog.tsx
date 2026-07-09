'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '@/features/budgets/api/types';
import {
  CalendarClock,
  ChevronDown,
  ClipboardPen,
  Link2,
  MapPin,
  Monitor,
  PenLine,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import {
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import type {
  ProjectAssignableUser,
  ProjectReviewCreationMode,
  ProjectReviewMeetingMode,
  ProjectReviewType,
  ProjectTeamMemberApi,
} from '../types/project.types';

type CreateParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
};

type CreateDecisionRow = {
  title: string;
  description: string;
};

export type ProjectReviewCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  postMortemEligible: boolean;
  createTypeOptions: ProjectReviewType[];
  onCreated: (reviewId: string, openEditor: boolean) => void;
};

function formatAssignableUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
}

function displayNameFromUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

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

const emptyParticipantRow = (): CreateParticipantRow => ({
  displayName: '',
  userId: '',
  attended: true,
  isRequired: false,
});

const emptyDecisionRow = (): CreateDecisionRow => ({ title: '', description: '' });

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
  if (!team.length) return [emptyParticipantRow()];
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

const MEETING_MODE_OPTIONS: {
  value: ProjectReviewMeetingMode;
  icon: typeof Video;
}[] = [
  { value: 'REMOTE', icon: Video },
  { value: 'ONSITE', icon: MapPin },
  { value: 'HYBRID', icon: Monitor },
];

const CREATION_MODE_OPTIONS: {
  value: ProjectReviewCreationMode;
  title: string;
  description: string;
  icon: typeof PenLine;
}[] = [
  {
    value: 'PREPARING',
    title: 'Préparer',
    description: 'Crée un point en préparation — date optionnelle, à planifier ensuite.',
    icon: ClipboardPen,
  },
  {
    value: 'IMMEDIATE',
    title: 'Saisir maintenant',
    description: 'Ouvre l’éditeur pour rédiger le compte rendu dès la création.',
    icon: PenLine,
  },
  {
    value: 'PLANNED',
    title: 'Planifier',
    description: 'Crée un point planifié à une date précise ; invitations avant le jour J.',
    icon: CalendarClock,
  },
];

function FormChoiceTile({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: typeof Video;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'relative flex min-h-11 cursor-pointer flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 p-3 text-left transition-[border-color,background-color,box-shadow]',
        'hover:border-border hover:bg-muted/35',
        'has-[:checked]:border-primary/55 has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex items-start gap-2.5">
        {Icon ? (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground',
              checked && 'border-primary/40 text-primary',
            )}
            aria-hidden
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function OptionalBlock({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-border/70 bg-muted/15 open:bg-card open:shadow-sm"
      open={defaultOpen}
    >
      <summary
        id={`${id}-summary`}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-4 pb-4 pt-3" aria-labelledby={`${id}-summary`}>
        {children}
      </div>
    </details>
  );
}

export function ProjectReviewCreateDialog({
  open,
  onOpenChange,
  projectId,
  postMortemEligible,
  createTypeOptions,
  onCreated,
}: ProjectReviewCreateDialogProps) {
  const assignable = useProjectAssignableUsers();
  const teamForCreate = useProjectTeamQuery(projectId, { enabled: open });
  const { create } = useProjectReviewMutations(projectId);

  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<ProjectReviewType>('COPIL');
  const [formTitle, setFormTitle] = useState('');
  const [formObjective, setFormObjective] = useState('');
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
    useState<ProjectReviewCreationMode>('PREPARING');

  const createFormSeededRef = useRef(false);

  const resetForm = useCallback(() => {
    setFormDate('');
    setFormType(postMortemEligible ? 'POST_MORTEM' : 'COPIL');
    setFormTitle('');
    setFormObjective('');
    setFormSummary('');
    setFormMeetingMode('');
    setFormMeetingUrl('');
    setFormLocation('');
    setFormCreationMode('PREPARING');
    setCreateDecisions([emptyDecisionRow()]);
  }, [postMortemEligible]);

  useEffect(() => {
    if (!open) {
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
    open,
    teamForCreate.isLoading,
    teamForCreate.isSuccess,
    teamForCreate.isError,
    teamForCreate.data,
    assignable.isLoading,
    assignable.data,
  ]);

  const handleOpenChange = (next: boolean) => {
    if (next) resetForm();
    onOpenChange(next);
  };

  const requiresDate =
    formCreationMode === 'PLANNED' || formCreationMode === 'SCHEDULED';

  const submitLabel = postMortemEligible
    ? 'Créer le retour d’expérience'
    : formCreationMode === 'PLANNED' || formCreationMode === 'SCHEDULED'
      ? 'Planifier le point'
      : formCreationMode === 'PREPARING'
        ? 'Créer le point'
        : 'Créer et ouvrir l’éditeur';

  const onSubmit = async () => {
    if (requiresDate && !formDate.trim()) {
      toast.error('La date est obligatoire pour un point planifié.');
      return;
    }
    const reviewDate = formDate.trim() ? new Date(formDate).toISOString() : undefined;
    const objective = formObjective.trim() || formSummary.trim();
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
    const summary = objective;

    try {
      const created = await create.mutateAsync({
        ...(reviewDate ? { reviewDate } : {}),
        reviewType: formType,
        creationMode: postMortemEligible ? 'IMMEDIATE' : formCreationMode,
        title: formTitle.trim() || undefined,
        ...(objective ? { objective, executiveSummary: objective } : {}),
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
      onOpenChange(false);
      const openEditorAfterCreate =
        postMortemEligible || formCreationMode === 'IMMEDIATE';
      onCreated(created.id, openEditorAfterCreate);
    } catch (err) {
      const msg = isApiFormError(err) ? err.message : 'Création du point impossible.';
      toast.error(msg);
    }
  };

  const showMeetingUrl = formMeetingMode === 'REMOTE' || formMeetingMode === 'HYBRID';
  const showLocation = formMeetingMode === 'ONSITE' || formMeetingMode === 'HYBRID';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton size="xl">
        <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div className="pr-8">
              <DialogTitle className="text-left text-lg">
                {postMortemEligible ? 'Retour d’expérience' : 'Nouveau point projet'}
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-prose text-left text-sm">
                {postMortemEligible
                  ? 'Bilan de clôture : date, équipe, puis grille REX dans l’éditeur.'
                  : 'Planifiez ou lancez un point de pilotage — le détail se complète dans l’éditeur.'}
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody className="min-h-0 flex-1 py-4">
            <div className="starium-form gap-4">
              {/* Essentiel */}
              <section
                className="starium-form-section border-border/60"
                aria-labelledby="create-pr-essential"
              >
                <h3 id="create-pr-essential" className="starium-form-section-title">
                  <ClipboardPen aria-hidden />
                  Essentiel
                </h3>
                <div className="starium-form-grid starium-form-grid--2">
                  <div className="starium-form-field">
                    <label htmlFor="pr-date" className="starium-form-label">
                      Date et heure{' '}
                      {!requiresDate ? (
                        <span className="font-normal text-muted-foreground">(optionnel)</span>
                      ) : null}
                    </label>
                    <ProjectDatetimeLocalInput
                      id="pr-date"
                      value={formDate}
                      onChange={setFormDate}
                      required={requiresDate}
                    />
                  </div>
                  <div className="starium-form-field">
                    <label htmlFor="pr-type" className="starium-form-label">
                      Type de point
                    </label>
                    <select
                      id="pr-type"
                      className="starium-form-select min-h-11"
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
                      Titre <span className="font-normal text-muted-foreground">(optionnel)</span>
                    </label>
                    <Input
                      id="pr-title"
                      className="starium-form-input min-h-11"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      maxLength={500}
                      placeholder="Ex. COPIL mensuel — arbitrage budget Q3"
                    />
                  </div>
                </div>
              </section>

              {!postMortemEligible ? (
                <>
                  {/* Intention */}
                  <section
                    className="starium-form-section border-border/60"
                    aria-labelledby="create-pr-intent"
                  >
                    <h3 id="create-pr-intent" className="starium-form-section-title">
                      <CalendarClock aria-hidden />
                      Intention
                    </h3>
                    <fieldset>
                      <legend className="sr-only">Mode de création du point</legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {CREATION_MODE_OPTIONS.map((opt) => (
                          <FormChoiceTile
                            key={opt.value}
                            name="pr-creation-mode"
                            value={opt.value}
                            checked={formCreationMode === opt.value}
                            onChange={() => setFormCreationMode(opt.value)}
                            title={opt.title}
                            description={opt.description}
                            icon={opt.icon}
                          />
                        ))}
                      </div>
                    </fieldset>
                  </section>

                  {/* Tenue */}
                  <section
                    className="starium-form-section border-border/60"
                    aria-labelledby="create-pr-meeting"
                  >
                    <h3 id="create-pr-meeting" className="starium-form-section-title">
                      <Video aria-hidden />
                      Tenue de la réunion
                    </h3>
                    <fieldset className="space-y-4">
                      <legend className="starium-form-label mb-2 block">Format</legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {MEETING_MODE_OPTIONS.map(({ value, icon }) => (
                          <FormChoiceTile
                            key={value}
                            name="pr-meeting-mode"
                            value={value}
                            checked={formMeetingMode === value}
                            onChange={() => setFormMeetingMode(value)}
                            title={PROJECT_REVIEW_MEETING_MODE_LABEL[value] ?? value}
                            icon={icon}
                            className="sm:min-h-[4.5rem]"
                          />
                        ))}
                      </div>
                      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="radio"
                          name="pr-meeting-mode"
                          checked={formMeetingMode === ''}
                          onChange={() => setFormMeetingMode('')}
                          className="size-4 rounded-full border border-input"
                        />
                        À définir plus tard
                      </label>

                      {(showMeetingUrl || showLocation) && (
                        <div className="starium-form-grid starium-form-grid--2 rounded-lg border border-border/60 bg-muted/20 p-3">
                          {showMeetingUrl ? (
                            <div
                              className={cn(
                                'starium-form-field',
                                showLocation ? '' : 'starium-form-grid--span-2',
                              )}
                            >
                              <label htmlFor="pr-meeting-url" className="starium-form-label">
                                <Link2 className="mr-1 inline size-3.5 opacity-70" aria-hidden />
                                Lien de réunion
                              </label>
                              <Input
                                id="pr-meeting-url"
                                type="url"
                                className="starium-form-input min-h-11"
                                value={formMeetingUrl}
                                onChange={(e) => setFormMeetingUrl(e.target.value)}
                                placeholder="https://teams.microsoft.com/…"
                              />
                            </div>
                          ) : null}
                          {showLocation ? (
                            <div
                              className={cn(
                                'starium-form-field',
                                showMeetingUrl ? '' : 'starium-form-grid--span-2',
                              )}
                            >
                              <label htmlFor="pr-location" className="starium-form-label">
                                <MapPin className="mr-1 inline size-3.5 opacity-70" aria-hidden />
                                Lieu
                              </label>
                              <Input
                                id="pr-location"
                                className="starium-form-input min-h-11"
                                value={formLocation}
                                onChange={(e) => setFormLocation(e.target.value)}
                                maxLength={300}
                                placeholder="Salle, étage, adresse…"
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </fieldset>
                  </section>
                </>
              ) : null}

              {/* Participants */}
              <section
                className="starium-form-section border-border/60"
                aria-labelledby="create-pr-participants"
              >
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
                  {teamForCreate.isLoading
                    ? 'Chargement de l’équipe projet…'
                    : `${createParticipants.length} participant${createParticipants.length > 1 ? 's' : ''} — équipe préremplie, ajustez si besoin.`}
                </p>
                {assignable.isLoading ? (
                  <p className="starium-form-hint mb-3">Chargement des membres du client…</p>
                ) : null}
                <ul className="space-y-2">
                  {createParticipants.map((row, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border/60 bg-muted/15 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                          aria-hidden
                        >
                          {participantInitials(row.displayName, i)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="starium-form-grid starium-form-grid--2">
                            <div className="starium-form-field">
                              <label htmlFor={`pr-part-user-${i}`} className="starium-form-label">
                                Membre client
                              </label>
                              <select
                                id={`pr-part-user-${i}`}
                                className="starium-form-select min-h-11"
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
                                <option value="">— Choisir —</option>
                                {assignable.data?.users?.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {formatAssignableUser(u)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="starium-form-field">
                              <label htmlFor={`pr-part-name-${i}`} className="starium-form-label">
                                Nom affiché
                              </label>
                              <Input
                                id={`pr-part-name-${i}`}
                                className="starium-form-input min-h-11"
                                value={row.displayName}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) => (j === i ? { ...p, displayName: v } : p)),
                                  );
                                }}
                                placeholder="Nom, rôle…"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
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
                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
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
                        {createParticipants.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Retirer ${row.displayName.trim() || `participant ${i + 1}`}`}
                            onClick={() =>
                              setCreateParticipants((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Optionnel — replié par défaut */}
              <div className="flex flex-col gap-2">
                <OptionalBlock
                  id="create-pr-framing"
                  title="Objectif du point"
                  summary="Cadrage et ordre du jour — optionnel"
                >
                  <div className="starium-form-field">
                    <label htmlFor="pr-objective" className="starium-form-label">
                      Objectif principal
                    </label>
                    <textarea
                      id="pr-objective"
                      className="starium-form-textarea min-h-[72px]"
                      value={formObjective}
                      onChange={(e) => setFormObjective(e.target.value)}
                      maxLength={20000}
                      rows={3}
                      placeholder="Pourquoi ce point, quels arbitrages ou décisions attendus…"
                    />
                  </div>
                  <div className="starium-form-field mt-3">
                    <label htmlFor="pr-summary" className="starium-form-label">
                      Ordre du jour (texte libre)
                    </label>
                    <textarea
                      id="pr-summary"
                      className="starium-form-textarea min-h-[88px]"
                      value={formSummary}
                      onChange={(e) => setFormSummary(e.target.value)}
                      maxLength={20000}
                      rows={4}
                      placeholder={
                        '1. Avancement & jalons\n2. Points bloquants\n3. Arbitrages\n4. Prochaines étapes'
                      }
                    />
                  </div>
                </OptionalBlock>

                <OptionalBlock
                  id="create-pr-decisions"
                  title="Éléments à trancher"
                  summary="Arbitrages attendus — à finaliser dans l’éditeur"
                >
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9 gap-1.5"
                      onClick={() =>
                        setCreateDecisions((prev) => [...prev, emptyDecisionRow()])
                      }
                    >
                      <Plus className="size-4" aria-hidden />
                      Ajouter un sujet
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {createDecisions.map((row, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-border/60 bg-muted/15 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="starium-form-field">
                              <label
                                htmlFor={`pr-decision-title-${i}`}
                                className="starium-form-label"
                              >
                                Sujet
                              </label>
                              <Input
                                id={`pr-decision-title-${i}`}
                                className="starium-form-input min-h-11"
                                value={row.title}
                                maxLength={500}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCreateDecisions((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, title: v } : x)),
                                  );
                                }}
                                placeholder="Ex. Valider le dépassement budgétaire"
                              />
                            </div>
                            <div className="starium-form-field">
                              <label
                                htmlFor={`pr-decision-desc-${i}`}
                                className="starium-form-label"
                              >
                                Contexte{' '}
                                <span className="font-normal text-muted-foreground">
                                  (optionnel)
                                </span>
                              </label>
                              <textarea
                                id={`pr-decision-desc-${i}`}
                                className="starium-form-textarea min-h-[64px]"
                                value={row.description}
                                maxLength={8000}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCreateDecisions((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                                  );
                                }}
                                placeholder="Enjeux, options, recommandation…"
                              />
                            </div>
                          </div>
                          {createDecisions.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Retirer le sujet ${row.title.trim() || i + 1}`}
                              onClick={() =>
                                setCreateDecisions((prev) => prev.filter((_, j) => j !== i))
                              }
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </OptionalBlock>
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => void onSubmit()}
              disabled={create.isPending || (requiresDate && !formDate.trim())}
            >
              {create.isPending ? 'Création…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
