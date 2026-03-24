'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { projectsList } from '@/features/projects/constants/project-routes';
import {
  createProjectTag,
  deleteProjectTag,
  listProjectTags,
  updateProjectTag,
} from '@/features/projects/api/projects.api';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';

const DEFAULT_TAG_COLORS = [
  '#64748B',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#14B8A6',
  '#22C55E',
  '#EAB308',
  '#F97316',
  '#EF4444',
];

function tagBadgeStyle(color: string | null | undefined) {
  const background = color ?? '#64748B';
  return {
    backgroundColor: background,
    borderColor: background,
    color: '#FFFFFF',
  } as const;
}

/**
 * Ecran placeholder pour les options du module Projets (navigation latérale).
 * À enrichir lorsque des réglages métier seront définis.
 */
export default function ProjectsOptionsPage() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(DEFAULT_TAG_COLORS[0]);
  const [newColorModalOpen, setNewColorModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(DEFAULT_TAG_COLORS[0]);
  const [editColorModalOpen, setEditColorModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });

  const invalidateTags = async () => {
    await queryClient.invalidateQueries({ queryKey: projectQueryKeys.optionsTags(clientId) });
    await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(clientId, {}) });
  };

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      createProjectTag(authFetch, { name, color }),
    onSuccess: async () => {
      setFormError(null);
      setNewName('');
      setNewColor(DEFAULT_TAG_COLORS[0]);
      await invalidateTags();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : "Impossible de creer l'etiquette.";
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      updateProjectTag(authFetch, id, { name, color }),
    onSuccess: async () => {
      setFormError(null);
      setEditId(null);
      setEditName('');
      setEditColor(DEFAULT_TAG_COLORS[0]);
      await invalidateTags();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : "Impossible de mettre a jour l'etiquette.";
      setFormError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectTag(authFetch, id),
    onSuccess: async () => {
      setFormError(null);
      await invalidateTags();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : "Impossible de supprimer l'etiquette.";
      setFormError(message);
    },
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Link
            href={projectsList()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Portefeuille
          </Link>
        </div>
        <PageHeader
          title="Options portefeuille projets"
          description="Gérer les étiquettes disponibles pour ce client."
        />
        <Card size="sm">
          <CardHeader>
            <CardTitle>Etiquettes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                const value = newName.trim();
                if (!value) return;
                createMutation.mutate({ name: value, color: newColor });
              }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouvelle etiquette"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewColorModalOpen(true)}
                className="h-6 w-6 border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                aria-label="Choisir la couleur"
                title="Choisir la couleur"
              >
                <span
                  className="h-5 w-5 rounded-md border border-black/10 ring-1 ring-inset ring-white/30"
                  style={{ backgroundColor: newColor }}
                />
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Ajouter
              </Button>
            </form>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            {tagsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : tagsQuery.isError ? (
              <p className="text-sm text-muted-foreground">Aucune etiquette configuree.</p>
            ) : !tagsQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">Aucune etiquette configuree.</p>
            ) : (
              <div className="space-y-2">
                {tagsQuery.data.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" style={tagBadgeStyle(tag.color)}>
                        {tag.name}
                      </Badge>
                    </div>
                    {editId === tag.id ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const value = editName.trim();
                          if (!value) return;
                          updateMutation.mutate({ id: tag.id, name: value, color: editColor });
                        }}
                      >
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-44"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditColorModalOpen(true)}
                          className="h-6 w-6 border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                          aria-label="Choisir la couleur"
                          title="Choisir la couleur"
                        >
                          <span
                            className="h-5 w-5 rounded-md border border-black/10 ring-1 ring-inset ring-white/30"
                            style={{ backgroundColor: editColor }}
                          />
                        </Button>
                        <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                          OK
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditId(tag.id);
                            setEditName(tag.name);
                            setEditColor(tag.color ?? DEFAULT_TAG_COLORS[0]);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(tag.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={newColorModalOpen} onOpenChange={setNewColorModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Couleur de l'etiquette</DialogTitle>
              <DialogDescription>Choisir une couleur par defaut ou personnalisee.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`h-7 w-7 rounded-full border ${newColor === color ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir la couleur ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Personnalisee</span>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label="Choisir une couleur personnalisee"
              />
              <Badge variant="secondary" style={tagBadgeStyle(newColor)}>
                Apercu
              </Badge>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setNewColorModalOpen(false)}>
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editColorModalOpen} onOpenChange={setEditColorModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Couleur de l'etiquette</DialogTitle>
              <DialogDescription>Modifier la couleur de l'etiquette.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditColor(color)}
                  className={`h-7 w-7 rounded-full border ${editColor === color ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir la couleur ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Personnalisee</span>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label="Choisir une couleur personnalisee"
              />
              <Badge variant="secondary" style={tagBadgeStyle(editColor)}>
                Apercu
              </Badge>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setEditColorModalOpen(false)}>
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </RequireActiveClient>
  );
}
