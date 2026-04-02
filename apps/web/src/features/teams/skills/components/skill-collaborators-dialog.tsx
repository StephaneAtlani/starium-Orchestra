'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { useSkillCollaboratorsForSkill } from '../hooks/use-skill-collaborators-for-skill';
import {
  collaboratorSkillSourceLabel,
  skillReferenceLevelLabel,
} from '../lib/skill-label-mappers';
import type { SkillListItem } from '../types/skill.types';

type SkillCollaboratorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillListItem | null;
};

const limit = 20;

export function SkillCollaboratorsDialog({
  open,
  onOpenChange,
  skill,
}: SkillCollaboratorsDialogProps) {
  const [offset, setOffset] = useState(0);

  const query = useSkillCollaboratorsForSkill(
    skill?.id ?? null,
    { offset, limit, sortBy: 'collaboratorName', sortOrder: 'asc' },
    open && !!skill,
  );

  const data = query.data;
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setOffset(0);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            Collaborateurs — {skill?.name ?? '…'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Personnes ayant cette compétence dans le référentiel (niveau sur l’association).
          </p>
        </DialogHeader>
        {query.isLoading && <LoadingState rows={4} />}
        {query.error && (
          <p className="text-sm text-destructive">{(query.error as Error).message}</p>
        )}
        {data && data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun collaborateur associé à cette compétence.</p>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="overflow-auto rounded-md border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collaborateur</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden sm:table-cell">Validé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.collaboratorDisplayName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.collaboratorJobTitle ?? '—'}
                      </TableCell>
                      <TableCell>{skillReferenceLevelLabel(row.level)}</TableCell>
                      <TableCell className="text-sm">
                        {collaboratorSkillSourceLabel(row.source)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {row.validatedAt
                          ? row.validatedByName ?? 'Validé'
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + limit, total)} sur {total}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  <ChevronLeft className="size-4" />
                  Précédent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset(offset + limit)}
                >
                  Suivant
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
