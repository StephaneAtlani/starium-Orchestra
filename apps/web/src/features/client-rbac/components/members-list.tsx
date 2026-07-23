'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Link2,
  Network,
  Pencil,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClientMembers } from '../hooks/use-client-members';
import { UserRolesDialog } from './user-roles-dialog';
import { AddMemberDialog } from './add-member-dialog';
import { EditMemberDialog } from './edit-member-dialog';
import { MembersSyncDialog } from './members-sync-dialog';
import { MemberAvatar } from './member-avatar';
import type { ClientMember } from '../api/user-roles';

const CLIENT_ROLE_LABEL: Record<string, string> = {
  CLIENT_ADMIN: 'Administrateur client',
  CLIENT_USER: 'Utilisateur client',
};

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE: { label: 'Actif', badgeClass: 'starium-ds-badge--success' },
  SUSPENDED: { label: 'Suspendu', badgeClass: 'starium-ds-badge--danger' },
  INVITED: { label: 'Invité', badgeClass: 'starium-ds-badge--info' },
};

function memberDisplayName(member: ClientMember): string {
  return [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || '—';
}

function DirectorySourceBadge({
  synced,
  locked,
}: {
  synced?: boolean;
  locked?: boolean;
}) {
  if (!synced) return null;
  return (
    <span
      className={cn(
        'starium-ds-badge',
        locked ? 'starium-ds-badge--warn' : 'starium-ds-badge--info',
      )}
      title={
        locked
          ? 'Synchronisé ADDS — champs identité verrouillés'
          : 'Synchronisé depuis l’annuaire (ADDS)'
      }
    >
      {locked ? 'ADDS verrouillé' : 'ADDS'}
    </span>
  );
}

function linkedTooltipText(
  linked: NonNullable<ClientMember['linkedDirectoryCollaborator']>,
): string {
  const mail = linked.email?.trim() || linked.username?.trim() || null;
  const meta = [linked.jobTitle?.trim(), linked.department?.trim()]
    .filter(Boolean)
    .join(' · ');
  return ['Fiche ADDS rattachée', linked.displayName, mail, meta]
    .filter(Boolean)
    .join('\n');
}

function LinkedDirectoryBadge({
  linked,
}: {
  linked: NonNullable<ClientMember['linkedDirectoryCollaborator']>;
}) {
  const mail = linked.email?.trim() || linked.username?.trim() || null;
  const meta = [linked.jobTitle?.trim(), linked.department?.trim()]
    .filter(Boolean)
    .join(' · ');
  const nativeTitle = linkedTooltipText(linked);

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <span
            tabIndex={0}
            className="starium-ds-badge starium-ds-badge--success inline-flex min-h-9 cursor-help items-center gap-1 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={nativeTitle}
            aria-label={`Compte lié à ${linked.displayName}${mail ? ` (${mail})` : ''}`}
          >
            <Link2 className="size-3.5 shrink-0" aria-hidden />
            Lié
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="z-[400] max-w-[min(18rem,calc(100vw-2rem))] flex-col items-start gap-1 px-3 py-2.5 text-left"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
            Fiche ADDS rattachée
          </p>
          <p className="font-medium">{linked.displayName}</p>
          {mail ? <p className="opacity-90">{mail}</p> : null}
          {meta ? <p className="opacity-80">{meta}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DirectoryCell({ member }: { member: ClientMember }) {
  const linked = member.linkedDirectoryCollaborator ?? null;
  const synced = Boolean(member.isDirectorySynced) || Boolean(linked);
  if (!synced && !linked) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DirectorySourceBadge
        synced={synced}
        locked={member.isDirectoryLocked}
      />
      {linked ? <LinkedDirectoryBadge linked={linked} /> : null}
    </div>
  );
}

export function MembersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get('edit');

  const { data: members = [], isLoading, error, refetch } = useClientMembers();
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<ClientMember | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!editFromUrl || isLoading) return;
    const found = members.find((m) => m.id === editFromUrl);
    if (found) {
      setEditMember(found);
      router.replace('/client/members', { scroll: false });
    } else if (members.length > 0) {
      router.replace('/client/members', { scroll: false });
    }
  }, [editFromUrl, members, isLoading, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = memberDisplayName(m).toLowerCase();
      const email = m.email.toLowerCase();
      const job = (m.jobTitle ?? '').toLowerCase();
      const dept = (m.department ?? '').toLowerCase();
      const hr = (m.humanResourceSummary?.displayName ?? '').toLowerCase();
      const adds = (
        m.linkedDirectoryCollaborator?.displayName ??
        m.linkedDirectoryCollaborator?.email ??
        ''
      ).toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        job.includes(q) ||
        dept.includes(q) ||
        hr.includes(q) ||
        adds.includes(q)
      );
    });
  }, [members, search]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === 'ACTIVE').length;
    const adds = members.filter((m) => m.isDirectorySynced).length;
    const admins = members.filter((m) => m.role === 'CLIENT_ADMIN').length;
    return { total, active, adds, admins };
  }, [members]);

  const columns = useMemo<DataTableColumn<ClientMember>[]>(
    () => [
      {
        key: 'member',
        header: 'Membre',
        mobilePriority: 'primary',
        cell: (member) => {
          const name = memberDisplayName(member);
          const subtitle =
            [member.jobTitle?.trim(), member.department?.trim()]
              .filter(Boolean)
              .join(' · ') || null;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <MemberAvatar
                userId={member.id}
                displayName={name === '—' ? member.email : name}
                hasAvatar={member.hasAvatar}
                size="md"
              />
              <div className="min-w-0 space-y-0.5">
                <div className="truncate font-medium text-foreground">{name}</div>
                {subtitle ? (
                  <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                ) : null}
                <div className="truncate text-xs text-muted-foreground">{member.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'directory',
        header: 'Annuaire',
        mobilePriority: 'secondary',
        cell: (member) => <DirectoryCell member={member} />,
      },
      {
        key: 'humanResource',
        header: 'Fiche Humaine',
        mobilePriority: 'secondary',
        cell: (member) => (
          <span className="text-sm text-muted-foreground">
            {member.humanResourceSummary?.displayName ?? '—'}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Rôle',
        mobilePriority: 'secondary',
        cell: (member) => (
          <span className="text-sm">
            {member.role ? (CLIENT_ROLE_LABEL[member.role] ?? member.role) : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (member) => {
          const meta = STATUS_META[member.status] ?? {
            label: member.status,
            badgeClass: 'starium-ds-badge--neutral',
          };
          return (
            <span className={cn('starium-ds-badge', meta.badgeClass)}>{meta.label}</span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (member) => (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 gap-1.5"
              onClick={() => setEditMember(member)}
            >
              <Pencil className="size-4 shrink-0" aria-hidden />
              Modifier
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 gap-1.5"
              onClick={() => setRolesUserId(member.id)}
            >
              <Shield className="size-4 shrink-0" aria-hidden />
              Rôles
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Membres"
        description="Comptes du client, rôles métier et rattachement ADDS / compte (SSO)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MembersSyncDialog />
            <AddMemberDialog />
          </div>
        }
      />

      <div className="starium-module mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            variant="dense"
            iconShape="circle"
            title="Membres"
            value={isLoading ? '—' : String(stats.total)}
            footer="Tous statuts"
            footerTone="muted"
            icon={<Users className="size-4" aria-hidden />}
            iconWrapperClassName="bg-[color:var(--state-info)]/12 text-[color:var(--state-info)]"
          />
          <KpiCard
            variant="dense"
            iconShape="circle"
            title="Actifs"
            value={isLoading ? '—' : String(stats.active)}
            footer={
              stats.total
                ? `${Math.round((stats.active / stats.total) * 100)} % du total`
                : '—'
            }
            footerTone="success"
            icon={<UserCheck className="size-4" aria-hidden />}
            iconWrapperClassName="bg-[color:var(--state-success)]/12 text-[color:var(--state-success)]"
          />
          <KpiCard
            variant="dense"
            iconShape="circle"
            title="ADDS"
            value={isLoading ? '—' : String(stats.adds)}
            footer="Synchronisés annuaire"
            footerTone="info"
            icon={<Network className="size-4" aria-hidden />}
            iconWrapperClassName="bg-[color:var(--state-info)]/12 text-[color:var(--state-info)]"
          />
          <KpiCard
            variant="dense"
            iconShape="circle"
            title="Admins"
            value={isLoading ? '—' : String(stats.admins)}
            footer="Rôle administrateur"
            footerTone="brand"
            icon={<Shield className="size-4" aria-hidden />}
            iconWrapperClassName="bg-[color:var(--starium-primary)]/12 text-[color:var(--starium-primary)]"
          />
        </div>
      </div>

      <Card
        size="sm"
        className="starium-panel overflow-hidden max-md:border-0 max-md:bg-transparent max-md:shadow-none"
      >
        <div className="border-b border-border/60 px-3 py-3 sm:px-4">
          <FilterBar aria-label="Recherche membres" asSearch desktopColumns="auto">
            <FilterBarField id="members-search" label="Rechercher">
              {({ controlId }) => (
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id={controlId}
                    className="min-h-11 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, email, poste, département…"
                  />
                </div>
              )}
            </FilterBarField>
          </FilterBar>
        </div>
        <CardContent className="p-0 group-data-[size=sm]/card:px-0 group-data-[size=sm]/card:pt-0 group-data-[size=sm]/card:pb-0">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            error={error ?? null}
            onRetry={() => void refetch()}
            getRowId={(member) => member.id}
            mobileCardsAriaLabel="Liste des membres client"
            emptyTitle={search.trim() ? 'Aucun résultat' : 'Aucun membre'}
            emptyDescription={
              search.trim()
                ? 'Aucun membre ne correspond à la recherche.'
                : 'Utilisez « Ajouter un membre » ci-dessus.'
            }
          />
        </CardContent>
      </Card>

      <EditMemberDialog
        member={editMember}
        open={editMember !== null}
        onOpenChange={(open) => {
          if (!open) setEditMember(null);
        }}
      />
      {rolesUserId ? (
        <UserRolesDialog
          userId={rolesUserId}
          open={!!rolesUserId}
          onOpenChange={(open) => {
            if (!open) setRolesUserId(null);
          }}
        />
      ) : null}
    </PageContainer>
  );
}
