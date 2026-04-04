'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { AlertCircle, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRemoveWorkTeamMember, useUpdateWorkTeamMember } from '../hooks/use-work-team-mutations';
import { useWorkTeamMembers } from '../hooks/use-work-team-members';
import { workTeamMemberRoleLabel } from '../lib/work-team-label-mappers';
import { WorkTeamAddMemberDialog } from './work-team-add-member-dialog';
import type { WorkTeamMemberRole } from '../types/work-team.types';

export function WorkTeamMembersCard({
  teamId,
  canUpdate,
}: {
  teamId: string;
  canUpdate: boolean;
}) {
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const limit = 20;
  const membersQuery = useWorkTeamMembers(teamId, { limit, offset, q: q.trim() || undefined });
  const removeMutation = useRemoveWorkTeamMember(teamId);
  const updateRoleMutation = useUpdateWorkTeamMember(teamId);

  const data = membersQuery.data;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function onRoleChange(membershipId: string, role: WorkTeamMemberRole) {
    try {
      await updateRoleMutation.mutateAsync({ membershipId, role });
      toast.success('Rôle mis à jour');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onRemove(membershipId: string) {
    if (!globalThis.confirm('Retirer ce membre de l’équipe ?')) return;
    try {
      await removeMutation.mutateAsync(membershipId);
      toast.success('Membre retiré');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <>
      <Card size="sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Membres</CardTitle>
          {canUpdate && (
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex max-w-sm flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="mem-q">
                Recherche membres
              </label>
              <Input
                id="mem-q"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOffset(0);
                }}
                placeholder="Nom ou email…"
              />
            </div>
          </div>

          {membersQuery.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{(membersQuery.error as Error).message}</AlertTitle>
              <AlertDescription>Impossible de charger les membres.</AlertDescription>
            </Alert>
          )}

          {membersQuery.isLoading && !data && (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}

          {!membersQuery.error && data && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun membre dans cette équipe.</p>
          )}

          {!membersQuery.error && items.length > 0 && (
            <div className="overflow-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collaborateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    {canUpdate ? <TableHead className="w-[140px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.resourceDisplayName}</div>
                        {m.resourceEmail ? (
                          <div className="text-xs text-muted-foreground">{m.resourceEmail}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {canUpdate ? (
                          <select
                            className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                            value={m.role}
                            onChange={(e) =>
                              onRoleChange(m.id, e.target.value as WorkTeamMemberRole)
                            }
                          >
                            {(['MEMBER', 'LEAD', 'DEPUTY'] as const).map((r) => (
                              <option key={r} value={r}>
                                {workTeamMemberRoleLabel(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          workTeamMemberRoleLabel(m.role)
                        )}
                      </TableCell>
                      {canUpdate ? (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onRemove(m.id)}
                            disabled={removeMutation.isPending}
                          >
                            Retirer
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {data && total > limit && (
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {offset + 1}–{Math.min(offset + limit, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(offset + limit)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <WorkTeamAddMemberDialog open={addOpen} onOpenChange={setAddOpen} teamId={teamId} />
    </>
  );
}
