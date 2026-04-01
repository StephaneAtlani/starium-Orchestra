'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collaboratorEditSchema, type CollaboratorEditValues } from '../schemas/collaborator-edit.schema';
import type { CollaboratorListItem } from '../types/collaborator.types';
import { useUpdateCollaborator } from '../hooks/use-update-collaborator';
import { useCollaboratorManagerOptions } from '../hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '../lib/collaborator-label-mappers';

function tagsToInput(tags: Record<string, unknown> | null): string {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) return '';
  return Object.keys(tags).join(', ');
}

function tagsFromInput(value: string): Record<string, boolean> | null {
  const keys = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (keys.length === 0) return null;
  return keys.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

export function CollaboratorEditForm({
  collaborator,
  canUpdate,
}: {
  collaborator: CollaboratorListItem;
  canUpdate: boolean;
}) {
  const mutation = useUpdateCollaborator(collaborator.id);
  const managerSearch = '';
  const { data: managerOptionsData } = useCollaboratorManagerOptions(managerSearch);

  const managerOptions = useMemo(() => {
    return managerOptionsData?.items ?? [];
  }, [managerOptionsData?.items]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CollaboratorEditValues>({
    resolver: zodResolver(collaboratorEditSchema),
    defaultValues: {
      displayName: collaborator.displayName ?? '',
      email: collaborator.email ?? '',
      jobTitle: collaborator.jobTitle ?? '',
      department: collaborator.department ?? '',
      managerId: collaborator.managerId ?? '',
      internalNotes: collaborator.internalNotes ?? '',
      tagsInput: tagsToInput(
        collaborator.internalTags && typeof collaborator.internalTags === 'object'
          ? (collaborator.internalTags as Record<string, unknown>)
          : null,
      ),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!canUpdate) return;
    await mutation.mutateAsync({
      displayName: values.displayName.trim(),
      email: values.email.trim() ? values.email.trim() : null,
      jobTitle: values.jobTitle.trim() ? values.jobTitle.trim() : null,
      department: values.department.trim() ? values.department.trim() : null,
      managerId: values.managerId.trim() ? values.managerId.trim() : null,
      internalNotes: values.internalNotes.trim() ? values.internalNotes.trim() : null,
      internalTags: tagsFromInput(values.tagsInput),
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="collab-displayName">Nom affiché</Label>
          <Input id="collab-displayName" {...register('displayName')} disabled={!canUpdate} />
          {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="collab-email">Email</Label>
          <Input id="collab-email" {...register('email')} disabled={!canUpdate} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="collab-jobTitle">Fonction</Label>
          <Input id="collab-jobTitle" {...register('jobTitle')} disabled={!canUpdate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collab-department">Département</Label>
          <Input id="collab-department" {...register('department')} disabled={!canUpdate} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="collab-managerId">Manager</Label>
          <select
            id="collab-managerId"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={!canUpdate}
            {...register('managerId')}
          >
            <option value="">Aucun manager</option>
            {managerOptions.map((option) => {
              const secondary = collaboratorManagerSecondaryLabel(option);
              return (
                <option key={option.id} value={option.id}>
                  {secondary ? `${option.displayName} — ${secondary}` : option.displayName}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="collab-tags">Tags (CSV)</Label>
          <Input id="collab-tags" {...register('tagsInput')} disabled={!canUpdate} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="collab-notes">Notes internes</Label>
          <Input id="collab-notes" {...register('internalNotes')} disabled={!canUpdate} />
        </div>
      </div>

      {canUpdate ? (
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas la permission <code>collaborators.update</code>.
        </p>
      )}

      {mutation.error && (
        <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p className="text-sm text-emerald-600">Collaborateur mis à jour.</p>}
    </form>
  );
}

