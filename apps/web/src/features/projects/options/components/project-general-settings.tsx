'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { listAssignableUsers, listProjectPortfolioCategories } from '@/features/projects/api/projects.api';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '@/features/projects/constants/project-enum-labels';
import type { ProjectDetail } from '@/features/projects/types/project.types';
import type { ProjectAssignableUser } from '@/features/projects/types/project.types';
import { useUpdateProjectOptionsMutation } from '../hooks/use-update-project-options-mutation';
import { cn } from '@/lib/utils';

const textareaClass = cn(
  'min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

function userLabel(u: ProjectAssignableUser) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || u.email;
}

type Props = {
  project: ProjectDetail;
};

export function ProjectGeneralSettings({ project }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const updateMutation = useUpdateProjectOptionsMutation(project.id);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState(project.status);
  const [type, setType] = useState(project.type);
  const [priority, setPriority] = useState(project.priority);
  const [startDate, setStartDate] = useState(
    project.startDate ? project.startDate.slice(0, 10) : '',
  );
  const [targetEndDate, setTargetEndDate] = useState(
    project.targetEndDate ? project.targetEndDate.slice(0, 10) : '',
  );
  const [sponsorUserId, setSponsorUserId] = useState(project.sponsorUserId ?? '');
  const [ownerUserId, setOwnerUserId] = useState(project.ownerUserId ?? '');
  const [portfolioCategoryId, setPortfolioCategoryId] = useState(
    project.portfolioCategory?.id ?? '',
  );

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
    setStatus(project.status);
    setType(project.type);
    setPriority(project.priority);
    setStartDate(project.startDate ? project.startDate.slice(0, 10) : '');
    setTargetEndDate(project.targetEndDate ? project.targetEndDate.slice(0, 10) : '');
    setSponsorUserId(project.sponsorUserId ?? '');
    setOwnerUserId(project.ownerUserId ?? '');
    setPortfolioCategoryId(project.portfolioCategory?.id ?? '');
  }, [project]);

  const usersQuery = useQuery({
    queryKey: projectQueryKeys.assignableUsers(clientId),
    queryFn: () => listAssignableUsers(authFetch),
    enabled: Boolean(clientId),
  });

  const categoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
  });

  const users = usersQuery.data?.users ?? [];
  const selectableSubCategories = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .filter((root) => root.isActive)
        .flatMap((root) =>
          (root.children ?? [])
            .filter((child) => child.isActive)
            .map((child) => ({
              id: child.id,
              name: child.name,
              rootName: root.name,
            })),
        ),
    [categoriesQuery.data],
  );

  const statusKeys = Object.keys(PROJECT_STATUS_LABEL) as Array<keyof typeof PROJECT_STATUS_LABEL>;
  const typeKeys = Object.keys(PROJECT_TYPE_LABEL) as Array<keyof typeof PROJECT_TYPE_LABEL>;
  const priorityKeys = Object.keys(PROJECT_PRIORITY_LABEL) as Array<
    keyof typeof PROJECT_PRIORITY_LABEL
  >;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const body: Record<string, unknown> = {
      name: name.trim(),
      status,
      type,
      priority,
    };
    if (description.trim()) body.description = description.trim();
    else body.description = null;
    if (startDate) body.startDate = startDate;
    else body.startDate = null;
    if (targetEndDate) body.targetEndDate = targetEndDate;
    else body.targetEndDate = null;
    if (sponsorUserId) body.sponsorUserId = sponsorUserId;
    else body.sponsorUserId = null;
    if (ownerUserId) body.ownerUserId = ownerUserId;
    else body.ownerUserId = null;
    if (portfolioCategoryId) body.portfolioCategoryId = portfolioCategoryId;
    else body.portfolioCategoryId = null;

    updateMutation.mutate(body);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="opt-name">Nom</Label>
          <Input
            id="opt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="opt-desc">Description</Label>
          <textarea
            id="opt-desc"
            className={textareaClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Sponsor</Label>
          <Select
            value={sponsorUserId || '__none__'}
            onValueChange={(v) =>
              setSponsorUserId(!v || v === '__none__' ? '' : v)
            }
            disabled={!canEdit || usersQuery.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {userLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Chef de projet</Label>
          <Select
            value={ownerUserId || '__none__'}
            onValueChange={(v) => setOwnerUserId(!v || v === '__none__' ? '' : v)}
            disabled={!canEdit || usersQuery.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {userLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Catégorie (portefeuille)</Label>
          <Select
            value={portfolioCategoryId || '__none__'}
            onValueChange={(v) =>
              setPortfolioCategoryId(!v || v === '__none__' ? '' : v)
            }
            disabled={!canEdit || categoriesQuery.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {selectableSubCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.rootName} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v ?? '')}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {PROJECT_STATUS_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v ?? '')}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {PROJECT_TYPE_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priorité</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v ?? '')}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {PROJECT_PRIORITY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opt-start">Date de début</Label>
          <Input
            id="opt-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opt-end">Date cible de fin</Label>
          <Input
            id="opt-end"
            type="date"
            value={targetEndDate}
            onChange={(e) => setTargetEndDate(e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>
      {canEdit ? (
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      ) : null}
    </form>
  );
}
