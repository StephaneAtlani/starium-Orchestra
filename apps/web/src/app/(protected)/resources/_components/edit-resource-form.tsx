'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
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
import {
  getCollaboratorById,
  listCollaboratorWorkTeams,
} from '@/features/teams/collaborators/api/collaborators.api';
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { collaboratorQueryKeys } from '@/features/teams/collaborators/lib/collaborator-query-keys';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import { workTeamQueryKeys } from '@/features/teams/work-teams/lib/work-team-query-keys';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
} from '@/lib/resource-labels';
import { cn } from '@/lib/utils';
import {
  getResource,
  listResourceRoles,
  updateResource,
} from '@/services/resources';
import type { ResourceAffiliation, ResourceListItem, ResourceType } from '@/services/resources';
import { findCollaboratorIdForHumanResource } from '../_lib/find-collaborator-for-human-resource';
import type { TeamMembershipRef } from '../_lib/sync-human-resource-collaborator-teams';
import { syncCollaboratorManagerAndTeams } from '../_lib/sync-human-resource-collaborator-teams';
import { ResourceHumanTeamsFields } from './resource-human-teams-fields';

const ROLE_NONE = '__none__';

type EditResourceFormProps = {
  resourceId: string;
  formIdPrefix: string;
  onSaved?: () => void;
  /** Ex. modale pleine largeur : `w-full max-w-full`. */
  className?: string;
};

export function EditResourceForm({
  resourceId,
  formIdPrefix,
  onSaved,
  className,
}: EditResourceFormProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();

  const pid = (s: string) => `${formIdPrefix}-${s}`;

  const { data: r, isLoading, error, refetch } = useQuery({
    queryKey: ['resource', 'detail', clientId, resourceId],
    queryFn: () => getResource(authFetch, resourceId),
    enabled: !!clientId && !!resourceId,
  });

  const identityFromMember = Boolean(r?.linkedUserId);

  const showTeamsBlock = useMemo(
    () =>
      r?.type === 'HUMAN' &&
      !identityFromMember &&
      permsSuccess &&
      has('collaborators.read') &&
      has('collaborators.update') &&
      has('teams.read') &&
      has('teams.update'),
    [r?.type, identityFromMember, permsSuccess, has],
  );

  const collabTeamsQuery = useQuery({
    queryKey: ['resource', 'edit-collab-teams', clientId, resourceId, r?.email],
    queryFn: async () => {
      if (!r) throw new Error('missing resource');
      const id = await findCollaboratorIdForHumanResource(authFetch, r);
      if (!id) {
        return { managerId: '', memberships: [] as TeamMembershipRef[] };
      }
      const [collab, teams] = await Promise.all([
        getCollaboratorById(authFetch, id),
        listCollaboratorWorkTeams(authFetch, id, {
          limit: 200,
          offset: 0,
          includeArchived: false,
        }),
      ]);
      const memberships: TeamMembershipRef[] = teams.items.map((row) => ({
        teamId: row.id,
        membershipId: row.membershipId,
      }));
      return {
        managerId: collab.managerId ?? '',
        memberships,
      };
    },
    enabled: !!clientId && !!r && showTeamsBlock,
  });

  const [managerSearch, setManagerSearch] = useState('');
  const [managerId, setManagerId] = useState('');
  const [selectedWorkTeamIds, setSelectedWorkTeamIds] = useState<string[]>([]);
  const [initialMemberships, setInitialMemberships] = useState<TeamMembershipRef[]>([]);
  const [baselineManagerId, setBaselineManagerId] = useState<string | null>(null);

  useEffect(() => {
    if (!collabTeamsQuery.isSuccess || !collabTeamsQuery.data) return;
    const d = collabTeamsQuery.data;
    setManagerId(d.managerId);
    setBaselineManagerId(d.managerId || null);
    setSelectedWorkTeamIds(d.memberships.map((m) => m.teamId));
    setInitialMemberships(d.memberships);
  }, [collabTeamsQuery.isSuccess, collabTeamsQuery.dataUpdatedAt, resourceId]);

  const managersQuery = useCollaboratorManagerOptions(managerSearch, {
    enabled: showTeamsBlock,
  });
  const teamsQuery = useWorkTeamsList(
    {
      limit: 200,
      offset: 0,
      status: 'ACTIVE',
      includeArchived: false,
      ...(managerId ? { leadResourceId: managerId } : {}),
    },
    { enabled: showTeamsBlock && Boolean(managerId) },
  );

  function handleManagerIdChange(next: string) {
    setManagerId((prev) => {
      if (prev !== next) setSelectedWorkTeamIds([]);
      return next;
    });
  }

  const { data: rolesData } = useQuery({
    queryKey: ['resource-roles', clientId, 'for-edit'],
    queryFn: () => listResourceRoles(authFetch, { limit: 200, offset: 0 }),
    enabled: !!clientId && r?.type === 'HUMAN' && !identityFromMember,
  });

  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<ResourceAffiliation>('INTERNAL');
  const [companyName, setCompanyName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [roleId, setRoleId] = useState<string>(ROLE_NONE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!r) return;
    setName(r.name);
    setFirstName(r.firstName ?? '');
    setEmail(r.email ?? '');
    setAffiliation((r.affiliation as ResourceAffiliation) ?? 'INTERNAL');
    setCompanyName(r.companyName ?? '');
    setDailyRate(r.dailyRate ?? '');
    setRoleId(r.role?.id ?? ROLE_NONE);
  }, [r]);

  function toggleWorkTeam(teamId: string, selected: boolean) {
    setSelectedWorkTeamIds((prev) => {
      const s = new Set(prev);
      if (selected) s.add(teamId);
      else s.delete(teamId);
      return Array.from(s);
    });
  }

  const shouldSyncTeams =
    showTeamsBlock &&
    collabTeamsQuery.isSuccess &&
    (Boolean(managerId) ||
      selectedWorkTeamIds.length > 0 ||
      initialMemberships.length > 0 ||
      baselineManagerId !== null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!r) return;
    setSaving(true);
    setFormError(null);
    try {
      if (r.type === 'HUMAN') {
        if (r.linkedUserId) {
          await updateResource(authFetch, resourceId, {
            affiliation,
            companyName:
              affiliation === 'EXTERNAL' ? companyName.trim() || null : null,
            dailyRate: dailyRate.trim() ? Number(dailyRate) : null,
          });
        } else {
          await updateResource(authFetch, resourceId, {
            name: name.trim(),
            firstName: firstName.trim() || null,
            email: email.trim() || null,
            affiliation,
            companyName:
              affiliation === 'EXTERNAL' ? companyName.trim() || null : null,
            dailyRate: dailyRate.trim() ? Number(dailyRate) : null,
            roleId: roleId === ROLE_NONE ? null : roleId,
          });
        }
      } else {
        await updateResource(authFetch, resourceId, {
          name: name.trim(),
        });
      }

      const refreshed = await refetch();
      const next = refreshed.data ?? r;

      if (r.type === 'HUMAN' && !identityFromMember && shouldSyncTeams) {
        const merged: ResourceListItem = {
          ...next,
          name: name.trim(),
          firstName: firstName.trim() || null,
          email: email.trim() || null,
        };
        try {
          await syncCollaboratorManagerAndTeams(
            authFetch,
            merged,
            managerId || null,
            selectedWorkTeamIds,
            initialMemberships,
          );
          await queryClient.invalidateQueries({ queryKey: collaboratorQueryKeys.all });
          await queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
          await collabTeamsQuery.refetch();
        } catch (teamsErr) {
          toast.warning('Ressource enregistrée — module Équipes incomplet', {
            description: (teamsErr as Error).message,
          });
        }
      }

      onSaved?.();
    } catch (err) {
      setFormError((err as Error).message ?? 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (error || !r) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Ressource introuvable ou erreur de chargement.
      </p>
    );
  }

  const typeLabel = RESOURCE_TYPE_LABEL[r.type as ResourceType];
  const roleItems = rolesData?.items ?? [];
  const teamItems = teamsQuery.data?.items ?? [];

  return (
    <form onSubmit={onSubmit} className={cn('max-w-md space-y-4', className)}>
      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <p className="text-sm text-muted-foreground">{typeLabel}</p>
      </div>

      {r.type === 'HUMAN' && identityFromMember ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Prénom, nom et email sont ceux du{' '}
            <strong className="text-foreground">membre client</strong> (compte plateforme). Modifiez-les
            depuis la fiche membre.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Prénom</Label>
              <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                {firstName || '—'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Nom</Label>
              <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                {name}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Email</Label>
            <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
              {email || '—'}
            </p>
          </div>
          <Link
            href={`/client/members?edit=${r.linkedUserId}`}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Modifier le membre
          </Link>
        </div>
      ) : r.type === 'HUMAN' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid('firstName')}>Prénom</Label>
            <Input
              id={pid('firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid('name')}>Nom</Label>
            <Input
              id={pid('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              autoComplete="family-name"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={pid('name')}>Nom</Label>
          <Input
            id={pid('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={1}
          />
        </div>
      )}

      {r.type === 'HUMAN' && !identityFromMember && (
        <>
          <div className="space-y-2">
            <Label htmlFor={pid('email')}>Email</Label>
            <Input
              id={pid('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </>
      )}

      {r.type === 'HUMAN' && (
        <>
          {!identityFromMember ? (
            <div className="space-y-2">
              <Label>Rôle métier</Label>
              <Select value={roleId} onValueChange={(v) => setRoleId(v ?? ROLE_NONE)}>
                <SelectTrigger id={pid('roleId')}>
                  <SelectValue>
                    {roleId === ROLE_NONE
                      ? '— Aucun —'
                      : (roleItems.find((x) => x.id === roleId)?.name ?? '—')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_NONE}>— Aucun —</SelectItem>
                  {roleItems.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[8rem]">
              <Label htmlFor={pid('rate')} className="text-xs text-muted-foreground">
                TJ (€)
              </Label>
              <Input
                id={pid('rate')}
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label className="text-xs text-muted-foreground">Portée</Label>
              <Select
                value={affiliation}
                onValueChange={(v) => {
                  const next = v as ResourceAffiliation;
                  setAffiliation(next);
                  if (next === 'INTERNAL') setCompanyName('');
                }}
              >
                <SelectTrigger id={pid('affiliation')} className="w-full">
                  <SelectValue>{RESOURCE_AFFILIATION_LABEL[affiliation]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Interne</SelectItem>
                  <SelectItem value="EXTERNAL">Externe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {affiliation === 'EXTERNAL' && (
            <div className="space-y-2">
              <Label htmlFor={pid('companyName')}>Société</Label>
              <Input
                id={pid('companyName')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={200}
                autoComplete="organization"
              />
            </div>
          )}
        </>
      )}

      {showTeamsBlock && (
        <>
          {collabTeamsQuery.isLoading ? (
            <div className="border-t border-border/60 pt-4">
              <LoadingState rows={3} />
            </div>
          ) : (
            <ResourceHumanTeamsFields
              formIdPrefix={formIdPrefix}
              managerSearch={managerSearch}
              onManagerSearchChange={setManagerSearch}
              managerId={managerId}
              onManagerIdChange={handleManagerIdChange}
              selectedWorkTeamIds={selectedWorkTeamIds}
              onToggleWorkTeam={toggleWorkTeam}
              managersQuery={managersQuery}
              teamsLoading={teamsQuery.isLoading}
              teamsError={teamsQuery.isError}
              teamItems={teamItems}
            />
          )}
        </>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
