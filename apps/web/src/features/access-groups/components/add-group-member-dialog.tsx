'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { useGroupMembers } from '../hooks/use-group-members';
import { useAddGroupMember } from '../hooks/use-add-group-member';

function memberOptionLabel(m: ClientMember): string {
  const parts = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return parts ? `${parts} (${m.email})` : m.email;
}

type Props = {
  groupId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddGroupMemberDialog({ groupId, open, onOpenChange }: Props) {
  const formId = useId();
  const [userId, setUserId] = useState<string>('');
  const { data: clientMembers = [], isLoading: loadingClients } =
    useClientMembers();
  const { data: groupMembers = [], isLoading: loadingGroup } =
    useGroupMembers(groupId);
  const addMember = useAddGroupMember(groupId);

  const inGroup = useMemo(
    () => new Set(groupMembers.map((r) => r.userId)),
    [groupMembers],
  );

  const available = useMemo(
    () =>
      clientMembers.filter(
        (m) =>
          m.status === 'ACTIVE' &&
          !inGroup.has(m.id),
      ),
    [clientMembers, inGroup],
  );

  function reset() {
    setUserId('');
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    addMember.mutate(userId, {
      onSuccess: () => handleOpenChange(false),
    });
  }

  const loading = loadingClients || loadingGroup;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>
            Seuls les membres actifs du client peuvent être ajoutés. Les
            utilisateurs déjà dans le groupe ne sont pas listés.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-user`}>Utilisateur</Label>
            <Select
              value={userId || undefined}
              onValueChange={(v) => setUserId(v ?? '')}
              disabled={loading || available.length === 0 || addMember.isPending}
            >
              <SelectTrigger id={`${formId}-user`} className="w-full">
                <SelectValue placeholder={loading ? 'Chargement…' : 'Choisir…'} />
              </SelectTrigger>
              <SelectContent>
                {available.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {memberOptionLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loading && available.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun utilisateur disponible à ajouter (tous sont déjà dans le
                groupe ou inactifs).
              </p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={addMember.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={
              !userId || addMember.isPending || available.length === 0
            }
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
