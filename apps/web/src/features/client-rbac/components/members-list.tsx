'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { useClientMembers } from '../hooks/use-client-members';
import { UserRolesDialog } from './user-roles-dialog';
import { AddMemberDialog } from './add-member-dialog';
import { EditMemberDialog } from './edit-member-dialog';
import { MembersSyncDialog } from './members-sync-dialog';
import type { ClientMember } from '../api/user-roles';

const CLIENT_ROLE_LABEL: Record<string, string> = {
  CLIENT_ADMIN: 'Administrateur client',
  CLIENT_USER: 'Utilisateur client',
};

export function MembersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get('edit');

  const { data: members = [], isLoading, error, refetch } = useClientMembers();
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<ClientMember | null>(null);

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

  const columns = useMemo<DataTableColumn<ClientMember>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (member) => (
          <>
            {[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}
            {member.isDirectorySynced ? (
              <RegistryBadge className="ml-2 bg-secondary text-secondary-foreground">
                ADDS
              </RegistryBadge>
            ) : null}
          </>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        mobilePriority: 'secondary',
        cell: (member) => member.email,
      },
      {
        key: 'humanResource',
        header: 'Fiche Humaine',
        mobilePriority: 'secondary',
        cell: (member) => member.humanResourceSummary?.displayName ?? '—',
      },
      {
        key: 'role',
        header: 'Rôle',
        mobilePriority: 'secondary',
        cell: (member) =>
          member.role ? (CLIENT_ROLE_LABEL[member.role] ?? member.role) : '—',
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (member) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setEditMember(member)}
              disabled={Boolean(member.isDirectoryLocked)}
            >
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setRolesUserId(member.id)}
            >
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
        description="Utilisateurs du client et assignation des rôles. Les administrateurs client peuvent ajouter des membres (compte existant ou nouveau)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MembersSyncDialog />
            <AddMemberDialog />
          </div>
        }
      />
      <Card>
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={members}
            isLoading={isLoading}
            error={error ?? null}
            onRetry={() => void refetch()}
            getRowId={(member) => member.id}
            mobileCardsAriaLabel="Liste des membres client"
            emptyTitle="Aucun membre"
            emptyDescription="Utilisez « Ajouter un membre » ci-dessus."
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
