'use client';

import { useCallback, useState } from 'react';
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
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import type {
  ProjectAssignableUser,
  ProjectReviewListItem,
  ProjectReviewType,
} from '../types/project.types';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';

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

function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatAssignableUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
}

function displayNameFromUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

type CreateParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
};

export function ProjectReviewsTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const list = useProjectReviewsQuery(projectId);
  const assignable = useProjectAssignableUsers();
  const { create } = useProjectReviewMutations(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editorReviewId, setEditorReviewId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const [formDate, setFormDate] = useState(defaultDatetimeLocal);
  const [formType, setFormType] = useState<ProjectReviewType>('COPIL');
  const [formTitle, setFormTitle] = useState('');
  const [createParticipants, setCreateParticipants] = useState<CreateParticipantRow[]>([
    { displayName: '', userId: '', attended: true, isRequired: false },
  ]);

  const resetCreateForm = useCallback(() => {
    setFormDate(defaultDatetimeLocal());
    setFormType('COPIL');
    setFormTitle('');
    setCreateParticipants([
      { displayName: '', userId: '', attended: true, isRequired: false },
    ]);
  }, []);

  const openEditor = (id: string) => {
    setEditorReviewId(id);
    setEditorOpen(true);
  };

  const onCreate = async () => {
    const reviewDate = new Date(formDate).toISOString();
    const participants = createParticipants
      .filter((p) => p.displayName.trim() || p.userId.trim())
      .map((p) => ({
        userId: p.userId.trim() || null,
        displayName: p.displayName.trim() || null,
        attended: p.attended,
        isRequired: p.isRequired,
      }));
    const created = await create.mutateAsync({
      reviewDate,
      reviewType: formType,
      title: formTitle.trim() || undefined,
      ...(participants.length > 0 ? { participants } : {}),
    });
    setCreateOpen(false);
    openEditor(created.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Créez un <strong className="font-medium text-foreground">point projet</strong>, complétez le
          compte rendu (arbitrage, synthèse, participants, décisions, actions), enregistrez puis
          finalisez pour figer le snapshot.
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
                    onClick={() => openEditor(row.id)}
                  >
                    {row.status === 'DRAFT' ? 'Continuer' : 'Voir'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (o) resetCreateForm();
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Nouveau point projet</DialogTitle>
          </DialogHeader>
          <p className="shrink-0 text-xs text-muted-foreground">
            Date, type, parties prenantes. Vous compléterez le compte rendu (synthèse, décisions,
            actions) à l’étape suivante.
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <div className="grid gap-3">
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
                  placeholder="Ex. COPIL mensuel — arbitrage budget"
                />
              </div>

              <div className="border-t border-border/60 pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-foreground">Parties prenantes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCreateParticipants((prev) => [
                        ...prev,
                        {
                          displayName: '',
                          userId: '',
                          attended: true,
                          isRequired: false,
                        },
                      ])
                    }
                  >
                    Ajouter
                  </Button>
                </div>
                <p className="mb-2 text-[0.7rem] text-muted-foreground">
                  Rattachez un membre du client ou saisissez un nom (invité, MOA…). Au moins le nom
                  ou le compte doit être renseigné.
                </p>
                {assignable.isLoading ? (
                  <p className="text-xs text-muted-foreground">Chargement des membres…</p>
                ) : (
                  <div className="space-y-3">
                    {createParticipants.map((row, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/70 bg-muted/20 p-3"
                      >
                        <div className="grid gap-2">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Membre du client (optionnel)</Label>
                            <select
                              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                              value={row.userId}
                              onChange={(e) => {
                                const id = e.target.value;
                                const u = assignable.data?.find((x) => x.id === id);
                                setCreateParticipants((prev) =>
                                  prev.map((p, j) =>
                                    j === i
                                      ? {
                                          ...p,
                                          userId: id,
                                          displayName: u
                                            ? displayNameFromUser(u)
                                            : p.displayName,
                                        }
                                      : p,
                                  ),
                                );
                              }}
                            >
                              <option value="">— Choisir dans la liste —</option>
                              {assignable.data?.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {formatAssignableUser(u)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`pr-part-name-${i}`}>Nom affiché</Label>
                            <Input
                              id={`pr-part-name-${i}`}
                              value={row.displayName}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCreateParticipants((prev) =>
                                  prev.map((p, j) => (j === i ? { ...p, displayName: v } : p)),
                                );
                              }}
                              placeholder="Nom, rôle, organisation…"
                            />
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-input"
                                checked={row.attended}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) =>
                                      j === i ? { ...p, attended: v } : p,
                                    ),
                                  );
                                }}
                              />
                              Présent
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-input"
                                checked={row.isRequired}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) =>
                                      j === i ? { ...p, isRequired: v } : p,
                                    ),
                                  );
                                }}
                              />
                              Requis
                            </label>
                            {createParticipants.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() =>
                                  setCreateParticipants((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                Retirer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer et ouvrir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectReviewEditorDialog
        projectId={projectId}
        reviewId={editorReviewId}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditorReviewId(null);
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
