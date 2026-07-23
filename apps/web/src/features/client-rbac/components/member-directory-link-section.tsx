'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Link2,
  Link2Off,
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
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  linkCollaboratorPlatformUser,
  listCollaborators,
  unlinkCollaboratorPlatformUser,
} from '@/features/teams/collaborators/api/collaborators.api';
import { collaboratorQueryKeys } from '@/features/teams/collaborators/lib/collaborator-query-keys';
import {
  linkPlatformUserErrorGuidance,
  linkPlatformUserErrorTitle,
  parseLinkPlatformUserError,
  type LinkPlatformUserErrorCode,
} from '@/features/teams/collaborators/lib/link-platform-user-errors';
import type { CollaboratorListItem } from '@/features/teams/collaborators/types/collaborator.types';
import type { ClientMember } from '../api/user-roles';

function collaboratorDirectoryLabel(item: CollaboratorListItem): string {
  const email = item.email?.trim() || item.username?.trim();
  if (email) return `${item.displayName} — ${email}`;
  return item.displayName;
}

function DirectoryFicheCard({
  item,
}: {
  item: Pick<
    CollaboratorListItem,
    'displayName' | 'email' | 'username' | 'jobTitle' | 'department'
  >;
}) {
  const mail = item.email?.trim() || item.username?.trim() || '—';
  const meta = [item.jobTitle?.trim(), item.department?.trim()].filter(Boolean).join(' · ');
  return (
    <div className="space-y-1 rounded-md border border-border/80 bg-card px-3 py-2 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Fiche ADDS (annuaire)
      </p>
      <p className="font-medium text-foreground">{item.displayName}</p>
      <p className="text-muted-foreground">{mail}</p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

function MemberAccountCard({
  member,
  isAddsIdentity,
}: {
  member: ClientMember;
  isAddsIdentity?: boolean;
}) {
  const name =
    [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.email;
  const meta = [member.jobTitle?.trim(), member.department?.trim()].filter(Boolean).join(' · ');
  return (
    <div className="space-y-1 rounded-md border border-border/80 bg-card px-3 py-2 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {isAddsIdentity ? 'Compte ADDS (identité annuaire)' : 'Compte membre Starium'}
      </p>
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{member.email}</p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

/** Combobox unique : recherche + liste des fiches ADDS à rattacher. */
function AddsFicheCombobox({
  memberId,
  value,
  onChange,
  options,
  isLoading,
  search,
  onSearchChange,
  disabled,
}: {
  memberId: string;
  value: string;
  onChange: (collaboratorId: string, item: CollaboratorListItem | null) => void;
  options: CollaboratorListItem[];
  isLoading: boolean;
  search: string;
  onSearchChange: (q: string) => void;
  disabled?: boolean;
}) {
  const reactId = useId();
  const inputId = `adds-combo-${memberId}-${reactId}`;
  const listId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (!listOpen) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setListOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listOpen]);

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <Label htmlFor={inputId}>Fiche ADDS</Label>
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={listOpen ? search : selected ? collaboratorDirectoryLabel(selected) : search}
          placeholder="Rechercher une fiche ADDS…"
          className="min-h-11 pr-10"
          onFocus={() => setListOpen(true)}
          onChange={(e) => {
            setListOpen(true);
            onSearchChange(e.target.value);
            if (value) onChange('', null);
          }}
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
      {listOpen ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {isLoading ? (
            <li className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Chargement…
            </li>
          ) : options.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted-foreground">Aucune fiche ADDS trouvée</li>
          ) : (
            options.map((item) => (
              <li key={item.id} role="option" aria-selected={item.id === value}>
                <button
                  type="button"
                  className={cn(
                    'flex min-h-11 w-full flex-col items-start rounded-sm px-2 py-2 text-left text-sm hover:bg-accent',
                    item.id === value && 'bg-accent',
                  )}
                  onClick={() => {
                    onChange(item.id, item);
                    onSearchChange('');
                    setListOpen(false);
                  }}
                >
                  <span className="font-medium text-foreground">{item.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.email?.trim() || item.username?.trim() || '—'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

type Props = {
  member: ClientMember;
  enabled: boolean;
};

/**
 * Rattachement : fiche ADDS → compte membre Starium uniquement.
 * Jamais ADDS → compte ADDS.
 */
export function MemberDirectoryLinkSection({ member, enabled }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const { has } = usePermissions();
  const canLink =
    enabled &&
    activeClient?.role === 'CLIENT_ADMIN' &&
    has('collaborators.link_platform_user');

  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
  const [selectedPreview, setSelectedPreview] = useState<CollaboratorListItem | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [ssoAcknowledged, setSsoAcknowledged] = useState(false);
  const [policyError, setPolicyError] = useState<{
    code: LinkPlatformUserErrorCode;
    message: string;
  } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const linkedQuery = useQuery({
    queryKey: ['member-directory-link', 'linked', member.id],
    queryFn: () =>
      listCollaborators(authFetch, {
        source: ['DIRECTORY_SYNC'],
        linkedUserId: member.id,
        limit: 10,
        offset: 0,
      }),
    enabled,
  });

  const linked = linkedQuery.data?.items[0] ?? null;
  const alreadyLinked = Boolean(linked);

  /**
   * Compte dont l’e-mail est une identité ADDS (sync) sans lien officiel vers une autre fiche.
   * On ne rattache jamais une fiche ADDS sur ce type de compte (ADDS ↔ ADDS interdit).
   */
  const isAddsIdentityAccount = Boolean(member.isDirectorySynced) && !alreadyLinked;

  const candidatesQuery = useQuery({
    queryKey: ['member-directory-link', 'candidates', debouncedSearch],
    queryFn: () =>
      listCollaborators(authFetch, {
        source: ['DIRECTORY_SYNC'],
        platformUserLinkStatus: 'LINK_REQUIRED',
        search: debouncedSearch.trim() || undefined,
        limit: 50,
        offset: 0,
      }),
    enabled:
      canLink && !alreadyLinked && !isAddsIdentityAccount && !linkedQuery.isLoading && enabled,
  });

  const candidates = useMemo(
    () => (candidatesQuery.data?.items ?? []).filter((c) => c.source === 'DIRECTORY_SYNC'),
    [candidatesQuery.data?.items],
  );

  async function invalidateLinkQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member-directory-link'] }),
      queryClient.invalidateQueries({ queryKey: collaboratorQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['client-members'] }),
    ]);
  }

  const linkMutation = useMutation({
    mutationFn: () =>
      linkCollaboratorPlatformUser(authFetch, selectedCollaboratorId, member.id),
    onSuccess: async () => {
      toast.success('Fiche ADDS rattachée à ce compte membre.');
      setConfirmOpen(false);
      setSelectedCollaboratorId('');
      setSelectedPreview(null);
      setSsoAcknowledged(false);
      setPolicyError(null);
      await invalidateLinkQueries();
    },
    onError: (error: unknown) => {
      const parsed = parseLinkPlatformUserError(error);
      setPolicyError({ code: parsed.code, message: parsed.message });
      toast.error(linkPlatformUserErrorTitle(parsed.code), {
        description: parsed.message,
        duration: 8000,
      });
      if (parsed.code === 'MFA_REQUIRED' || parsed.code === 'REAUTH_REQUIRED') {
        setConfirmOpen(false);
      }
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => {
      if (!linked) throw new Error('Aucune fiche à détacher');
      return unlinkCollaboratorPlatformUser(authFetch, linked.id);
    },
    onSuccess: async () => {
      toast.success('Fiche ADDS détachée de ce compte membre.');
      setUnlinkConfirmOpen(false);
      setPolicyError(null);
      await invalidateLinkQueries();
    },
    onError: (error: unknown) => {
      const parsed = parseLinkPlatformUserError(error);
      setPolicyError({ code: parsed.code, message: parsed.message });
      toast.error(linkPlatformUserErrorTitle(parsed.code), {
        description: parsed.message,
        duration: 8000,
      });
      if (parsed.code === 'MFA_REQUIRED' || parsed.code === 'REAUTH_REQUIRED') {
        setUnlinkConfirmOpen(false);
      }
    },
  });

  if (!enabled) return null;

  const showAttachForm = canLink && !alreadyLinked && !isAddsIdentityAccount;

  return (
    <section
      className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3"
      aria-labelledby={`member-adds-link-${member.id}`}
    >
      <div className="space-y-1">
        <h3
          id={`member-adds-link-${member.id}`}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Link2 className="size-4 shrink-0" aria-hidden />
          Rattachement ADDS ↔ compte membre
        </h3>
        <p className="text-xs text-muted-foreground">
          Une fiche ADDS se rattache uniquement à un <strong className="font-medium text-foreground">compte membre Starium</strong>
          , jamais à un autre compte ADDS.
        </p>
      </div>

      <MemberAccountCard member={member} isAddsIdentity={isAddsIdentityAccount} />

      {linkedQuery.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Chargement…
        </p>
      ) : null}

      {isAddsIdentityAccount ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle className="text-sm">Compte ADDS — rattachement interdit ici</AlertTitle>
          <AlertDescription className="text-xs">
            Ce compte est une identité annuaire ({member.email}). Ouvrez le{' '}
            <strong className="font-medium">compte membre Starium</strong> cible (ex. e-mail
            .demo) et rattachez-y la fiche ADDS depuis cette fiche membre.
          </AlertDescription>
        </Alert>
      ) : null}

      {linked ? (
        <div className="space-y-3">
          <Alert>
            <Link2 className="size-4" />
            <AlertTitle className="text-sm">Fiche ADDS rattachée</AlertTitle>
            <AlertDescription className="text-xs">
              Détachez pour rattacher cette fiche à un autre membre.
            </AlertDescription>
          </Alert>
          <DirectoryFicheCard item={linked} />
          {canLink ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              disabled={unlinkMutation.isPending}
              onClick={() => {
                setPolicyError(null);
                setUnlinkConfirmOpen(true);
              }}
            >
              {unlinkMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Détachement…
                </>
              ) : (
                <>
                  <Link2Off className="size-4" aria-hidden />
                  Détacher la fiche ADDS
                </>
              )}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!alreadyLinked && !isAddsIdentityAccount && !canLink ? (
        <Alert>
          <Lock className="size-4" />
          <AlertTitle className="text-sm">Permission requise</AlertTitle>
          <AlertDescription className="text-xs">
            Permission de rattachement + rôle administrateur client requis.
          </AlertDescription>
        </Alert>
      ) : null}

      {showAttachForm ? (
        <div className="space-y-3">
          <AddsFicheCombobox
            memberId={member.id}
            value={selectedCollaboratorId}
            search={search}
            onSearchChange={setSearch}
            options={candidates}
            isLoading={candidatesQuery.isLoading || candidatesQuery.isFetching}
            onChange={(id, item) => {
              setSelectedCollaboratorId(id);
              setSelectedPreview(item);
              setPolicyError(null);
            }}
          />

          {selectedPreview ? <DirectoryFicheCard item={selectedPreview} /> : null}

          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={!selectedCollaboratorId || linkMutation.isPending}
            onClick={() => {
              setSsoAcknowledged(false);
              setConfirmOpen(true);
            }}
          >
            {linkMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Rattachement…
              </>
            ) : (
              'Rattacher au compte membre'
            )}
          </Button>
        </div>
      ) : null}

      {policyError ? (
        <Alert
          variant={
            policyError.code === 'MFA_REQUIRED' || policyError.code === 'REAUTH_REQUIRED'
              ? 'default'
              : 'destructive'
          }
        >
          <ShieldAlert className="size-4" />
          <AlertTitle>{linkPlatformUserErrorTitle(policyError.code)}</AlertTitle>
          <AlertDescription className="space-y-2 text-xs">
            <p>{policyError.message}</p>
            {linkPlatformUserErrorGuidance(policyError.code) ? (
              <p className="text-muted-foreground">
                {linkPlatformUserErrorGuidance(policyError.code)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {policyError.code === 'MFA_REQUIRED' ? (
                <Link
                  href="/account"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
                >
                  <Lock className="size-4" />
                  Mon compte → Sécurité
                </Link>
              ) : null}
              {policyError.code === 'REAUTH_REQUIRED' ? (
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
                >
                  <LogIn className="size-4" />
                  Se reconnecter
                </Link>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <StariumModal
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) setSsoAcknowledged(false);
        }}
        title="Confirmer le rattachement"
        description="Le SSO Microsoft sur l’adresse ADDS utilisera ce compte membre Starium."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={!ssoAcknowledged || linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <MemberAccountCard member={member} />
          {selectedPreview ? <DirectoryFicheCard item={selectedPreview} /> : null}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 p-3">
            <Checkbox
              checked={ssoAcknowledged}
              onCheckedChange={(v) => setSsoAcknowledged(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs leading-snug">
              Je confirme le rattachement (impact SSO).
            </span>
          </label>
        </div>
      </StariumModal>

      <StariumModal
        open={unlinkConfirmOpen}
        onOpenChange={setUnlinkConfirmOpen}
        title="Détacher la fiche ADDS"
        description="La fiche redevient disponible pour un autre compte membre."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setUnlinkConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={unlinkMutation.isPending}
              onClick={() => unlinkMutation.mutate()}
            >
              Détacher
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <MemberAccountCard member={member} />
          {linked ? <DirectoryFicheCard item={linked} /> : null}
        </div>
      </StariumModal>
    </section>
  );
}
