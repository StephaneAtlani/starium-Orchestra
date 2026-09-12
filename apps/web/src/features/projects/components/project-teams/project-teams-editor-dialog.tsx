'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookUser, Plus, Search, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useProjectAssignableUsers } from '../../hooks/use-project-assignable-users';
import { useProjectTeamsQuery } from '../../hooks/use-project-governance-circles-query';
import { useProjectTeamQuery } from '../../hooks/use-project-team-queries';
import { useProjectTeamsMutations } from '../../hooks/use-project-teams-mutations';
import {
  PROJECT_TEAM_COLOR_LABEL,
  PROJECT_TEAM_COLOR_SWATCH,
  PROJECT_TEAM_COLOR_TOKENS,
  resolveTeamColorToken,
  userIdentityKey,
} from '../../lib/project-team-color';
import type {
  ProjectGovernanceCircleApi,
  ProjectTeamColorToken,
  ProjectTeamMemberRefApi,
} from '../../types/project.types';
import { ProjectTeamDirectoryPersonDialog } from './project-team-directory-person-dialog';
import { StariumScrollArea } from '@/components/layout/starium-scroll-area';

const CREATE_DRAFT_ID = '__create__';

type DraftMember = {
  identityKey: string;
  userId: string | null;
  resourceId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  sortOrder: number;
};

type DraftTeam = {
  id: string;
  name: string;
  label: string;
  colorToken: ProjectTeamColorToken;
  pilotIdentityKey: string | null;
  members: DraftMember[];
  isNew: boolean;
};

type DirectoryPerson = {
  identityKey: string;
  userId: string | null;
  displayName: string;
  subtitle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
};

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTeamId?: string | null;
  startInCreate?: boolean;
  canEdit?: boolean;
};

function formatAssignableUser(u: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Parse « Nom », « email@x.com » ou « Nom <email@x.com> ». */
function parseInviteInput(raw: string): {
  firstName: string;
  lastName: string;
  email: string | null;
} {
  const t = raw.trim();
  const angled = t.match(/^(.+?)\s*<([^<>\s]+)>$/);
  if (angled) {
    const parts = angled[1].trim().split(/\s+/);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      email: angled[2].trim(),
    };
  }
  if (isValidEmail(t)) {
    return { firstName: '', lastName: '', email: t.toLowerCase() };
  }
  const parts = t.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    email: null,
  };
}

function teamToDraft(team: ProjectGovernanceCircleApi): DraftTeam {
  const members = (team.members ?? []).map((m, i) => ({
    identityKey: m.identityKey,
    userId: m.userId,
    resourceId: m.resourceId ?? null,
    displayName: displayLabel(m.displayName, 'Membre'),
    firstName: m.firstName?.trim() || null,
    lastName: m.lastName?.trim() || null,
    companyName: m.companyName?.trim() || null,
    email: m.email?.trim() || null,
    sortOrder: m.sortOrder ?? i,
  }));
  return {
    id: team.id,
    name: team.name,
    label: team.label ?? '',
    colorToken: resolveTeamColorToken(team.colorToken),
    pilotIdentityKey: team.pilotIdentityKey ?? null,
    members,
    isNew: false,
  };
}

function emptyDraft(colorToken: ProjectTeamColorToken = 'GREEN'): DraftTeam {
  return {
    id: CREATE_DRAFT_ID,
    name: 'Nouvelle équipe',
    label: '',
    colorToken,
    pilotIdentityKey: null,
    members: [],
    isNew: true,
  };
}

function memberCountLabel(n: number): string {
  if (n === 0) return '0 membre';
  if (n === 1) return '1 membre';
  return `${n} membres`;
}

export function ProjectTeamsEditorDialog({
  projectId,
  open,
  onOpenChange,
  initialTeamId = null,
  startInCreate = false,
  canEdit = true,
}: Props) {
  const teamsQuery = useProjectTeamsQuery(projectId, { enabled: open });
  const rosterQuery = useProjectTeamQuery(projectId, { enabled: open });
  const assignable = useProjectAssignableUsers({ enabled: open });
  const { createTeam, updateTeam, deleteTeam } =
    useProjectTeamsMutations(projectId);

  const teams = useMemo(
    () => teamsQuery.data?.items ?? [],
    [teamsQuery.data?.items],
  );

  const [selectedId, setSelectedId] = useState<string>(CREATE_DRAFT_ID);
  const [draft, setDraft] = useState<DraftTeam>(emptyDraft());
  const [personQuery, setPersonQuery] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const syncFromProps = useCallback(() => {
    if (startInCreate || !initialTeamId) {
      setSelectedId(CREATE_DRAFT_ID);
      setDraft(emptyDraft());
      return;
    }
    const found = teams.find((t) => t.id === initialTeamId);
    if (found) {
      setSelectedId(found.id);
      setDraft(teamToDraft(found));
      return;
    }
    if (teams[0]) {
      setSelectedId(teams[0].id);
      setDraft(teamToDraft(teams[0]));
      return;
    }
    setSelectedId(CREATE_DRAFT_ID);
    setDraft(emptyDraft());
  }, [initialTeamId, startInCreate, teams]);

  const resetInviteForm = useCallback(() => {
    setPersonQuery('');
    setDirectoryOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      resetInviteForm();
      return;
    }
    syncFromProps();
  }, [open, syncFromProps, resetInviteForm]);

  const directory = useMemo(() => {
    const map = new Map<string, DirectoryPerson>();

    for (const u of assignable.data?.users ?? []) {
      const displayName = formatAssignableUser(u);
      const identityKey = userIdentityKey(u.id);
      map.set(identityKey, {
        identityKey,
        userId: u.id,
        displayName,
        subtitle: u.email,
        email: u.email,
      });
    }

    for (const fp of assignable.data?.freePersons ?? []) {
      if (map.has(fp.identityKey)) continue;
      map.set(fp.identityKey, {
        identityKey: fp.identityKey,
        userId: null,
        displayName: displayLabel(fp.label, 'Personne'),
      });
    }

    for (const m of rosterQuery.data ?? []) {
      if (map.has(m.identityKey)) continue;
      map.set(m.identityKey, {
        identityKey: m.identityKey,
        userId: m.userId,
        displayName: displayLabel(m.displayName, 'Personne'),
        subtitle: m.email || m.roleName || null,
        email: m.email || null,
      });
    }

    for (const team of teams) {
      for (const m of team.members ?? []) {
        if (map.has(m.identityKey)) continue;
        map.set(m.identityKey, {
          identityKey: m.identityKey,
          userId: m.userId,
          displayName: displayLabel(m.displayName, 'Personne'),
          subtitle: m.companyName || m.email || null,
          firstName: m.firstName ?? null,
          lastName: m.lastName ?? null,
          companyName: m.companyName ?? null,
          email: m.email ?? null,
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'fr'),
    );
  }, [assignable.data?.users, assignable.data?.freePersons, rosterQuery.data, teams]);

  const selectedKeys = useMemo(
    () => new Set(draft.members.map((m) => m.identityKey)),
    [draft.members],
  );

  const filteredSuggestions = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    const available = directory.filter((p) => !selectedKeys.has(p.identityKey));
    if (!q) return available.slice(0, 12);
    return available
      .filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          (p.subtitle?.toLowerCase().includes(q) ?? false) ||
          (p.email?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 12);
  }, [directory, selectedKeys, personQuery]);

  const exactDirectoryMatch = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return null;
    return (
      directory.find(
        (p) =>
          !selectedKeys.has(p.identityKey) &&
          (p.displayName.toLowerCase() === q ||
            p.email?.toLowerCase() === q ||
            p.subtitle?.toLowerCase() === q),
      ) ?? null
    );
  }, [directory, personQuery, selectedKeys]);

  const selectExisting = (team: ProjectGovernanceCircleApi) => {
    setConfirmDelete(false);
    setSelectedId(team.id);
    setDraft(teamToDraft(team));
  };

  const startCreate = () => {
    setConfirmDelete(false);
    setSelectedId(CREATE_DRAFT_ID);
    setDraft(emptyDraft());
  };

  const addMember = (person: DirectoryPerson | DraftMember) => {
    if (!canEdit) return;
    if (selectedKeys.has(person.identityKey)) return;
    setDraft((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        {
          identityKey: person.identityKey,
          userId: person.userId,
          resourceId:
            'resourceId' in person ? person.resourceId?.trim() || null : null,
          displayName: displayLabel(person.displayName, 'Membre'),
          firstName: person.userId
            ? null
            : ('firstName' in person ? person.firstName?.trim() || null : null),
          lastName: person.userId
            ? null
            : ('lastName' in person ? person.lastName?.trim() || null : null),
          companyName: person.userId
            ? null
            : ('companyName' in person
                ? person.companyName?.trim() || null
                : null),
          email: person.userId
            ? null
            : ('email' in person ? person.email?.trim() || null : null),
          sortOrder: prev.members.length,
        },
      ],
    }));
    resetInviteForm();
  };

  const removeMember = (identityKey: string) => {
    if (!canEdit) return;
    setDraft((prev) => ({
      ...prev,
      members: prev.members
        .filter((m) => m.identityKey !== identityKey)
        .map((m, i) => ({ ...m, sortOrder: i })),
      pilotIdentityKey:
        prev.pilotIdentityKey === identityKey ? null : prev.pilotIdentityKey,
    }));
  };

  const onAddPersonSubmit = () => {
    if (exactDirectoryMatch) {
      addMember(exactDirectoryMatch);
      return;
    }
    if (personQuery.trim()) {
      setDirectoryOpen(true);
    }
  };

  const directoryPrefill = useMemo(() => {
    const parsed = parseInviteInput(personQuery);
    return {
      email: parsed.email ?? (isValidEmail(personQuery) ? personQuery.trim() : ''),
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    };
  }, [personQuery]);

  const onSave = async () => {
    if (!canEdit) return;
    const name = draft.name.trim();
    if (name.length < 2) {
      toast.error('Donnez un nom à l’équipe — deux caractères au minimum.');
      return;
    }
    if (name.length > 24) {
      toast.error('Le nom de l’équipe est limité à 24 caractères.');
      return;
    }

    const members: ProjectTeamMemberRefApi[] = draft.members.map((m, i) => ({
      identityKey: m.identityKey,
      userId: m.userId,
      resourceId: m.userId ? null : m.resourceId,
      displayName: m.displayName,
      firstName: m.userId ? null : m.firstName,
      lastName: m.userId ? null : m.lastName,
      companyName: m.userId ? null : m.companyName,
      email: m.userId ? null : m.email,
      sortOrder: i,
    }));

    const body = {
      name,
      label: draft.label.trim() || null,
      colorToken: draft.colorToken,
      pilotIdentityKey: draft.pilotIdentityKey,
      members: members.map((m) => ({
        identityKey: m.identityKey,
        userId: m.userId,
        resourceId: m.resourceId,
        displayName: m.displayName,
        firstName: m.firstName,
        lastName: m.lastName,
        companyName: m.companyName,
        email: m.email,
        sortOrder: m.sortOrder,
      })),
    };

    setSaving(true);
    try {
      if (draft.isNew) {
        const created = await createTeam.mutateAsync(body);
        toast.success(`Équipe ${displayLabel(created.name, 'équipe')} enregistrée.`);
        setSelectedId(created.id);
        setDraft(teamToDraft(created));
      } else {
        const updated = await updateTeam.mutateAsync({
          teamId: draft.id,
          body,
        });
        toast.success(`Équipe ${displayLabel(updated.name, 'équipe')} enregistrée.`);
        setDraft(teamToDraft(updated));
      }
      if (draft.pilotIdentityKey) {
        const pilot = draft.members.find((m) => m.identityKey === draft.pilotIdentityKey);
        toast.message(
          `Suggestion RASCI : affectez R ou A à ${displayLabel(pilot?.displayName, 'le pilote')} sur la fiche — non appliqué automatiquement.`,
        );
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!canEdit || draft.isNew) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      const result = await deleteTeam.mutateAsync(draft.id);
      toast.success(
        result.message ??
          `Équipe ${displayLabel(result.name, 'supprimée')} · les points déjà convoqués ne sont pas modifiés`,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const readOnly = !canEdit;

  return (
    <>
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Équipes du projet"
      description="COPIL, COPROJ, COTECH… Composez les instances du projet une fois ; elles se retrouvent dans la préparation de chaque point."
      icon={Users}
      size="full"
      contentClassName="sm:max-w-6xl !h-[min(90dvh,calc(100dvh-2rem))] !max-h-[min(90dvh,calc(100dvh-2rem))]"
      bodyClassName="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-0"
      footer={
        <>
          {!draft.isNew && canEdit ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9 mr-auto"
              disabled={saving || deleteTeam.isPending}
              onClick={() => void onDelete()}
            >
              {confirmDelete ? 'Confirmer la suppression' : 'Supprimer l’équipe'}
            </Button>
          ) : (
            <span className="mr-auto" />
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          {canEdit ? (
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={saving || createTeam.isPending || updateTeam.isPending}
              onClick={() => void onSave()}
            >
              Enregistrer
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden md:grid-cols-[minmax(14rem,17rem)_1fr]">
        <aside className="flex h-full min-h-0 flex-col overflow-hidden border-b border-border/70 md:border-b-0 md:border-r">
          <StariumScrollArea
            className="min-h-0 flex-1"
            viewportClassName="space-y-1 p-3"
            reveal="hover"
          >
            <ul role="listbox" aria-label="Liste des équipes" className="space-y-1">
              {teams.map((team) => {
                const active = selectedId === team.id;
                const color = resolveTeamColorToken(team.colorToken);
                const count = team.memberCount ?? team.members?.length ?? 0;
                const teamName = displayLabel(team.name, 'Équipe');
                const teamLabel = team.label?.trim() || null;
                return (
                  <li key={team.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectExisting(team)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                        'min-h-11 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                        active
                          ? 'bg-muted/60 ring-1 ring-border/70'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-2.5 shrink-0 rounded-full',
                          PROJECT_TEAM_COLOR_SWATCH[color],
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {teamName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {memberCountLabel(count)}
                          {teamLabel ? ` · ${teamLabel}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {selectedId === CREATE_DRAFT_ID ? (
                <li>
                  <div
                    className="flex w-full items-start gap-2 rounded-lg bg-muted/60 px-2.5 py-2 ring-1 ring-border/70"
                    aria-current="true"
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-2.5 shrink-0 rounded-full',
                        PROJECT_TEAM_COLOR_SWATCH[draft.colorToken],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {displayLabel(draft.name, 'Nouvelle équipe')}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {memberCountLabel(draft.members.length)}
                        {draft.label.trim() ? ` · ${draft.label.trim()}` : ''}
                      </span>
                    </span>
                  </div>
                </li>
              ) : null}
            </ul>
          </StariumScrollArea>
          {canEdit ? (
            <div className="border-t border-border/70 p-3">
              <button
                type="button"
                onClick={startCreate}
                className="flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed border-border/80 text-sm font-medium text-[color:var(--brand-gold-700)] transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                + Nouvelle équipe
              </button>
            </div>
          ) : null}
        </aside>

        <StariumScrollArea
          className="starium-form h-full min-h-0"
          viewportClassName="starium-form space-y-4 p-4 sm:p-5"
          reveal="hover"
        >
          <div className="starium-form-field">
            <label htmlFor="team-name" className="starium-form-label">
              Nom de l’équipe
            </label>
            <Input
              id="team-name"
              className="starium-form-input !h-11 !min-h-11"
              value={draft.name}
              maxLength={24}
              disabled={readOnly}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="starium-form-field">
            <label htmlFor="team-label" className="starium-form-label">
              Libellé
            </label>
            <Input
              id="team-label"
              className="starium-form-input !h-11 !min-h-11"
              value={draft.label}
              maxLength={200}
              placeholder="Comité de pilotage"
              disabled={readOnly}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, label: e.target.value }))
              }
            />
          </div>

          <div
            className="starium-form-field"
            role="group"
            aria-labelledby="team-color-label"
          >
            <p id="team-color-label" className="starium-form-label">
              Couleur
            </p>
            <div
              className="flex flex-wrap items-center gap-2"
              role="radiogroup"
              aria-label="Couleur de l’équipe"
            >
              {PROJECT_TEAM_COLOR_TOKENS.map((token) => {
                const selected = draft.colorToken === token;
                return (
                  <button
                    key={token}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={PROJECT_TEAM_COLOR_LABEL[token]}
                    disabled={readOnly}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, colorToken: token }))
                    }
                    className={cn(
                      'size-9 shrink-0 rounded-full transition-shadow focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                      PROJECT_TEAM_COLOR_SWATCH[token],
                      selected
                        ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground'
                        : 'ring-1 ring-border/60',
                    )}
                  />
                );
              })}
            </div>
          </div>

          <div className="starium-form-field">
            <p className="starium-form-label">
              Membres ({draft.members.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.members.map((m) => {
                const name = displayLabel(m.displayName, 'Membre');
                const isPilot = draft.pilotIdentityKey === m.identityKey;
                return (
                  <div
                    key={m.identityKey}
                    className={cn(
                      'inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card px-2 py-1.5',
                      isPilot && 'ring-1 ring-[color:var(--brand-gold)]',
                    )}
                  >
                    <UserInitialsAvatar
                      displayName={name}
                      seed={m.identityKey}
                      size="sm"
                      className="size-7 rounded-full border-0"
                    />
                    <button
                      type="button"
                      className="min-w-0 text-left text-sm"
                      disabled={readOnly}
                      title={
                        canEdit
                          ? isPilot
                            ? 'Pilote actuel'
                            : 'Définir comme pilote'
                          : undefined
                      }
                      onClick={() => {
                        if (!canEdit) return;
                        setDraft((prev) => ({
                          ...prev,
                          pilotIdentityKey: isPilot ? null : m.identityKey,
                        }));
                      }}
                    >
                      <span className="block truncate font-medium">{name}</span>
                      {isPilot ? (
                        <span className="block text-[10px] text-muted-foreground">
                          Pilote
                        </span>
                      ) : m.companyName || m.email ? (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {[m.companyName, m.email].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-destructive"
                        aria-label={`Retirer ${name}`}
                        onClick={() => removeMember(m.identityKey)}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {canEdit ? (
              <div className="mt-3 space-y-2">
                <label
                  htmlFor="team-search-person"
                  className="starium-form-label"
                >
                  Rechercher un membre
                </label>
                <TooltipProvider>
                  <div className="flex items-center gap-1.5">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="team-search-person"
                        className="starium-form-input !h-9 !min-h-9 !py-0 !pl-8 !pr-2.5 text-sm"
                        value={personQuery}
                        placeholder="Nom ou e-mail déjà connu…"
                        autoComplete="off"
                        onChange={(e) => setPersonQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onAddPersonSubmit();
                          }
                        }}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex shrink-0">
                            <IconButton
                              type="button"
                              size="icon-sm"
                              className="!size-9"
                              aria-label="Ajouter"
                              disabled={!exactDirectoryMatch}
                              onClick={onAddPersonSubmit}
                            >
                              <Plus className="size-4" aria-hidden />
                            </IconButton>
                          </span>
                        }
                      />
                      <TooltipContent side="bottom">Ajouter</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex shrink-0">
                            <IconButton
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              className="!size-9"
                              aria-label="Ajouter à l’annuaire"
                              onClick={() => setDirectoryOpen(true)}
                            >
                              <BookUser className="size-4" aria-hidden />
                            </IconButton>
                          </span>
                        }
                      />
                      <TooltipContent side="bottom">
                        Ajouter à l’annuaire
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {filteredSuggestions.length > 0 ? (
                  <div
                    className="flex flex-wrap gap-2 pt-1"
                    aria-label="Suggestions de personnes"
                  >
                    {filteredSuggestions.map((p) => {
                      const name = displayLabel(p.displayName, 'Personne');
                      return (
                        <button
                          key={p.identityKey}
                          type="button"
                          onClick={() => addMember(p)}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-left transition-[border-color,box-shadow,background-color] hover:border-border hover:shadow-[var(--shadow-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                        >
                          <UserInitialsAvatar
                            displayName={name}
                            seed={p.identityKey}
                            size="sm"
                            className="size-7 rounded-full border-0"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {name}
                            </span>
                            {p.subtitle ? (
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {p.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : personQuery.trim() ? (
                  <p
                    className="text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    Aucun compte trouvé — utilisez « Ajouter à l’annuaire » pour
                    créer une ressource humaine externe.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="starium-form-hint">
            Cette équipe est proposée dans la préparation de chaque point projet
            : un clic convoque tous ses membres.
          </p>
        </StariumScrollArea>
      </div>
    </StariumModal>

      <ProjectTeamDirectoryPersonDialog
        projectId={projectId}
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
        initialEmail={directoryPrefill.email}
        initialFirstName={directoryPrefill.firstName}
        initialLastName={directoryPrefill.lastName}
        onCreated={(member) => {
          addMember({
            identityKey: member.identityKey,
            userId: member.userId,
            resourceId: member.resourceId ?? null,
            displayName: member.displayName,
            firstName: member.firstName ?? null,
            lastName: member.lastName ?? null,
            companyName: member.companyName ?? null,
            email: member.email ?? null,
            sortOrder: draft.members.length,
          });
          setPersonQuery('');
        }}
      />
    </>
  );
}
