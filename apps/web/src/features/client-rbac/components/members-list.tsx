'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientMembers } from '../hooks/use-client-members';
import { UserRolesDialog } from './user-roles-dialog';
import type { ClientMember } from '../api/user-roles';

export function MembersList() {
  const { data: members = [], isLoading, error, refetch } = useClientMembers();
  const [dialogUserId, setDialogUserId] = useState<string | null>(null);

  return (
    <PageContainer>
      <PageHeader
        title="Membres"
        description="Utilisateurs du client et assignation des rôles."
      />
      <Card>
        <CardContent className="pt-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Chargement…
            </p>
          )}
          {error && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive mb-2">
                Erreur lors du chargement des membres.
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {!isLoading && !error && members.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun membre.
            </p>
          )}
          {!isLoading && !error && members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: ClientMember) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {[member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogUserId(member.id)}
                      >
                        Rôles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {dialogUserId && (
        <UserRolesDialog
          userId={dialogUserId}
          open={!!dialogUserId}
          onOpenChange={(open) => {
            if (!open) setDialogUserId(null);
          }}
        />
      )}
    </PageContainer>
  );
}
