'use client';

import React, { useId, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RESOURCE_ACL_PERMISSION_LABEL,
  RESOURCE_ACL_PERMISSION_HINT,
} from '../lib/labels';
import {
  alreadyAssignedIdsForSubjectType,
  filterAvailableSubjects,
  isDuplicateSubject,
  type SubjectCandidate,
} from '../lib/filter-available-subjects';
import type {
  ResourceAclEntry,
  ResourceAclEntryInput,
  ResourceAclPermission,
  ResourceAclSubjectType,
} from '../api/resource-acl.types';

interface Props {
  entries: ResourceAclEntry[];
  userCandidates: SubjectCandidate[];
  groupCandidates: SubjectCandidate[];
  /** Self-lockout : option « M'ajouter en ADMIN » uniquement quand `restricted === false`. */
  showSelfAdminOption: boolean;
  selfAdminChecked: boolean;
  onSelfAdminCheckedChange: (checked: boolean) => void;
  isPending: boolean;
  disabled?: boolean;
  onSubmit: (entry: ResourceAclEntryInput) => void;
}

const PERMISSIONS: ResourceAclPermission[] = ['READ', 'WRITE', 'ADMIN'];

export function ResourceAclAddEntryForm({
  entries,
  userCandidates,
  groupCandidates,
  showSelfAdminOption,
  selfAdminChecked,
  onSelfAdminCheckedChange,
  isPending,
  disabled = false,
  onSubmit,
}: Props) {
  const formId = useId();
  const [subjectType, setSubjectType] = useState<ResourceAclSubjectType>('USER');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [permission, setPermission] = useState<ResourceAclPermission>('READ');

  const alreadyAssignedUsers = useMemo(
    () => alreadyAssignedIdsForSubjectType(entries, 'USER'),
    [entries],
  );
  const alreadyAssignedGroups = useMemo(
    () => alreadyAssignedIdsForSubjectType(entries, 'GROUP'),
    [entries],
  );

  const availableUsers = useMemo(
    () => filterAvailableSubjects(userCandidates, alreadyAssignedUsers, search),
    [userCandidates, alreadyAssignedUsers, search],
  );
  const availableGroups = useMemo(
    () =>
      filterAvailableSubjects(groupCandidates, alreadyAssignedGroups, search),
    [groupCandidates, alreadyAssignedGroups, search],
  );

  const visibleCandidates =
    subjectType === 'USER' ? availableUsers : availableGroups;

  const isDuplicate =
    !!subjectId &&
    isDuplicateSubject({ entries, subjectType, subjectId });

  const canSubmit =
    !disabled &&
    !isPending &&
    !!subjectId &&
    !isDuplicate &&
    visibleCandidates.some((c) => c.id === subjectId);

  function reset() {
    setSubjectId('');
    setSearch('');
    setPermission('READ');
  }

  function handleSubjectTypeChange(next: string) {
    if (next !== 'USER' && next !== 'GROUP') return;
    setSubjectType(next);
    reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ subjectType, subjectId, permission });
    reset();
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-3"
      data-testid="resource-acl-add-entry-form"
    >
      <Tabs value={subjectType} onValueChange={handleSubjectTypeChange}>
        <TabsList>
          <TabsTrigger value="USER">Utilisateur</TabsTrigger>
          <TabsTrigger value="GROUP">Groupe</TabsTrigger>
        </TabsList>

        <TabsContent value="USER" className="space-y-3 pt-3">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-search-user`}>Rechercher</Label>
            <Input
              id={`${formId}-search-user`}
              placeholder="Nom, prénom, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              disabled={disabled || isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-user`}>Utilisateur</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v ?? '')}
              disabled={disabled || isPending || availableUsers.length === 0}
            >
              <SelectTrigger id={`${formId}-user`} className="w-full">
                <SelectValue
                  placeholder={
                    availableUsers.length === 0
                      ? 'Aucun utilisateur disponible'
                      : 'Choisir…'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="GROUP" className="space-y-3 pt-3">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-search-group`}>Rechercher</Label>
            <Input
              id={`${formId}-search-group`}
              placeholder="Nom du groupe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              disabled={disabled || isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-group`}>Groupe</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v ?? '')}
              disabled={disabled || isPending || availableGroups.length === 0}
            >
              <SelectTrigger id={`${formId}-group`} className="w-full">
                <SelectValue
                  placeholder={
                    availableGroups.length === 0
                      ? 'Aucun groupe disponible'
                      : 'Choisir…'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-permission`}>Permission</Label>
        <Select
          value={permission}
          onValueChange={(v) =>
            setPermission((v ?? 'READ') as ResourceAclPermission)
          }
          disabled={disabled || isPending}
        >
          <SelectTrigger id={`${formId}-permission`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERMISSIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {RESOURCE_ACL_PERMISSION_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {RESOURCE_ACL_PERMISSION_HINT[permission]}
        </p>
      </div>

      {showSelfAdminOption && (
        <label
          className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm"
          data-testid="resource-acl-self-admin-option"
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selfAdminChecked}
            onChange={(e) => onSelfAdminCheckedChange(e.target.checked)}
            disabled={disabled || isPending}
            aria-label="M'ajouter en ADMIN sur cette ressource"
          />
          <span>
            <strong>M'ajouter en ADMIN</strong> sur cette ressource. Recommandé
            pour ne pas perdre l'accès en édition après le passage en mode
            restreint.
          </span>
        </label>
      )}

      {isDuplicate && (
        <p
          className="text-sm text-destructive"
          data-testid="resource-acl-duplicate-warning"
          role="alert"
        >
          Ce sujet est déjà présent dans la liste ACL.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          Ajouter la permission
        </Button>
      </div>
    </form>
  );
}
