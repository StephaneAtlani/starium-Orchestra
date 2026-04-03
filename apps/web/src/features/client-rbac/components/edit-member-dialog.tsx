'use client';

import React, { useEffect, useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useUpdateClientMember } from '../hooks/use-update-client-member';
import type { ClientMember, UpdateClientMemberPayload } from '../api/user-roles';

const ROLE_LABEL: Record<'CLIENT_ADMIN' | 'CLIENT_USER', string> = {
  CLIENT_ADMIN: 'Administrateur client',
  CLIENT_USER: 'Utilisateur client',
};

const STATUS_LABEL: Record<'ACTIVE' | 'SUSPENDED' | 'INVITED', string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  INVITED: 'Invité',
};

export type EditMemberDialogProps = {
  member: ClientMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
}: EditMemberDialogProps) {
  const formId = useId();
  const { user: authUser } = useAuth();
  const userId = member?.id ?? '';
  const updateMember = useUpdateClientMember(userId);
  const isEditingSelf = Boolean(member && authUser?.id === member.id);
  const isDirectoryLocked = Boolean(member?.isDirectoryLocked);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'CLIENT_ADMIN' | 'CLIENT_USER'>('CLIENT_USER');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'INVITED'>('ACTIVE');
  const [excludeFromResourceCatalog, setExcludeFromResourceCatalog] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setExcludeFromResourceCatalog(member.excludeFromResourceCatalog === true);
    setFirstName(member.firstName ?? '');
    setLastName(member.lastName ?? '');
    setRole(
      member.role === 'CLIENT_ADMIN' || member.role === 'CLIENT_USER'
        ? member.role
        : 'CLIENT_USER',
    );
    setStatus(
      member.status === 'ACTIVE' ||
        member.status === 'SUSPENDED' ||
        member.status === 'INVITED'
        ? member.status
        : 'ACTIVE',
    );
    setErr(null);
  }, [open, member]);

  function handleOpenChange(next: boolean) {
    if (!next) setErr(null);
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setErr(null);
    const payload: UpdateClientMemberPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      excludeFromResourceCatalog,
    };
    if (!isEditingSelf && !isDirectoryLocked) {
      payload.role = role;
      payload.status = status;
    }

    try {
      await updateMember.mutateAsync(payload);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Erreur');
      return;
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Modifier le membre</DialogTitle>
          <DialogDescription>
            Identité et statut sur ce client. L’email du compte plateforme n’est pas modifiable ici.
          </DialogDescription>
        </DialogHeader>
        {member ? (
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Email</Label>
              <p className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                {member.email}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${formId}-fn`}>Prénom</Label>
                <Input
                  id={`${formId}-fn`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  disabled={isDirectoryLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-ln`}>Nom</Label>
                <Input
                  id={`${formId}-ln`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  disabled={isDirectoryLocked}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={isEditingSelf ? undefined : `${formId}-role`}>
                Rôle sur ce client
              </Label>
              {isEditingSelf || isDirectoryLocked ? (
                <>
                  <p
                    id={`${formId}-role-readonly`}
                    className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                  >
                    {ROLE_LABEL[role] ?? role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDirectoryLocked
                      ? 'Compte synchronisé ADDS: rôle verrouillé par la politique de synchronisation.'
                      : 'Vous ne pouvez pas modifier votre propre rôle client depuis cette interface.'}
                  </p>
                </>
              ) : (
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as 'CLIENT_ADMIN' | 'CLIENT_USER')}
                >
                  <SelectTrigger id={`${formId}-role`} className="w-full">
                    <SelectValue>{ROLE_LABEL[role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT_USER">{ROLE_LABEL.CLIENT_USER}</SelectItem>
                    <SelectItem value="CLIENT_ADMIN">{ROLE_LABEL.CLIENT_ADMIN}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={isEditingSelf ? undefined : `${formId}-status`}>
                Statut
              </Label>
              {isEditingSelf || isDirectoryLocked ? (
                <>
                  <p
                    id={`${formId}-status-readonly`}
                    className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                  >
                    {STATUS_LABEL[status] ?? status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDirectoryLocked
                      ? 'Compte synchronisé ADDS: statut verrouillé par la politique de synchronisation.'
                      : 'Vous ne pouvez pas modifier le statut de votre propre compte depuis cette interface (évite de vous désactiver par erreur).'}
                  </p>
                </>
              ) : (
                <Select
                  value={status}
                  onValueChange={(v) =>
                    setStatus(v as 'ACTIVE' | 'SUSPENDED' | 'INVITED')
                  }
                >
                  <SelectTrigger id={`${formId}-status`} className="w-full">
                    <SelectValue>{STATUS_LABEL[status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {STATUS_LABEL[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-input"
                checked={excludeFromResourceCatalog}
                onChange={(e) => setExcludeFromResourceCatalog(e.target.checked)}
                disabled={isDirectoryLocked}
              />
              <span className="text-sm leading-snug">
                <span className="font-medium">Masquer ce compte au catalogue de ressources</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Par défaut, chaque membre a une fiche Humaine (portée interne) pour affectations et
                  planning. Cochez pour retirer ce compte du catalogue sur ce client.
                </span>
              </span>
            </label>
            {err ? (
              <p className="text-sm text-destructive" role="alert">
                {err}
              </p>
            ) : null}
            <DialogFooter showCloseButton={false} className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateMember.isPending || isDirectoryLocked}
              >
                {updateMember.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
