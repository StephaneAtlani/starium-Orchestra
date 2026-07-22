'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  Lock,
  LogIn,
  ShieldAlert,
} from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { getClientMembers, type ClientMember } from '@/features/client-rbac/api/user-roles';
import { linkCollaboratorPlatformUser } from '../api/collaborators.api';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';
import {
  linkPlatformUserErrorGuidance,
  linkPlatformUserErrorTitle,
  parseLinkPlatformUserError,
  type LinkPlatformUserErrorCode,
} from '../lib/link-platform-user-errors';
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
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ssoAcknowledged, setSsoAcknowledged] = useState(false);
  const [policyError, setPolicyError] = useState<{
    code: LinkPlatformUserErrorCode;
    message: string;
  } | null>(null);

  const needsLink =
    collaborator.platformUserLinkStatus === 'LINK_REQUIRED' ||
    (collaborator.source === 'DIRECTORY_SYNC' && !collaborator.linkedUserId);

  const isLinked =
    collaborator.platformUserLinkStatus === 'LINKED' && Boolean(collaborator.linkedUserId);

  const membersQuery = useQuery({
    queryKey: ['client-members', 'link-platform-user'],
    queryFn: () => getClientMembers(authFetch),
    enabled: canLink && (needsLink || isLinked),
  });

  const activeMembers = useMemo(() => {
    const members = (membersQuery.data ?? []).filter((m) => m.status === 'ACTIVE');
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const label = memberDisplayLabel(m).toLowerCase();
      return label.includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [membersQuery.data, memberSearch]);

  const selectedMember = (membersQuery.data ?? []).find((m) => m.id === selectedUserId);
  const linkedMember = (membersQuery.data ?? []).find((m) => m.id === collaborator.linkedUserId);

  const linkMutation = useMutation({
    mutationFn: () => linkCollaboratorPlatformUser(authFetch, collaborator.id, selectedUserId),
    onSuccess: async () => {
      toast.success('Compte Starium rattaché. Le SSO Microsoft utilisera ce compte.');
      setConfirmOpen(false);
      setSelectedUserId('');
      setSsoAcknowledged(false);
      setPolicyError(null);
      await queryClient.invalidateQueries({ queryKey: collaboratorQueryKeys.all });
    },
    onError: (error: unknown) => {
      const parsed = parseLinkPlatformUserError(error);
      setPolicyError({ code: parsed.code, message: parsed.message });
      toast.error(linkPlatformUserErrorTitle(parsed.code));
      if (parsed.code === 'MFA_REQUIRED' || parsed.code === 'REAUTH_REQUIRED') {
        setConfirmOpen(false);
      }
    },
  });

  const directoryEmail = collaborator.email ?? collaborator.username ?? '—';

  if (isLinked && collaborator.source === 'DIRECTORY_SYNC') {
    return (
      <section
        className="space-y-2 rounded-lg border border-border/70 bg-card p-4"
        aria-labelledby="linked-platform-user-heading"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <h3 id="linked-platform-user-heading" className="text-base font-semibold">
              Compte Starium rattaché
            </h3>
            <p className="text-sm text-muted-foreground">
              L&apos;adresse annuaire{' '}
              <span className="font-medium text-foreground">{directoryEmail}</span> est liée au
              compte plateforme
              {linkedMember ? (
                <>
                  {' '}
                  <span className="font-medium text-foreground">
                    {memberDisplayLabel(linkedMember)}
                  </span>
                </>
              ) : (
                ' sélectionné'
              )}
              . La connexion SSO Microsoft avec cette adresse utilise ce compte.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!needsLink) return null;

  if (!canLink) {
    return (
      <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
        <Lock className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle>Compte Starium à rattacher</AlertTitle>
        <AlertDescription>
          Ce collaborateur annuaire n&apos;est lié à aucun compte. Un administrateur client avec la
          permission de rattachement peut effectuer l&apos;association.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-amber-500/35 bg-amber-500/5 p-4 dark:bg-amber-500/10"
      aria-labelledby="link-platform-user-heading"
    >
      <div className="flex items-start gap-3">
        <Link2
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <h3 id="link-platform-user-heading" className="text-base font-semibold">
            Compte Starium à rattacher
          </h3>
          <p className="text-sm text-muted-foreground">
            L&apos;adresse annuaire{' '}
            <span className="font-medium text-foreground">{directoryEmail}</span> n&apos;est
            rattachée à aucun compte. Choisissez le membre client existant — aucune suggestion
            automatique par nom.
          </p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {linkMutation.isPending ? 'Rattachement en cours' : ''}
        {policyError ? linkPlatformUserErrorTitle(policyError.code) : ''}
      </div>

      {policyError && (
        <Alert
          variant={
            policyError.code === 'MFA_REQUIRED' || policyError.code === 'REAUTH_REQUIRED'
              ? 'default'
              : 'destructive'
          }
          className={
            policyError.code === 'MFA_REQUIRED' || policyError.code === 'REAUTH_REQUIRED'
              ? 'border-amber-500/35 bg-background'
              : undefined
          }
        >
          <ShieldAlert className="size-4" />
          <AlertTitle>{linkPlatformUserErrorTitle(policyError.code)}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{policyError.message}</p>
            {linkPlatformUserErrorGuidance(policyError.code) && (
              <p className="text-muted-foreground">
                {linkPlatformUserErrorGuidance(policyError.code)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {policyError.code === 'MFA_REQUIRED' && (
                <Link
                  href="/account"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
                >
                  <Lock className="size-4" />
                  Ouvrir Mon compte → Sécurité
                </Link>
              )}
              {policyError.code === 'REAUTH_REQUIRED' && (
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
                >
                  <LogIn className="size-4" />
                  Se reconnecter
                </Link>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => setPolicyError(null)}
              >
                Fermer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

      {membersQuery.isSuccess && (membersQuery.data ?? []).filter((m) => m.status === 'ACTIVE').length === 0 && (
        <Alert>
          <AlertTitle>Aucun membre actif</AlertTitle>
          <AlertDescription>
            Aucun compte client actif n&apos;est disponible pour le rattachement. Créez ou activez
            d&apos;abord le membre dans Accès / Utilisateurs.
          </AlertDescription>
        </Alert>
      )}

      {membersQuery.isSuccess &&
        (membersQuery.data ?? []).some((m) => m.status === 'ACTIVE') && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="link-platform-user-search">Rechercher un membre</Label>
              <Input
                id="link-platform-user-search"
                className="min-h-11"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Nom ou e-mail…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-platform-user-select">Membre Starium</Label>
              <Select
                value={selectedUserId || undefined}
                onValueChange={(value) => {
                  setSelectedUserId(value ?? '');
                  setPolicyError(null);
                }}
              >
                <SelectTrigger id="link-platform-user-select" className="min-h-11 w-full">
                  <SelectValue placeholder="Choisir un compte membre actif" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      Aucun membre ne correspond à la recherche.
                    </div>
                  ) : (
                    activeMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {memberDisplayLabel(member)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={!selectedUserId || linkMutation.isPending}
              onClick={() => {
                setSsoAcknowledged(false);
                setConfirmOpen(true);
              }}
            >
              <Link2 className="size-4" />
              Rattacher le compte
            </Button>
          </div>
        )}

      <StariumModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setSsoAcknowledged(false);
        }}
        title="Confirmer le rattachement SSO"
        description="Cette action crée une identité e-mail annuaire vérifiée sur le compte sélectionné."
        size="md"
        contentClassName="sm:max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={linkMutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={linkMutation.isPending || !selectedUserId || !ssoAcknowledged}
              onClick={() => linkMutation.mutate()}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Rattachement…
                </>
              ) : (
                'Confirmer le rattachement'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Impact connexion Microsoft</AlertTitle>
            <AlertDescription>
              L&apos;adresse{' '}
              <strong className="font-medium text-foreground">{directoryEmail}</strong> sera
              enregistrée comme identité annuaire vérifiée sur{' '}
              <strong className="font-medium text-foreground">
                {selectedMember ? memberDisplayLabel(selectedMember) : 'le compte sélectionné'}
              </strong>
              . Toute connexion SSO Microsoft avec cette adresse utilisera ce compte Starium.
            </AlertDescription>
          </Alert>

          <ul className="list-disc space-y-1 pl-5">
            <li>Aucune correspondance automatique par nom ou département.</li>
            <li>Opération réservée aux administrateurs client (MFA + connexion récente).</li>
          </ul>

          <div className="flex items-start gap-3 rounded-md border border-border/70 bg-background p-3">
            <Checkbox
              id="link-sso-ack"
              checked={ssoAcknowledged}
              onCheckedChange={setSsoAcknowledged}
              className="mt-0.5 size-5 min-h-5 min-w-5"
              aria-label="Confirmer l’impact SSO Microsoft"
            />
            <Label htmlFor="link-sso-ack" className="cursor-pointer text-sm font-normal leading-snug">
              Je confirme que le compte sélectionné est le bon et j&apos;accepte l&apos;impact sur
              la connexion Microsoft SSO.
            </Label>
          </div>
        </div>
      </StariumModal>
    </section>
  );
}
