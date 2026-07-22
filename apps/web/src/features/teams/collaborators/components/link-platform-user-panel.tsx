'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';
import { getClientMembers, type ClientMember } from '@/features/client-rbac/api/user-roles';
import { linkCollaboratorPlatformUser } from '../api/collaborators.api';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';
import type { CollaboratorListItem } from '../types/collaborator.types';

function memberDisplayLabel(member: ClientMember): string {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  if (!fullName) return member.email;
  return `${fullName} — ${member.email}`;
}

type Props = {
  collaborator: CollaboratorListItem;
  canLink: boolean;
};

export function LinkPlatformUserPanel({ collaborator, canLink }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const needsLink =
    collaborator.platformUserLinkStatus === 'LINK_REQUIRED' ||
    (collaborator.source === 'DIRECTORY_SYNC' && !collaborator.linkedUserId);

  const membersQuery = useQuery({
    queryKey: ['client-members', 'link-platform-user'],
    queryFn: () => getClientMembers(authFetch),
    enabled: canLink && needsLink,
  });

  const activeMembers = useMemo(
    () => (membersQuery.data ?? []).filter((m) => m.status === 'ACTIVE'),
    [membersQuery.data],
  );

  const selectedMember = activeMembers.find((m) => m.id === selectedUserId);

  const linkMutation = useMutation({
    mutationFn: () => linkCollaboratorPlatformUser(authFetch, collaborator.id, selectedUserId),
    onSuccess: async () => {
      toast.success('Compte Starium rattaché au collaborateur annuaire.');
      setConfirmOpen(false);
      setSelectedUserId('');
      await queryClient.invalidateQueries({ queryKey: collaboratorQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Échec du rattachement.');
    },
  });

  if (!needsLink || !canLink) return null;

  const directoryEmail = collaborator.email ?? collaborator.username ?? '—';

  return (
    <section
      className="space-y-4 rounded-lg border border-amber-500/35 bg-amber-500/5 p-4 dark:bg-amber-500/10"
      aria-labelledby="link-platform-user-heading"
    >
      <div className="space-y-1">
        <h3 id="link-platform-user-heading" className="text-base font-semibold">
          Compte Starium à rattacher
        </h3>
        <p className="text-sm text-muted-foreground">
          L&apos;adresse annuaire{' '}
          <span className="font-medium text-foreground">{directoryEmail}</span> n&apos;est rattachée
          à aucun compte. Sélectionnez le membre client existant à associer.
        </p>
      </div>

      {membersQuery.isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Chargement des membres du client…
        </p>
      )}

      {membersQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Impossible de charger les membres</AlertTitle>
          <AlertDescription>{(membersQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {membersQuery.isSuccess && activeMembers.length === 0 && (
        <Alert>
          <AlertTitle>Aucun membre actif</AlertTitle>
          <AlertDescription>
            Aucun compte client actif n&apos;est disponible pour le rattachement.
          </AlertDescription>
        </Alert>
      )}

      {activeMembers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="link-platform-user-select">Membre Starium</Label>
          <Select
            value={selectedUserId || undefined}
            onValueChange={(value) => setSelectedUserId(value ?? '')}
          >
            <SelectTrigger id="link-platform-user-select" className="min-h-11 w-full">
              <SelectValue placeholder="Choisir un compte membre actif" />
            </SelectTrigger>
            <SelectContent>
              {activeMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {memberDisplayLabel(member)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        type="button"
        className="min-h-11"
        disabled={!selectedUserId || linkMutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        Rattacher le compte
      </Button>

      <StariumModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmer le rattachement SSO"
        description="Cette action crée une identité e-mail annuaire sur le compte sélectionné."
        size="md"
        contentClassName="sm:max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={linkMutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={linkMutation.isPending || !selectedUserId}
              onClick={() => linkMutation.mutate()}
            >
              Confirmer le rattachement
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Impact connexion Microsoft</AlertTitle>
            <AlertDescription>
              L&apos;adresse{' '}
              <strong className="font-medium text-foreground">{directoryEmail}</strong> sera
              enregistrée comme identité annuaire vérifiée sur le compte{' '}
              <strong className="font-medium text-foreground">
                {selectedMember ? memberDisplayLabel(selectedMember) : 'sélectionné'}
              </strong>
              . La connexion SSO Microsoft avec cette adresse utilisera ce compte.
            </AlertDescription>
          </Alert>
          <p>
            Aucune correspondance automatique par nom ou département n&apos;est effectuée : vous
            validez explicitement le compte cible.
          </p>
        </div>
      </StariumModal>
    </section>
  );
}
