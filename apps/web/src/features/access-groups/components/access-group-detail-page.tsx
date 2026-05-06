'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAccessGroup } from '../hooks/use-access-group';
import { useGroupMembers } from '../hooks/use-group-members';
import { useUpdateAccessGroup } from '../hooks/use-update-access-group';
import { useDeleteAccessGroup } from '../hooks/use-delete-access-group';
import { useRemoveGroupMember } from '../hooks/use-remove-group-member';
import { AddGroupMemberDialog } from './add-group-member-dialog';
import type { AccessGroupMemberRow } from '../api/access-groups';
import { Pencil, Trash2, UserPlus } from 'lucide-react';

function displayName(m: AccessGroupMemberRow): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

export function AccessGroupDetailPage() {
  const p = useParams();
  const groupId = typeof p?.id === 'string' ? p.id : '';
  const formId = useId();

  const { data: group, isLoading, error } = useAccessGroup(groupId);
  const { data: members = [], isLoading: loadingMembers } =
    useGroupMembers(groupId);

  const updateGroup = useUpdateAccessGroup();
  const deleteGroup = useDeleteAccessGroup(groupId);
  const removeMember = useRemoveGroupMember(groupId);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  function openEdit() {
    if (group) setEditName(group.name);
    setEditOpen(true);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed || !groupId) return;
    updateGroup.mutate(
      { groupId, dto: { name: trimmed } },
      { onSuccess: () => setEditOpen(false) },
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground py-8 text-center">
          Chargement…
        </p>
      </PageContainer>
    );
  }

  if (error || !group) {
    return (
      <PageContainer>
        <div className="py-8 text-center space-y-2">
          <p className="text-sm text-destructive">Groupe introuvable.</p>
          <Link
            href="/client/access-groups"
            className={buttonVariants({ variant: 'outline' })}
          >
            Retour à la liste
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={group.name}
        description="Membres du groupe pour ce client. Les libellés affichés proviennent du profil utilisateur."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/client/access-groups"
              className={buttonVariants({ variant: 'outline' })}
            >
              Retour à la liste
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="size-4" />
              Renommer
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-block" />}>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (
                        typeof window !== 'undefined' &&
                        window.confirm(
                          `Supprimer le groupe « ${group.name} » ?`,
                        )
                      ) {
                        deleteGroup.mutate(undefined);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Supprimer ce groupe</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer le groupe</DialogTitle>
            <DialogDescription>
              Le nom doit rester unique dans ce client.
            </DialogDescription>
          </DialogHeader>
          <form id={`${formId}-edit`} onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-name`}>Nom</Label>
              <Input
                id={`${formId}-name`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={updateGroup.isPending}
              />
            </div>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updateGroup.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form={`${formId}-edit`}
              disabled={updateGroup.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Membres</CardTitle>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            <AddGroupMemberDialog
              groupId={groupId}
              open={addOpen}
              onOpenChange={setAddOpen}
            />
            {loadingMembers && (
              <p className="text-sm text-muted-foreground py-4">Chargement…</p>
            )}
            {!loadingMembers && members.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Aucun membre. Ajoutez des utilisateurs du client.
              </p>
            )}
            {!loadingMembers && members.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom affiché</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.membershipId}>
                      <TableCell className="font-medium">
                        {displayName(m)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeMember.mutate(m.userId)}
                          disabled={removeMember.isPending}
                        >
                          Retirer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
