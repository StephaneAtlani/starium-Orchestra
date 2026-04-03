'use client';

import React, { useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateClientMember } from '../hooks/use-create-client-member';
import { UserPlus } from 'lucide-react';

const ROLE_LABEL: Record<'CLIENT_ADMIN' | 'CLIENT_USER', string> = {
  CLIENT_ADMIN: 'Administrateur client',
  CLIENT_USER: 'Utilisateur client',
};

export function AddMemberDialog() {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'CLIENT_ADMIN' | 'CLIENT_USER'>(
    'CLIENT_USER',
  );
  const [password, setPassword] = useState('');
  const [excludeFromResourceCatalog, setExcludeFromResourceCatalog] =
    useState(false);
  const [err, setErr] = useState<string | null>(null);

  const createMember = useCreateClientMember();

  function reset() {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('CLIENT_USER');
    setPassword('');
    setExcludeFromResourceCatalog(false);
    setErr(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setErr('L’email est requis.');
      return;
    }

    createMember.mutate(
      {
        email: trimmed,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role,
        password: password.length > 0 ? password : undefined,
        excludeFromResourceCatalog:
          excludeFromResourceCatalog === true ? true : undefined,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
        onError: (error) => {
          setErr(error instanceof Error ? error.message : 'Erreur');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Ajouter un membre
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>
            Compte déjà présent sur la plateforme : saisissez l’email sans mot
            de passe. Sinon, mot de passe initial (≥ 8 caractères) pour créer le
            compte et le rattacher à ce client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-email`}>Email</Label>
            <Input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
            <Label htmlFor={`${formId}-role`}>Rôle sur ce client</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole(v as 'CLIENT_ADMIN' | 'CLIENT_USER')
              }
            >
              <SelectTrigger id={`${formId}-role`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT_USER">
                  {ROLE_LABEL.CLIENT_USER}
                </SelectItem>
                <SelectItem value="CLIENT_ADMIN">
                  {ROLE_LABEL.CLIENT_ADMIN}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-pw`}>Mot de passe initial</Label>
            <Input
              id={`${formId}-pw`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="Obligatoire si le compte n’existe pas encore"
            />
            <p className="text-xs text-muted-foreground">
              Si l’email existe déjà sur la plateforme, laissez vide : le membre
              est rattaché sans changer son mot de passe.
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input"
              checked={excludeFromResourceCatalog}
              onChange={(e) => setExcludeFromResourceCatalog(e.target.checked)}
            />
            <span className="text-sm leading-snug">
              <span className="font-medium">Masquer ce compte au catalogue de ressources</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Par défaut, une fiche Humaine est créée pour le planning. Cochez pour ne pas
                l’exposer dans le catalogue sur ce client.
              </span>
            </span>
          </label>
          {err && (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          )}
          <DialogFooter showCloseButton={false} className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createMember.isPending}>
              {createMember.isPending ? 'Enregistrement…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
