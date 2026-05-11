'use client';

import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/data-table/data-table';
import { SearchIcon, XIcon } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformClientUsers } from '@/features/licenses-cockpit/api/licenses-cockpit';
import { usePlatformUsersQuery } from '../../../../features/admin-studio/hooks/use-platform-users-query';
import { useClientsQuery } from '../../../../features/admin-studio/hooks/use-clients-query';
import type {
  AdminPlatformUserLicense,
  AdminPlatformUserSummary,
} from '../../../../features/admin-studio/types/admin-studio.types';
import {
  LICENSE_MODE_BADGE_VARIANT,
  LICENSE_MODE_LABEL,
  LICENSE_TYPE_LABEL,
  LICENSE_TYPE_SHORT,
} from '../../../../features/admin-studio/lib/license-labels';
import { ManageUserClientsDialog } from '../../../../features/admin-studio/components/manage-user-clients-dialog';
import { ManageUserLicensesDialog } from '../../../../features/admin-studio/components/manage-user-licenses-dialog';
import { ChangeUserPasswordDialog } from '../../../../features/admin-studio/components/change-user-password-dialog';
import { ResetUserMfaDialog } from '../../../../features/admin-studio/components/reset-user-mfa-dialog';

type RoleFilter = 'ALL' | 'PLATFORM_ADMIN' | 'NON_PLATFORM_ADMIN';

const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  ALL: 'Tous les utilisateurs',
  PLATFORM_ADMIN: 'Admins plateforme',
  NON_PLATFORM_ADMIN: 'Utilisateurs (hors admins plateforme)',
};

type LicenseModeFilter =
  | 'ALL'
  | AdminPlatformUserLicense['licenseBillingMode']
  | 'NO_LICENSE';

const LICENSE_FILTER_LABEL: Record<LicenseModeFilter, string> = {
  ALL: 'Toutes les licences',
  CLIENT_BILLABLE: 'Facturable client',
  NON_BILLABLE: 'Non facturable',
  EXTERNAL_BILLABLE: 'Facturable externe',
  PLATFORM_INTERNAL: 'Support plateforme',
  EVALUATION: 'Évaluation',
  NO_LICENSE: 'Aucune licence',
};

function LicensesCell({
  row,
  fallbackLicenses,
  fallbackLoading,
}: {
  row: AdminPlatformUserSummary;
  fallbackLicenses: AdminPlatformUserLicense[] | undefined;
  fallbackLoading: boolean;
}) {
  const licenses = row.licenses ?? fallbackLicenses ?? [];
  if (licenses.length === 0) {
    if (fallbackLoading && !row.licenses) {
      return <span className="text-xs text-muted-foreground">…</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex max-w-[420px] flex-wrap gap-1">
      {licenses.map((l) => {
        const expired =
          l.licenseEndsAt && new Date(l.licenseEndsAt).getTime() < Date.now();
        const tooltip = [
          l.clientName,
          `${LICENSE_TYPE_LABEL[l.licenseType]} · ${LICENSE_MODE_LABEL[l.licenseBillingMode]}`,
          l.licenseEndsAt
            ? `Fin ${new Date(l.licenseEndsAt).toLocaleDateString('fr-FR')}`
            : null,
        ]
          .filter(Boolean)
          .join(' — ');
        return (
          <Badge
            key={l.clientId}
            variant={LICENSE_MODE_BADGE_VARIANT[l.licenseBillingMode]}
            title={tooltip}
            className={expired ? 'opacity-60 line-through' : undefined}
          >
            <span className="truncate font-medium">{l.clientName}</span>
            <span className="text-[0.65rem] opacity-80">
              · {LICENSE_TYPE_SHORT[l.licenseType]} ·{' '}
              {LICENSE_MODE_LABEL[l.licenseBillingMode]}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}


export default function AdminUsersPage() {
  const { data = [], isLoading, error, refetch } = usePlatformUsersQuery();
  const { data: clients = [] } = useClientsQuery();
  const authFetch = useAuthenticatedFetch();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [licenseFilter, setLicenseFilter] =
    useState<LicenseModeFilter>('ALL');

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [clients],
  );

  const isClientIdFilter =
    clientFilter !== 'ALL' && clientFilter !== 'NONE';

  // Stratégie : on s'appuie d'abord sur `clientIds` exposé par la liste
  // principale (backend récent), et on retombe sur l'endpoint plateforme
  // dédié si ce champ n'est pas présent (compat ancien API).
  const dataExposesClientIds = data.some((u) => Array.isArray(u.clientIds));
  const needsFallbackQuery = isClientIdFilter && !dataExposesClientIds;

  const clientMembersQ = useQuery({
    queryKey: ['admin-users-client-members', clientFilter],
    queryFn: () => getPlatformClientUsers(authFetch, clientFilter),
    enabled: needsFallbackQuery,
  });

  const fallbackMemberIds = useMemo(() => {
    if (!clientMembersQ.data) return null;
    return new Set(clientMembersQ.data.map((m) => m.id));
  }, [clientMembersQ.data]);

  // Fallback global pour la colonne "Licences" quand l'API ne renvoie pas
  // encore le champ `licenses[]` (backend pas rebuilt). On reconstruit la
  // map userId -> licenses[] via N requêtes parallèles cachées.
  const dataExposesLicenses = data.some((u) => Array.isArray(u.licenses));
  const needsLicensesFallback = data.length > 0 && !dataExposesLicenses;

  const clientLicenseQueries = useQueries({
    queries: needsLicensesFallback
      ? sortedClients.map((c) => ({
          queryKey: ['admin-users-client-members', c.id],
          queryFn: () => getPlatformClientUsers(authFetch, c.id),
          staleTime: 30_000,
        }))
      : [],
  });

  const fallbackLicensesByUser = useMemo(() => {
    if (!needsLicensesFallback) return new Map<string, AdminPlatformUserLicense[]>();
    const map = new Map<string, AdminPlatformUserLicense[]>();
    clientLicenseQueries.forEach((q, idx) => {
      const client = sortedClients[idx];
      if (!client || !q.data) return;
      for (const m of q.data) {
        const existing = map.get(m.id) ?? [];
        existing.push({
          clientId: client.id,
          clientName: client.name,
          clientSlug: client.slug,
          role: (m.role as 'CLIENT_ADMIN' | 'CLIENT_USER') ?? 'CLIENT_USER',
          licenseType:
            (m.licenseType as 'READ_ONLY' | 'READ_WRITE') ?? 'READ_ONLY',
          licenseBillingMode:
            (m.licenseBillingMode as AdminPlatformUserLicense['licenseBillingMode']) ??
            'NON_BILLABLE',
          licenseEndsAt: m.licenseEndsAt ?? null,
        });
        map.set(m.id, existing);
      }
    });
    for (const [, arr] of map) {
      arr.sort((a, b) => a.clientName.localeCompare(b.clientName, 'fr'));
    }
    return map;
  }, [clientLicenseQueries, needsLicensesFallback, sortedClients]);

  const fallbackLicensesLoading =
    needsLicensesFallback && clientLicenseQueries.some((q) => q.isLoading);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((u) => {
      if (roleFilter === 'PLATFORM_ADMIN' && u.platformRole !== 'PLATFORM_ADMIN') {
        return false;
      }
      if (
        roleFilter === 'NON_PLATFORM_ADMIN' &&
        u.platformRole === 'PLATFORM_ADMIN'
      ) {
        return false;
      }
      if (clientFilter === 'NONE') {
        if (Array.isArray(u.clientIds) && u.clientIds.length > 0) return false;
        if (!Array.isArray(u.clientIds)) return false; // info absente → on cache
      } else if (isClientIdFilter) {
        if (Array.isArray(u.clientIds)) {
          if (!u.clientIds.includes(clientFilter)) return false;
        } else if (fallbackMemberIds) {
          if (!fallbackMemberIds.has(u.id)) return false;
        } else {
          return false; // attend la query de fallback
        }
      }
      const effectiveLicenses =
        u.licenses ?? fallbackLicensesByUser.get(u.id) ?? [];
      if (licenseFilter === 'NO_LICENSE') {
        if (effectiveLicenses.length > 0) return false;
        if (fallbackLicensesLoading && !u.licenses) return false;
      } else if (licenseFilter !== 'ALL') {
        const matches = effectiveLicenses.some(
          (l) => l.licenseBillingMode === licenseFilter,
        );
        if (!matches) return false;
      }
      if (!q) return true;
      const haystack = [
        u.email,
        u.firstName ?? '',
        u.lastName ?? '',
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    data,
    search,
    roleFilter,
    clientFilter,
    licenseFilter,
    isClientIdFilter,
    fallbackMemberIds,
    fallbackLicensesByUser,
    fallbackLicensesLoading,
  ]);

  const columns: DataTableColumn<AdminPlatformUserSummary>[] = useMemo(
    () => [
      { key: 'email', header: 'Email' },
      {
        key: 'firstName',
        header: 'Prénom',
        cell: (row) => row.firstName ?? '—',
      },
      {
        key: 'lastName',
        header: 'Nom',
        cell: (row) => row.lastName ?? '—',
      },
      {
        key: 'licenses',
        header: 'Licences',
        cell: (row) => (
          <LicensesCell
            row={row}
            fallbackLicenses={fallbackLicensesByUser.get(row.id)}
            fallbackLoading={fallbackLicensesLoading}
          />
        ),
      },
      {
        key: 'createdAt',
        header: 'Créé le',
        cell: (row) => new Date(row.createdAt).toLocaleDateString('fr-FR'),
        className: 'text-muted-foreground',
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            {row.platformRole !== 'PLATFORM_ADMIN' && (
              <>
                <ManageUserClientsDialog user={row} />
                <ManageUserLicensesDialog user={row} />
                <ResetUserMfaDialog user={row} />
              </>
            )}
            <ChangeUserPasswordDialog user={row} />
          </div>
        ),
        className: 'text-right',
      },
    ],
    [fallbackLicensesByUser, fallbackLicensesLoading],
  );

  const hasFilters =
    search.trim().length > 0 ||
    roleFilter !== 'ALL' ||
    clientFilter !== 'ALL' ||
    licenseFilter !== 'ALL';

  const clientFilterLabel =
    clientFilter === 'ALL'
      ? 'Tous les clients'
      : clientFilter === 'NONE'
        ? 'Sans client rattaché'
        : (sortedClients.find((c) => c.id === clientFilter)?.name ?? 'Client');

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs globaux"
        description="Liste des utilisateurs globaux de la plateforme."
      />
      <TableToolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email, prénom, nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
              aria-label="Rechercher un utilisateur"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          >
            <SelectTrigger size="sm" className="h-8 w-[260px] text-xs">
              <SelectValue>{ROLE_FILTER_LABEL[roleFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_FILTER_LABEL) as RoleFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {ROLE_FILTER_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={clientFilter}
            onValueChange={(v) => setClientFilter(v ?? 'ALL')}
          >
            <SelectTrigger size="sm" className="h-8 w-[240px] text-xs">
              <SelectValue>{clientFilterLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les clients</SelectItem>
              <SelectItem value="NONE">Sans client rattaché</SelectItem>
              {sortedClients.length > 0 && <SelectSeparator />}
              {sortedClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={licenseFilter}
            onValueChange={(v) => setLicenseFilter(v as LicenseModeFilter)}
          >
            <SelectTrigger size="sm" className="h-8 w-[200px] text-xs">
              <SelectValue>{LICENSE_FILTER_LABEL[licenseFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{LICENSE_FILTER_LABEL.ALL}</SelectItem>
              <SelectItem value="NO_LICENSE">
                {LICENSE_FILTER_LABEL.NO_LICENSE}
              </SelectItem>
              <SelectSeparator />
              {(
                [
                  'CLIENT_BILLABLE',
                  'NON_BILLABLE',
                  'EXTERNAL_BILLABLE',
                  'PLATFORM_INTERNAL',
                  'EVALUATION',
                ] as LicenseModeFilter[]
              ).map((m) => (
                <SelectItem key={m} value={m}>
                  {LICENSE_FILTER_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setSearch('');
                setRoleFilter('ALL');
                setClientFilter('ALL');
                setLicenseFilter('ALL');
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {needsFallbackQuery && clientMembersQ.isLoading
            ? 'Chargement des membres du client…'
            : fallbackLicensesLoading
              ? `${filtered.length} / ${data.length} utilisateur${data.length > 1 ? 's' : ''} · chargement licences…`
              : `${filtered.length} / ${data.length} utilisateur${data.length > 1 ? 's' : ''}`}
        </p>
      </TableToolbar>
      <Card>
        <CardContent className="pt-4">
          <DataTable<AdminPlatformUserSummary>
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            error={error ?? null}
            getRowId={(row) => row.id}
            emptyTitle={
              hasFilters ? 'Aucun résultat' : 'Aucun utilisateur'
            }
            emptyDescription={
              hasFilters
                ? 'Aucun utilisateur ne correspond aux filtres en cours.'
                : 'Aucun utilisateur global pour le moment.'
            }
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
