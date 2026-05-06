'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDeleteStrategicDirectionMutation } from '../hooks/use-strategic-vision-queries';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';
import { StrategicDirectionCreateEditDialog } from './strategic-direction-create-edit-dialog';
import { toast } from '@/lib/toast';

export function StrategicDirectionsTab({
  directions,
  directionsQueryState,
  canManageDirections,
}: {
  directions: StrategicDirectionDto[];
  directionsQueryState: { isLoading: boolean; isError: boolean };
  canManageDirections: boolean;
}) {
  const deleteDirection = useDeleteStrategicDirectionMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StrategicDirectionDto | null>(null);

  const sorted = useMemo(
    () =>
      [...directions].sort(
        (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) || a.code.localeCompare(b.code),
      ),
    [directions],
  );

  if (directionsQueryState.isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-36 w-full" />
      </section>
    );
  }

  if (directionsQueryState.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Impossible de charger les directions stratégiques.</AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
    <section className="space-y-4">
      <Card size="sm" className="shadow-sm">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">Référentiel directions</CardTitle>
          <CardDescription>
            Utilisé dans Vision stratégique, objectifs et module Stratégie de direction. La suppression est refusée
            tant qu&apos;une stratégie de direction existe encore pour cette ligne.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-b border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2 text-right">Ordre</th>
                  <th className="px-4 py-2 text-right">MAJ</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Aucune direction. Crée-en une avec le bouton ci-dessous.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => (
                    <tr key={row.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant={row.isActive ? 'secondary' : 'outline'} className="text-xs">
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{row.sortOrder}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                        {new Date(row.updatedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger render={<span className="inline-flex" />}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  disabled={!canManageDirections}
                                  onClick={() => setEditing(row)}
                                  aria-label={`Modifier ${row.name}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              {!canManageDirections ? (
                                <TooltipContent>
                                  Permission strategic_vision.update ou strategic_vision.manage_directions requise
                                </TooltipContent>
                              ) : (
                                <TooltipContent>Modifier</TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger render={<span className="inline-flex" />}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-destructive hover:text-destructive"
                                  disabled={!canManageDirections || deleteDirection.isPending}
                                  onClick={() => {
                                    const ok = window.confirm(
                                      `Supprimer la direction « ${row.name} » (${row.code}) ? Les objectifs rattachés redeviendront « non affectés ». Impossible si des stratégies de direction existent encore.`,
                                    );
                                    if (!ok) return;
                                    deleteDirection.mutate(row.id, {
                                      onSuccess: () => toast.success('Direction supprimée.'),
                                      onError: (error) =>
                                        toast.error(
                                          error instanceof Error ? error.message : 'Suppression impossible.',
                                        ),
                                    });
                                  }}
                                  aria-label={`Supprimer ${row.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              {!canManageDirections ? (
                                <TooltipContent>
                                  Permission strategic_vision.update ou strategic_vision.manage_directions requise
                                </TooltipContent>
                              ) : (
                                <TooltipContent>Supprimer</TooltipContent>
                              )}
                            </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {(sorted.length ?? 0)} direction(s) · valeurs affichées = code et nom métier (pas les identifiants
            techniques).
          </p>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex w-full justify-end sm:w-auto" />}>
                <Button
                  type="button"
                  disabled={!canManageDirections}
                  className="w-full sm:w-auto"
                  onClick={() => setCreateOpen(true)}
                >
                  Nouvelle direction
                </Button>
              </TooltipTrigger>
              {!canManageDirections ? (
                <TooltipContent>
                  Permission strategic_vision.update ou strategic_vision.manage_directions requise
                </TooltipContent>
              ) : null}
            </Tooltip>
        </CardFooter>
      </Card>

      <StrategicDirectionCreateEditDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        direction={null}
      />
      <StrategicDirectionCreateEditDialog
        mode="edit"
        open={editing != null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        direction={editing}
      />
    </section>
    </TooltipProvider>
  );
}
