'use client';

import React, { useState } from 'react';
import {
  useCreateEmailIdentityMutation,
  useDeleteEmailIdentityMutation,
  useEmailIdentitiesQuery,
  useUpdateEmailIdentityMutation,
} from '@/features/account/hooks/use-me-email-queries';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { MeEmailIdentity } from '@/services/me';
import { useAuth } from '@/context/auth-context';

function formatQueryErrorMessage(error: unknown): string {
  const base =
    error instanceof Error ? error.message : 'Erreur de chargement';
  if (base.includes('Cannot GET') || base.includes('Cannot POST')) {
    return `${base}\n\n→ L’API qui répond n’expose pas encore cette route : redémarrer NestJS (apps/api) ou reconstruire le conteneur « api » (Docker), puis vérifier INTERNAL_API_URL.`;
  }
  return base;
}

function IdentityRow({
  identity,
  editingId,
  setEditingId,
  editForm,
  setEditForm,
  onSaveEdit,
  onDelete,
  onDeactivate,
  saving,
}: {
  identity: MeEmailIdentity;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editForm: { email: string; displayName: string; replyToEmail: string };
  setEditForm: React.Dispatch<
    React.SetStateAction<{
      email: string;
      displayName: string;
      replyToEmail: string;
    }>
  >;
  onSaveEdit: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
  saving: boolean;
}) {
  const locked =
    Boolean(identity.isAccountPrimary) || Boolean(identity.directoryManaged);
  const isEditing = editingId === identity.id;

  if (isEditing) {
    return (
      <li className="bg-muted/25 px-4 py-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-email-${identity.id}`}>E-mail</Label>
            <Input
              id={`edit-email-${identity.id}`}
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-dn-${identity.id}`}>Libellé (optionnel)</Label>
            <Input
              id={`edit-dn-${identity.id}`}
              value={editForm.displayName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, displayName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-rt-${identity.id}`}>Reply-To (optionnel)</Label>
            <Input
              id={`edit-rt-${identity.id}`}
              type="email"
              value={editForm.replyToEmail}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, replyToEmail: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={onSaveEdit}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setEditingId(null)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold leading-snug text-foreground">
            {identity.email}
          </p>
          {identity.displayName?.trim() ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {identity.displayName.trim()}
            </p>
          ) : null}
          {identity.replyToEmail ? (
            <p className="mt-1 text-xs text-muted-foreground/90">
              Réponse à : {identity.replyToEmail}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {identity.isAccountPrimary ? (
            <Badge variant="secondary" className="font-normal">
              Compte
            </Badge>
          ) : null}
          {identity.directoryManaged ? (
            <Badge variant="secondary" className="font-normal">
              Annuaire AD
            </Badge>
          ) : null}
          {identity.isActive ? (
            <Badge variant="secondary" className="font-normal">
              Actif
            </Badge>
          ) : (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Inactif
            </Badge>
          )}
          {identity.isVerified ? (
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/5 font-normal text-primary"
            >
              Vérifié
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-primary/20 bg-accent/60 font-normal text-accent-foreground dark:bg-accent/25"
            >
              Non vérifié
            </Badge>
          )}
        </div>
        {locked ? (
          <p className="text-xs text-muted-foreground">
            {identity.isAccountPrimary
              ? 'E-mail de connexion au compte : non modifiable ici.'
              : 'Synchronisé depuis l’annuaire d’entreprise : non modifiable ici.'}
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-1 sm:mt-0 sm:justify-end">
        {!locked ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              disabled={saving}
              onClick={() => {
                setEditingId(identity.id);
                setEditForm({
                  email: identity.email,
                  displayName: identity.displayName ?? '',
                  replyToEmail: identity.replyToEmail ?? '',
                });
              }}
            >
              Modifier
            </Button>
            {identity.isActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                disabled={saving}
                onClick={onDeactivate}
              >
                Désactiver
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={saving}
              onClick={onDelete}
            >
              Supprimer
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function AccountProfileEmailRow({ email }: { email: string }) {
  return (
    <li className="px-4 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold leading-snug text-foreground">
            {email}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            E-mail de connexion au compte (non modifiable ici)
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="font-normal">
            Compte
          </Badge>
        </div>
      </div>
    </li>
  );
}

export function AccountEmailIdentitiesSection() {
  const { user } = useAuth();
  const accountEmail = user?.email ?? '';
  const { data: identities, isLoading, error, refetch } =
    useEmailIdentitiesQuery();
  const identityList = identities ?? [];
  const createMut = useCreateEmailIdentityMutation();
  const updateMut = useUpdateEmailIdentityMutation();
  const deleteMut = useDeleteEmailIdentityMutation();

  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newReplyTo, setNewReplyTo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    displayName: '',
    replyToEmail: '',
  });

  const saving =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createMut.mutateAsync({
        email: newEmail.trim(),
        displayName: newDisplayName.trim() || null,
        replyToEmail: newReplyTo.trim() || null,
      });
      setNewEmail('');
      setNewDisplayName('');
      setNewReplyTo('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleSaveEdit(identityId: string) {
    setFormError(null);
    try {
      await updateMut.mutateAsync({
        identityId,
        body: {
          email: editForm.email.trim(),
          displayName: editForm.displayName.trim() || null,
          replyToEmail: editForm.replyToEmail.trim() || null,
        },
      });
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleDeactivate(identityId: string) {
    setFormError(null);
    try {
      await updateMut.mutateAsync({
        identityId,
        body: { isActive: false },
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleDelete(identityId: string) {
    if (
      !window.confirm(
        'Supprimer définitivement cette adresse e-mail ? Cette action est irréversible si aucun client ne l’utilise comme défaut.',
      )
    ) {
      return;
    }
    setFormError(null);
    try {
      await deleteMut.mutateAsync(identityId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle>Adresses e-mail</CardTitle>
        <CardDescription>
          Adresses utilisables pour l’affichage et, plus tard, l’envoi de
          messages. L’e-mail de connexion au compte reste inchangé.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 px-0 pt-0">
        {error && (
          <div className="space-y-2 border-b border-border/60 px-4 py-4" role="alert">
            <p className="text-sm text-destructive whitespace-pre-line">
              {formatQueryErrorMessage(error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              Réessayer
            </Button>
          </div>
        )}
        {formError && (
          <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        {isLoading && identityList.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : null}

        {identityList.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {identityList.map((identity) => (
              <IdentityRow
                key={identity.id}
                identity={identity}
                editingId={editingId}
                setEditingId={setEditingId}
                editForm={editForm}
                setEditForm={setEditForm}
                saving={saving}
                onSaveEdit={() => void handleSaveEdit(identity.id)}
                onDelete={() => void handleDelete(identity.id)}
                onDeactivate={() => void handleDeactivate(identity.id)}
              />
            ))}
          </ul>
        ) : !isLoading && accountEmail ? (
          <ul className="divide-y divide-border/50">
            <AccountProfileEmailRow email={accountEmail} />
          </ul>
        ) : !isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune identité pour l’instant. Utilisez le formulaire ci-dessous pour en ajouter une.
          </p>
        ) : null}

        <form
          onSubmit={(e) => void handleCreate(e)}
          className="border-t border-border/60 bg-muted/20 px-4 py-5"
        >
          <p className="mb-4 text-sm font-medium text-foreground">
            Nouvelle adresse
          </p>
          <div className="mx-auto max-w-lg space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-dn">Libellé (optionnel)</Label>
              <Input
                id="new-dn"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="ex. Professionnel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-rt">Reply-To (optionnel)</Label>
              <Input
                id="new-rt"
                type="email"
                value={newReplyTo}
                onChange={(e) => setNewReplyTo(e.target.value)}
              />
            </div>
            <div className="pt-1">
              <Button type="submit" disabled={saving || !newEmail.trim()}>
                {createMut.isPending ? 'Ajout…' : 'Ajouter l’adresse'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
