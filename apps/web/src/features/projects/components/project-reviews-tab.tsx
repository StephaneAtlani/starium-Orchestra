'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import {
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import type { ProjectReviewListItem, ProjectReviewType } from '../types/project.types';

const REVIEW_TYPES: ProjectReviewType[] = [
  'COPIL',
  'COPRO',
  'CODIR_REVIEW',
  'RISK_REVIEW',
  'MILESTONE_REVIEW',
  'AD_HOC',
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

export function ProjectReviewsTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const list = useProjectReviewsQuery(projectId);
  const { create, finalize, cancel } = useProjectReviewMutations(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [formType, setFormType] = useState<ProjectReviewType>('COPIL');
  const [formTitle, setFormTitle] = useState('');

  const detailQuery = useProjectReviewDetailQuery(projectId, detailId);

  const onCreate = async () => {
    const reviewDate = new Date(formDate).toISOString();
    await create.mutateAsync({
      reviewDate,
      reviewType: formType,
      title: formTitle.trim() || undefined,
    });
    setCreateOpen(false);
    setFormTitle('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Historique des comités (COPIL / COPRO) et snapshots à la finalisation.
        </p>
        {canEdit && (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Créer un point projet
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <LoadingState rows={4} />
      ) : list.error ? (
        <p className="text-sm text-destructive">Impossible de charger les points projet.</p>
      ) : !list.data?.length ? (
        <p className="text-sm text-muted-foreground">Aucun point projet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((row: ProjectReviewListItem) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.reviewDate)}</TableCell>
                <TableCell>
                  {PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ?? row.reviewType}
                </TableCell>
                <TableCell>
                  {PROJECT_REVIEW_STATUS_LABEL[row.status] ?? row.status}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.title ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailId(row.id)}
                  >
                    Détail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau point projet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pr-date">Date du point</Label>
              <Input
                id="pr-date"
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pr-type">Type</Label>
              <select
                id="pr-type"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={formType}
                onChange={(e) => setFormType(e.target.value as ProjectReviewType)}
              >
                {REVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROJECT_REVIEW_TYPE_LABEL[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pr-title">Titre (optionnel)</Label>
              <Input
                id="pr-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Point projet</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : detailQuery.data ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Statut : </span>
                {PROJECT_REVIEW_STATUS_LABEL[detailQuery.data.status] ??
                  detailQuery.data.status}
              </div>
              <div>
                <span className="text-muted-foreground">Type : </span>
                {PROJECT_REVIEW_TYPE_LABEL[detailQuery.data.reviewType] ??
                  detailQuery.data.reviewType}
              </div>
              <div>
                <span className="text-muted-foreground">Date : </span>
                {formatDate(detailQuery.data.reviewDate)}
              </div>
              {detailQuery.data.title && (
                <div>
                  <span className="text-muted-foreground">Titre : </span>
                  {detailQuery.data.title}
                </div>
              )}
              {detailQuery.data.executiveSummary && (
                <div className="whitespace-pre-wrap border-t pt-2">
                  <span className="font-medium">Résumé : </span>
                  {detailQuery.data.executiveSummary}
                </div>
              )}
              {detailQuery.data.decisions.length > 0 && (
                <div className="border-t pt-2">
                  <p className="font-medium">Décisions</p>
                  <ul className="list-inside list-disc">
                    {detailQuery.data.decisions.map((d) => (
                      <li key={d.id}>{d.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detailQuery.data.actionItems.length > 0 && (
                <div className="border-t pt-2">
                  <p className="font-medium">Actions</p>
                  <ul className="space-y-1">
                    {detailQuery.data.actionItems.map((a) => (
                      <li key={a.id}>
                        {a.title} — {a.status}
                        {a.dueDate ? ` — ${formatDate(a.dueDate)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detailQuery.data.snapshotPayload != null && (
                <div className="border-t pt-2">
                  <p className="font-medium">Snapshot (figé)</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
                    {JSON.stringify(detailQuery.data.snapshotPayload, null, 2)}
                  </pre>
                </div>
              )}
              {canEdit && detailQuery.data.status === 'DRAFT' && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void finalize.mutateAsync(detailQuery.data!.id).then(() =>
                        setDetailId(null),
                      );
                    }}
                    disabled={finalize.isPending}
                  >
                    Finaliser
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void cancel.mutateAsync(detailQuery.data!.id).then(() =>
                        setDetailId(null),
                      );
                    }}
                    disabled={cancel.isPending}
                  >
                    Annuler le point
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Détail indisponible.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
