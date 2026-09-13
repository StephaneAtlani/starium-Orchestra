'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { Users, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTeamsQuery } from '../hooks/use-project-governance-circles-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectAssignableUser,
  ProjectReviewParticipantApi,
} from '../types/project.types';
import { ProjectTeamsEditorDialog } from './project-teams/project-teams-editor-dialog';

type Props = {
  projectId: string;
  reviewId: string;
  participants: ProjectReviewParticipantApi[];
  canEdit: boolean;
  sectionRef?: Ref<HTMLElement>;
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function memberLabel(u: ProjectAssignableUser): string {
  return firstDisplayLabel(
    [[u.firstName, u.lastName].filter(Boolean).join(' ').trim(), u.email],
    'Membre',
  );
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length === 0) return 'Invité';
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function memberCountLabel(count: number): string {
  return `${count} membre${count > 1 ? 's' : ''}`;
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function PrepareWorkspaceParticipants({
  projectId,
  reviewId,
  participants,
  canEdit,
  sectionRef,
}: Props) {
  const teamsQuery = useProjectTeamsQuery(projectId, { enabled: canEdit });
  const assignable = useProjectAssignableUsers({ enabled: canEdit });
  const { conveneTeam, createParticipant, deleteParticipant } =
    useProjectReviewMutations(projectId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTeamId, setEditorTeamId] = useState<string | null>(null);
  /** Onglets d’ajout : personne (autocomplete) | équipe (convocation). */
  const [inviteTab, setInviteTab] = useState<'person' | 'team'>('person');

  const [memberQuery, setMemberQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [memberError, setMemberError] = useState<string | null>(null);

  const memberInputId = useId();
  const tabsId = useId();
  const listboxId = `${memberInputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const teams = teamsQuery.data?.items ?? [];
  const users = assignable.data?.users ?? [];

  const existingUserIds = useMemo(
    () =>
      new Set(
        participants
          .map((p) => p.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    [participants],
  );
  const existingEmails = useMemo(
    () =>
      new Set(
        participants
          .map((p) => p.externalEmail?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e)),
      ),
    [participants],
  );

  const availableMembers = useMemo(
    () => users.filter((u) => !existingUserIds.has(u.id)),
    [users, existingUserIds],
  );

  const suggestions = useMemo(() => {
    const q = normalizeSearch(memberQuery);
    if (!q) return availableMembers.slice(0, 8);
    return availableMembers
      .filter((u) => {
        const label = normalizeSearch(memberLabel(u));
        const email = normalizeSearch(u.email);
        return label.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [availableMembers, memberQuery]);

  const freeEmail = memberQuery.trim();
  const freeEmailOk = isValidEmail(freeEmail);
  const freeEmailAlready =
    freeEmailOk && existingEmails.has(freeEmail.toLowerCase());
  const showFreeEmailOption =
    freeEmailOk &&
    !freeEmailAlready &&
    !suggestions.some(
      (u) => u.email.trim().toLowerCase() === freeEmail.toLowerCase(),
    );

  const optionCount = suggestions.length + (showFreeEmailOption ? 1 : 0);

  const sorted = useMemo(
    () =>
      [...participants].sort((a, b) =>
        displayLabel(a.displayName, 'Participant').localeCompare(
          displayLabel(b.displayName, 'Participant'),
          'fr',
        ),
      ),
    [participants],
  );

  const pending = conveneTeam.isPending || createParticipant.isPending;

  useEffect(() => {
    setActiveIdx(0);
  }, [memberQuery, suggestions.length, showFreeEmailOption]);

  useEffect(() => {
    if (!listOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setListOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listOpen]);

  const onConvene = async (id: string) => {
    if (!id || !canEdit) return;
    const team = teams.find((t) => t.id === id);
    if (team && (team.memberCount ?? team.members?.length ?? 0) === 0) {
      setEditorTeamId(id);
      setEditorOpen(true);
      toast.message('Complétez les membres de l’équipe avant de convoquer');
      return;
    }
    try {
      const res = await conveneTeam.mutateAsync({ reviewId, teamId: id });
      toast.success(
        res.message ??
          `${res.addedCount} participant${res.addedCount > 1 ? 's' : ''} convoqué${res.addedCount > 1 ? 's' : ''}`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Convocation impossible'));
    }
  };

  const clearMemberField = () => {
    setMemberQuery('');
    setMemberError(null);
    setListOpen(false);
    setActiveIdx(0);
  };

  const onAddMember = async (u: ProjectAssignableUser) => {
    if (!canEdit) return;
    const name = memberLabel(u);
    try {
      await createParticipant.mutateAsync({
        reviewId,
        body: {
          userId: u.id,
          displayName: name,
          roleLabel: null,
          externalEmail: null,
        },
      });
      toast.success(`${name} ajouté`);
      clearMemberField();
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Ajout impossible'));
    }
  };

  const onAddExternal = async (emailRaw: string) => {
    if (!canEdit) return;
    const email = emailRaw.trim();
    if (!isValidEmail(email)) {
      setMemberError('Adresse e-mail invalide.');
      return;
    }
    if (existingEmails.has(email.toLowerCase())) {
      toast.error('Ce participant est déjà convoqué');
      return;
    }
    const matched = users.find(
      (u) => u.email.trim().toLowerCase() === email.toLowerCase(),
    );
    if (matched && !existingUserIds.has(matched.id)) {
      await onAddMember(matched);
      return;
    }
    setMemberError(null);
    const name = nameFromEmail(email);
    try {
      await createParticipant.mutateAsync({
        reviewId,
        body: {
          userId: null,
          displayName: name,
          roleLabel: null,
          externalEmail: email,
        },
      });
      toast.success(`${name} ajouté`);
      clearMemberField();
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Ajout impossible'));
    }
  };

  const commitActive = () => {
    if (activeIdx >= 0 && activeIdx < suggestions.length) {
      void onAddMember(suggestions[activeIdx]!);
      return;
    }
    if (showFreeEmailOption && activeIdx === suggestions.length) {
      void onAddExternal(freeEmail);
      return;
    }
    if (freeEmailOk) {
      void onAddExternal(freeEmail);
      return;
    }
    if (suggestions.length === 1) {
      void onAddMember(suggestions[0]!);
      return;
    }
    setMemberError('Choisissez un membre ou saisissez un e-mail valide.');
  };

  return (
    <section
      ref={sectionRef}
      className="prepare-workspace__card"
      aria-labelledby="pw-parts-title"
    >
      <div className="prepare-workspace__card-h">
        <Users className="size-3.5" aria-hidden />
        <span id="pw-parts-title">
          Participants ({participants.length})
        </span>
        {canEdit ? (
          <button
            type="button"
            className="prepare-workspace__link ml-auto"
            onClick={() => {
              setEditorTeamId(null);
              setEditorOpen(true);
            }}
          >
            Gérer
          </button>
        ) : null}
      </div>

      {canEdit ? (
        <div className="prepare-workspace__add prepare-workspace__add--invite">
          <div
            className="prepare-workspace__seg"
            role="tablist"
            aria-label="Mode de convocation"
          >
            <button
              type="button"
              role="tab"
              id={`${tabsId}-person`}
              aria-selected={inviteTab === 'person'}
              aria-controls={`${tabsId}-panel-person`}
              tabIndex={inviteTab === 'person' ? 0 : -1}
              className={`prepare-workspace__seg-btn${inviteTab === 'person' ? ' is-on' : ''}`}
              onClick={() => {
                setInviteTab('person');
                setListOpen(false);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              Personne
            </button>
            <button
              type="button"
              role="tab"
              id={`${tabsId}-team`}
              aria-selected={inviteTab === 'team'}
              aria-controls={`${tabsId}-panel-team`}
              tabIndex={inviteTab === 'team' ? 0 : -1}
              className={`prepare-workspace__seg-btn${inviteTab === 'team' ? ' is-on' : ''}`}
              onClick={() => {
                setInviteTab('team');
                setListOpen(false);
                clearMemberField();
              }}
            >
              Équipe
            </button>
          </div>

          {inviteTab === 'person' ? (
            <div
              ref={containerRef}
              id={`${tabsId}-panel-person`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-person`}
              className="prepare-workspace__ac"
            >
              <label className="sr-only" htmlFor={memberInputId}>
                Rechercher un membre ou saisir un e-mail
              </label>
              <input
                ref={inputRef}
                id={memberInputId}
                type="text"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  listOpen && optionCount > 0
                    ? `${listboxId}-opt-${activeIdx}`
                    : undefined
                }
                aria-invalid={memberError ? true : undefined}
                aria-describedby={
                  memberError
                    ? `${memberInputId}-error`
                    : `${memberInputId}-hint`
                }
                className="prepare-workspace__ac-input"
                value={memberQuery}
                disabled={pending || assignable.isLoading}
                placeholder="Nom, prénom ou e-mail…"
                autoComplete="off"
                onFocus={() => setListOpen(true)}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setMemberError(null);
                  setListOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setListOpen(true);
                    setActiveIdx((i) =>
                      optionCount === 0 ? 0 : (i + 1) % optionCount,
                    );
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setListOpen(true);
                    setActiveIdx((i) =>
                      optionCount === 0
                        ? 0
                        : (i - 1 + optionCount) % optionCount,
                    );
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitActive();
                    return;
                  }
                  if (e.key === 'Escape') {
                    setListOpen(false);
                  }
                }}
              />

              {listOpen ? (
                <ul
                  id={listboxId}
                  role="listbox"
                  className="prepare-workspace__ac-list"
                  aria-label="Suggestions de membres"
                >
                  {assignable.isLoading ? (
                    <li className="prepare-workspace__ac-empty">Chargement…</li>
                  ) : null}

                  {!assignable.isLoading &&
                  suggestions.length === 0 &&
                  !showFreeEmailOption ? (
                    <li className="prepare-workspace__ac-empty">
                      {memberQuery.trim()
                        ? 'Aucun membre — saisissez un e-mail complet pour inviter'
                        : availableMembers.length === 0
                          ? 'Tous les membres sont déjà convoqués'
                          : 'Tapez pour filtrer les membres'}
                    </li>
                  ) : null}

                  {suggestions.map((u, idx) => {
                    const label = memberLabel(u);
                    return (
                      <li key={u.id} role="presentation">
                        <button
                          type="button"
                          id={`${listboxId}-opt-${idx}`}
                          role="option"
                          aria-selected={activeIdx === idx}
                          className={`prepare-workspace__ac-opt${activeIdx === idx ? ' is-active' : ''}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => void onAddMember(u)}
                        >
                          <UserInitialsAvatar
                            displayName={label}
                            seed={u.id}
                            size="sm"
                            className="prepare-workspace__part-av"
                          />
                          <span className="prepare-workspace__ac-opt-body">
                            <span className="prepare-workspace__ac-opt-t">
                              {label}
                            </span>
                            <span className="prepare-workspace__ac-opt-s">
                              Membre
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}

                  {showFreeEmailOption ? (
                    <li role="presentation">
                      <button
                        type="button"
                        id={`${listboxId}-opt-${suggestions.length}`}
                        role="option"
                        aria-selected={activeIdx === suggestions.length}
                        className={`prepare-workspace__ac-opt${activeIdx === suggestions.length ? ' is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIdx(suggestions.length)}
                        onClick={() => void onAddExternal(freeEmail)}
                      >
                        <span className="prepare-workspace__ac-opt-body">
                          <span className="prepare-workspace__ac-opt-t">
                            Inviter {freeEmail}
                          </span>
                          <span className="prepare-workspace__ac-opt-s">
                            Externe par e-mail
                          </span>
                        </span>
                      </button>
                    </li>
                  ) : null}

                  {freeEmailAlready ? (
                    <li className="prepare-workspace__ac-empty">
                      Cet e-mail est déjà convoqué
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {memberError ? (
                <p
                  id={`${memberInputId}-error`}
                  className="prepare-workspace__add-hint is-error"
                  role="alert"
                >
                  {memberError}
                </p>
              ) : (
                <p
                  id={`${memberInputId}-hint`}
                  className="prepare-workspace__add-hint"
                >
                  Membres du client — ou e-mail externe
                </p>
              )}
            </div>
          ) : (
            <div
              id={`${tabsId}-panel-team`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-team`}
              className="prepare-workspace__team-pane"
            >
              {teams.length === 0 ? (
                <div className="prepare-workspace__empty">
                  Aucune équipe — créez-en une via Gérer
                </div>
              ) : (
                <>
                  <label className="sr-only" htmlFor="pw-convene-team">
                    Convoquer une équipe
                  </label>
                  <Select
                    value={null}
                    onValueChange={(v) => {
                      if (v) void onConvene(v);
                    }}
                    disabled={teamsQuery.isLoading || pending}
                  >
                    <SelectTrigger
                      id="pw-convene-team"
                      className="min-h-11 w-full"
                      aria-label="Convoquer une équipe"
                    >
                      <SelectValue placeholder="Convoquer une équipe…">
                        {() => 'Convoquer une équipe…'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {displayLabel(t.name, 'Équipe')} —{' '}
                          {memberCountLabel(
                            t.memberCount ?? t.members?.length ?? 0,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="prepare-workspace__add-hint">
                    Convoque tous les membres de l’équipe en un clic
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="prepare-workspace__empty">Aucun participant convoqué</div>
      ) : (
        <ul className="prepare-workspace__parts" aria-label="Liste des participants">
          {sorted.map((p) => {
            const name = displayLabel(p.displayName, 'Participant');
            const role = p.roleLabel?.trim() || null;
            const isExternal = !p.userId;
            return (
              <li key={p.id} className="prepare-workspace__part">
                <UserInitialsAvatar
                  displayName={name}
                  seed={p.userId ?? p.id}
                  size="sm"
                  className="prepare-workspace__part-av"
                />
                <span className="prepare-workspace__part-body">
                  <span className="prepare-workspace__part-name">{name}</span>
                  {role ? (
                    <span className="prepare-workspace__part-role">{role}</span>
                  ) : isExternal ? (
                    <span className="prepare-workspace__part-role">Externe</span>
                  ) : null}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    className="prepare-workspace__part-x"
                    aria-label={`Retirer ${name}`}
                    onClick={() => {
                      void deleteParticipant
                        .mutateAsync({ reviewId, participantId: p.id })
                        .then(() => toast.success('Participant retiré'))
                        .catch((err) =>
                          toast.error(
                            apiErrorMessage(err, 'Retrait impossible'),
                          ),
                        );
                    }}
                  >
                    <X className="size-2.5" aria-hidden strokeWidth={2.5} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <ProjectTeamsEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        initialTeamId={editorTeamId}
      />
    </section>
  );
}
