'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import type {
  ProjectAssignableUser,
  ProjectReviewListItem,
  ProjectReviewType,
  ProjectTeamMemberApi,
} from '../types/project.types';
import { cn } from '@/lib/utils';
import type { ApiFormError } from '@/features/budgets/api/types';
import { toast } from 'sonner';
import { CalendarRange, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
  REVIEW_TYPES_PILOTAGE,
} from '../lib/project-review-post-mortem';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';

const selectFieldClass = cn(
  'border-input bg-background h-9 w-full rounded-md border border-border/70 px-2.5 text-sm shadow-xs',
  'transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

const CREATE_SECTION_ACCENTS = {
  sky: {
    bar: 'border-l-[3px] border-l-sky-500/70',
    icon: 'bg-sky-500/10 text-sky-800 dark:text-sky-300',
  },
  amber: {
    bar: 'border-l-[3px] border-l-amber-500/70',
    icon: 'bg-amber-500/15 text-amber-950 dark:text-amber-300',
  },
} as const;

function CreateReviewFormSection({
  sectionId,
  title,
  description,
  icon: Icon,
  accent,
  children,
}: {
  sectionId: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  accent: keyof typeof CREATE_SECTION_ACCENTS;
  children: ReactNode;
}) {
  const a = CREATE_SECTION_ACCENTS[accent];
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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
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
  const [createParticipants, setCreateParticipants] = useState<CreateParticipantRow[]>([
    emptyParticipantRow(),
  ]);

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
    try {
      const created = await create.mutateAsync({
        reviewDate,
        reviewType: formType,
        title: formTitle.trim() || undefined,
        ...(participants.length > 0 ? { participants } : {}),
      });
      setCreateOpen(false);
      openEditor(created.id);
    } catch (err) {
      const msg = isApiFormError(err) ? err.message : 'Création du point impossible.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {postMortemEligible ? (
            finalizedPostMortem && !draftPostMortem ? (
              <>
                Un{' '}
                <strong className="font-medium text-foreground">retour d&apos;expérience</strong> a été
                finalisé pour ce projet — consultez-le dans le tableau ci-dessous.
              </>
            ) : (
              <>
                Projet clos : documentez un{' '}
                <strong className="font-medium text-foreground">retour d&apos;expérience</strong>{' '}
                (bilan, écarts, leçons apprises) — distinct des revues de pilotage en cours de projet.
              </>
            )
          ) : (
            <>
              Créez un <strong className="font-medium text-foreground">point projet</strong>, complétez le
              compte rendu (arbitrage, synthèse, participants, décisions, actions), enregistrez puis
              finalisez pour figer le snapshot.
            </>
          )}
        </p>
        {canEdit &&
          !(postMortemEligible && finalizedPostMortem && !draftPostMortem) && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (postMortemEligible && draftPostMortem) {
                openEditor(draftPostMortem.id);
              } else {
                setCreateOpen(true);
              }
            }}
          >
            {postMortemEligible
              ? draftPostMortem
                ? "Continuer le retour d'expérience"
                : "Créer un retour d'expérience"
              : 'Créer un point projet'}
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <LoadingState rows={4} />
      ) : list.error ? (
        <p className="text-sm text-destructive">Impossible de charger les points projet.</p>
      ) : !list.data?.length ? (
        <p className="text-sm text-muted-foreground">Aucun point projet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((row: ProjectReviewListItem) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.reviewDate)}</TableCell>
                <TableCell>
                  {PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ?? row.reviewType}
                </TableCell>
                <TableCell>
                  {PROJECT_REVIEW_STATUS_LABEL[row.status] ?? row.status}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.title ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(row.id)}
                  >
                    {row.status === 'DRAFT' ? 'Continuer' : 'Voir'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (o) resetCreateFormFields();
        }}
      >
        <DialogContent
          className={cn(
            'flex max-h-[min(92vh,900px)] w-[min(90vw,calc(100%-2rem))] max-w-[min(90vw,calc(100%-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(90vw,calc(100%-2rem))]',
          )}
        >
          <div className="shrink-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-2 space-y-0">
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                {postMortemEligible ? "Nouveau retour d'expérience" : 'Nouveau point projet'}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {postMortemEligible
                  ? "Date, parties prenantes, puis grille de retour d'expérience (objectifs, résultats, leçons) dans l'éditeur."
                  : 'Date, type et parties prenantes. Vous compléterez le compte rendu (synthèse, décisions, actions) dans l’éditeur juste après la création.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-5 py-5 sm:px-6">
            <div className="mx-auto flex max-w-4xl flex-col gap-5">
              <CreateReviewFormSection
                sectionId="create-pr-ident"
                title="Identification"
                description="Contexte du point : date, nature de la revue, libellé libre optionnel."
                icon={CalendarRange}
                accent="sky"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-date">Date du point</Label>
                    <Input
                      id="pr-date"
                      type="datetime-local"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-type">Type</Label>
                    <select
                      id="pr-type"
                      className={selectFieldClass}
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
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="pr-title">Titre (optionnel)</Label>
                    <Input
                      id="pr-title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      maxLength={500}
                      placeholder="Ex. COPIL mensuel — arbitrage budget"
                    />
                  </div>
                </div>
              </CreateReviewFormSection>

              <CreateReviewFormSection
                sectionId="create-pr-participants"
                title="Parties prenantes"
                description="L’équipe projet est préremplie à l’ouverture. Vous pouvez ajuster, retirer ou ajouter des personnes (membre client ou nom libre)."
                icon={Users}
                accent="amber"
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCreateParticipants((prev) => [...prev, emptyParticipantRow()])
                    }
                  >
                    Ajouter un participant
                  </Button>
                </div>
                {teamForCreate.isLoading ? (
                  <p className="text-xs text-muted-foreground">Chargement de l’équipe projet…</p>
                ) : null}
                {assignable.isLoading ? (
                  <p className="text-xs text-muted-foreground">Chargement de la liste des membres du client…</p>
                ) : null}
                <div className="space-y-3">
                  {createParticipants.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="grid gap-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Membre du client (optionnel)</Label>
                          <select
                            className={selectFieldClass}
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
                          <div className="grid gap-1.5">
                            <Label htmlFor={`pr-part-name-${i}`}>Nom affiché</Label>
                            <Input
                              id={`pr-part-name-${i}`}
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
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-input"
                                checked={row.attended}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) =>
                                      j === i ? { ...p, attended: v } : p,
                                    ),
                                  );
                                }}
                              />
                              Présent
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-input"
                                checked={row.isRequired}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) =>
                                      j === i ? { ...p, isRequired: v } : p,
                                    ),
                                  );
                                }}
                              />
                              Requis
                            </label>
                            {createParticipants.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() =>
                                  setCreateParticipants((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                Retirer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CreateReviewFormSection>
            </div>
          </div>
          <DialogFooter className="!mx-0 !mb-0 shrink-0 rounded-b-xl border-t border-border/60 bg-muted/30 px-5 py-3.5 sm:px-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer et ouvrir'}
            </Button>
          </DialogFooter>
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
