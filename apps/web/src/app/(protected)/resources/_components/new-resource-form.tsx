'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { createCollaborator } from '@/features/teams/collaborators/api/collaborators.api';
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import { collaboratorQueryKeys } from '@/features/teams/collaborators/lib/collaborator-query-keys';
import { addWorkTeamMember } from '@/features/teams/work-teams/api/work-teams.api';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import { workTeamQueryKeys } from '@/features/teams/work-teams/lib/work-team-query-keys';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
} from '@/lib/resource-labels';
import { createResource } from '@/services/resources';
import type {
  ResourceAffiliation,
  ResourceListItem,
  ResourceType,
} from '@/services/resources';

export type NewResourceFormProps = {
  /** Préfixe pour éviter les doublons d’id (page vs modale). */
  formIdPrefix: string;
  onSuccess: (created: ResourceListItem) => void;
  /** Si défini : pas de sélecteur de type, création forcée (ex. Humaine depuis un autre flux). */
  forceType?: ResourceType;
  /** Classes du conteneur formulaire (ex. max-w-md). */
  className?: string;
};

export function NewResourceForm({
  formIdPrefix,
  onSuccess,
  forceType,
  className = 'max-w-md space-y-4',
}: NewResourceFormProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { has, isSuccess: permsSuccess } = usePermissions();

  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [type, setType] = useState<ResourceType>(forceType ?? 'HUMAN');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<ResourceAffiliation>('INTERNAL');
  const [companyName, setCompanyName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerId, setManagerId] = useState('');
  const [workTeamId, setWorkTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pid = (s: string) => `${formIdPrefix}-${s}`;
  const resolvedType = forceType ?? type;

  const showTeamsBlock = useMemo(
    () =>
      resolvedType === 'HUMAN' &&
      permsSuccess &&
      has('collaborators.create') &&
      has('teams.read') &&
      has('teams.update'),
    [resolvedType, permsSuccess, has],
  );

  const wantsTeamsSync = showTeamsBlock && (Boolean(managerId) || Boolean(workTeamId));

  const managersQuery = useCollaboratorManagerOptions(managerSearch, {
    enabled: showTeamsBlock,
  });
  const teamsQuery = useWorkTeamsList(
    { limit: 200, offset: 0, status: 'ACTIVE', includeArchived: false },
    { enabled: showTeamsBlock },
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type: resolvedType,
      };
      if (resolvedType === 'HUMAN') {
        const fn = firstName.trim();
        if (fn) body.firstName = fn;
        if (email.trim()) body.email = email.trim();
        body.affiliation = affiliation;
        if (affiliation === 'EXTERNAL' && companyName.trim()) {
          body.companyName = companyName.trim();
        }
        if (dailyRate.trim()) body.dailyRate = Number(dailyRate);
      }
      const created = await createResource(authFetch, body);

      if (resolvedType === 'HUMAN' && wantsTeamsSync) {
        const displayName =
          [firstName.trim(), name.trim()].filter(Boolean).join(' ') || name.trim();
        try {
          const collab = await createCollaborator(authFetch, {
            displayName,
            firstName: firstName.trim() || null,
            lastName: name.trim(),
            email: email.trim() ? email.trim() : null,
            managerId: managerId || null,
          });
          if (workTeamId) {
            await addWorkTeamMember(authFetch, workTeamId, {
              collaboratorId: collab.id,
              role: 'MEMBER',
            });
          }
          await queryClient.invalidateQueries({ queryKey: collaboratorQueryKeys.all });
          await queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
        } catch (teamsErr) {
          toast.warning('Ressource créée — module Équipes incomplet', {
            description: (teamsErr as Error).message,
          });
        }
      }

      onSuccess(created);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const teamItems = teamsQuery.data?.items ?? [];

  return (
    <form onSubmit={onSubmit} className={className}>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!forceType ? (
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
            <SelectTrigger>
              <SelectValue>{RESOURCE_TYPE_LABEL[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HUMAN">{RESOURCE_TYPE_LABEL.HUMAN}</SelectItem>
              <SelectItem value="MATERIAL">{RESOURCE_TYPE_LABEL.MATERIAL}</SelectItem>
              <SelectItem value="LICENSE">{RESOURCE_TYPE_LABEL.LICENSE}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {resolvedType === 'HUMAN' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid('firstName')}>Prénom</Label>
            <Input
              id={pid('firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="optionnel"
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
      {resolvedType === 'HUMAN' && (
        <>
          <div className="space-y-2">
            <Label htmlFor={pid('email')}>Email</Label>
            <Input
              id={pid('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optionnel"
            />
          </div>
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
                placeholder="Société"
                maxLength={200}
                autoComplete="organization"
              />
            </div>
          )}
        </>
      )}

      {showTeamsBlock && (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Équipes (référentiel)</p>
            <p className="text-xs text-muted-foreground">
              Si vous renseignez un manager et/ou une équipe, un collaborateur métier est aussi créé
              (module Équipes), en plus de la ressource projet.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid('mgr-search')}>Recherche manager</Label>
            <Input
              id={pid('mgr-search')}
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              placeholder="Nom ou email…"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid('manager')}>Manager</Label>
            <select
              id={pid('manager')}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={managersQuery.isLoading}
            >
              <option value="">
                {managersQuery.isLoading ? 'Chargement…' : '— Aucun'}
              </option>
              {(managersQuery.data?.items ?? []).map((c) => {
                const sec = collaboratorManagerSecondaryLabel(c);
                return (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                    {sec ? ` — ${sec}` : ''}
                  </option>
                );
              })}
            </select>
            {managersQuery.isError && (
              <div className="flex flex-wrap items-center gap-2" role="alert">
                <p className="text-xs text-destructive">
                  {(managersQuery.error as Error).message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void managersQuery.refetch()}
                >
                  Réessayer
                </Button>
              </div>
            )}
            {managersQuery.isSuccess &&
              (managersQuery.data?.items?.length ?? 0) === 0 &&
              !managersQuery.isFetching && (
                <p className="text-xs text-muted-foreground">
                  Aucun collaborateur actif : créez des fiches collaborateur ou élargissez la recherche.
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid('workTeam')}>Équipe</Label>
            <select
              id={pid('workTeam')}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={workTeamId}
              onChange={(e) => setWorkTeamId(e.target.value)}
              disabled={teamsQuery.isLoading}
            >
              <option value="">— Aucune</option>
              {teamItems.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.pathLabel || t.name}
                </option>
              ))}
            </select>
            {teamsQuery.isError && (
              <p className="text-xs text-destructive">Impossible de charger les équipes.</p>
            )}
          </div>
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Création…' : 'Créer'}
      </Button>
    </form>
  );
}
