'use client';

import React, { useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { createResource } from '@/services/resources';
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
  const queryClient = useQueryClient();
  const authFetch = useAuthenticatedFetch();
  const { has, isLoading: permsLoading } = usePermissions();
  const { user: authUser } = useAuth();
  const userId = member?.id ?? '';
  const updateMember = useUpdateClientMember(userId);
  const isEditingSelf = Boolean(member && authUser?.id === member.id);
  const canCreateResource = !permsLoading && has('resources.create');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'CLIENT_ADMIN' | 'CLIENT_USER'>('CLIENT_USER');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'INVITED'>('ACTIVE');
  const [addToResourceCatalog, setAddToResourceCatalog] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setAddToResourceCatalog(false);
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
    };
    if (!isEditingSelf) {
      payload.role = role;
      payload.status = status;
    }

    try {
      await updateMember.mutateAsync(payload);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Erreur');
      return;
    }

    if (addToResourceCatalog && canCreateResource) {
      try {
        const last = (lastName.trim() || member.lastName?.trim() || '—').slice(0, 200);
        const fn = firstName.trim() || member.firstName?.trim() || '';
        await createResource(authFetch, {
          type: 'HUMAN',
          name: last,
          ...(fn ? { firstName: fn } : {}),
          email: member.email.trim(),
          affiliation: 'INTERNAL',
        });
        void queryClient.invalidateQueries({ queryKey: ['resources'] });
      } catch (subErr) {
        const m = subErr instanceof Error ? subErr.message : '';
        const dup =
          /unique|unicité|contrainte|existe|déjà|conflict|409/i.test(m) ||
          m.toLowerCase().includes('email');
        setErr(
          dup
            ? 'Membre enregistré. Une ressource avec cet email existe déjà dans le catalogue.'
            : `Membre enregistré. ${m || 'Impossible d’ajouter au catalogue ressources.'}`,
        );
        void queryClient.invalidateQueries({ queryKey: ['resources'] });
        return;
      }
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-ln`}>Nom</Label>
                <Input
                  id={`${formId}-ln`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={isEditingSelf ? undefined : `${formId}-role`}>
                Rôle sur ce client
              </Label>
              {isEditingSelf ? (
                <>
                  <p
                    id={`${formId}-role-readonly`}
                    className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                  >
                    {ROLE_LABEL[role] ?? role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vous ne pouvez pas modifier votre propre rôle client depuis cette interface.
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
              {isEditingSelf ? (
                <>
                  <p
                    id={`${formId}-status-readonly`}
                    className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                  >
                    {STATUS_LABEL[status] ?? status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vous ne pouvez pas modifier le statut de votre propre compte depuis cette
                    interface (évite de vous désactiver par erreur).
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
            {canCreateResource ? (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input"
                  checked={addToResourceCatalog}
                  onChange={(e) => setAddToResourceCatalog(e.target.checked)}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium">Ajouter ce compte au catalogue de ressources</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Crée une ressource de type Personne (portée interne) avec l’email et le nom
                    ci-dessus, pour les affectations projets / planning.
                  </span>
                </span>
              </label>
            ) : null}
            {err ? (
              <p
                className={cn(
                  'text-sm',
                  err.startsWith('Membre enregistré')
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-destructive',
                )}
                role="alert"
              >
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
                disabled={updateMember.isPending}
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
