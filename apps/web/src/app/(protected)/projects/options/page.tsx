'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
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
  createProjectPortfolioCategory,
  listProjectTags,
  deleteProjectPortfolioCategory,
  listProjectPortfolioCategories,
  reorderProjectPortfolioCategories,
  updateProjectTag,
  updateProjectPortfolioCategory,
} from '@/features/projects/api/projects.api';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import type { ProjectPortfolioCategoryNode } from '@/features/projects/types/project.types';

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

export default function ProjectsOptionsPage() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [newRootName, setNewRootName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLORS[0]);
  const [newTagColorModalOpen, setNewTagColorModalOpen] = useState(false);
  const [newChildByRoot, setNewChildByRoot] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState<string>(DEFAULT_TAG_COLORS[0]);
  const [editTagColorModalOpen, setEditTagColorModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(true);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(true);

  const categoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });
  const tagsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });

  const invalidateCategories = async () => {
    await queryClient.invalidateQueries({
      queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    });
    await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(clientId, {}) });
  };
  const invalidateTags = async () => {
    await queryClient.invalidateQueries({
      queryKey: projectQueryKeys.optionsTags(clientId),
    });
    await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(clientId, {}) });
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; parentId?: string | null }) =>
      createProjectPortfolioCategory(authFetch, payload),
    onSuccess: async () => {
      setFormError(null);
      setNewRootName('');
      setNewChildByRoot({});
      await invalidateCategories();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : "Impossible de creer la categorie.";
      setFormError(message);
    },
  });
  const createTagMutation = useMutation({
    mutationFn: (payload: { name: string; color?: string }) => createProjectTag(authFetch, payload),
    onSuccess: async () => {
      setNewTagName('');
      setNewTagColor(DEFAULT_TAG_COLORS[0]);
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
          : "Impossible de creer l'etiquette.";
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; isActive?: boolean };
    }) => updateProjectPortfolioCategory(authFetch, id, payload),
    onSuccess: async () => {
      setFormError(null);
      setEditId(null);
      setEditName('');
      await invalidateCategories();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Impossible de mettre a jour la categorie.';
      setFormError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectPortfolioCategory(authFetch, id),
    onSuccess: async () => {
      setFormError(null);
      setDeleteDialog(null);
      await invalidateCategories();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Suppression impossible (enfants ou projets rattaches).';
      setFormError(message);
    },
  });
  const updateTagMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color?: string }) =>
      updateProjectTag(authFetch, id, { name, color }),
    onSuccess: async () => {
      setEditTagId(null);
      setEditTagName('');
      setEditTagColor(DEFAULT_TAG_COLORS[0]);
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
          : "Impossible de modifier l'etiquette.";
      setFormError(message);
    },
  });
  const deleteTagMutation = useMutation({
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

  const reorderMutation = useMutation({
    mutationFn: (payload: { parentId?: string | null; items: Array<{ id: string; sortOrder: number }> }) =>
      reorderProjectPortfolioCategories(authFetch, payload),
    onSuccess: async () => {
      await invalidateCategories();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Reordonnancement impossible.';
      setFormError(message);
    },
  });

  const moveWithinSiblings = (
    siblings: ProjectPortfolioCategoryNode[],
    index: number,
    direction: -1 | 1,
  ) => {
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    const swapped = [...siblings];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    reorderMutation.mutate({
      parentId: swapped[0]?.parentId ?? null,
      items: swapped.map((item, i) => ({ id: item.id, sortOrder: i })),
    });
  };

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
          description="Gerer les etiquettes et l'arborescence des categories portefeuille."
        />
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Etiquettes</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsTagsCollapsed((prev) => !prev)}
            >
              {isTagsCollapsed ? 'Deplier' : 'Plier'}
              {isTagsCollapsed ? (
                <ChevronDown className="ml-1 size-4" />
              ) : (
                <ChevronUp className="ml-1 size-4" />
              )}
            </Button>
          </CardHeader>
          {!isTagsCollapsed ? (
            <CardContent className="space-y-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = newTagName.trim();
                if (!value) return;
                createTagMutation.mutate({ name: value, color: newTagColor });
              }}
            >
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nouvelle etiquette"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTagColorModalOpen(true)}
                className="h-6 w-6 border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                aria-label="Choisir la couleur"
                title="Choisir la couleur"
              >
                <span
                  className="h-5 w-5 rounded-md border border-black/10 ring-1 ring-inset ring-white/30"
                  style={{ backgroundColor: newTagColor }}
                />
              </Button>
              <Button type="submit" disabled={createTagMutation.isPending}>
                Ajouter
              </Button>
            </form>
            {tagsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : !tagsQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">Aucune etiquette configuree.</p>
            ) : (
              <div className="space-y-2">
                {tagsQuery.data.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    {editTagId === tag.id ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const value = editTagName.trim();
                          if (!value) return;
                          updateTagMutation.mutate({ id: tag.id, name: value, color: editTagColor });
                        }}
                      >
                        <Input
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="h-8 w-56"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditTagColorModalOpen(true)}
                          className="h-6 w-6 border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                          aria-label="Choisir la couleur"
                          title="Choisir la couleur"
                        >
                          <span
                            className="h-5 w-5 rounded-md border border-black/10 ring-1 ring-inset ring-white/30"
                            style={{ backgroundColor: editTagColor }}
                          />
                        </Button>
                        <Button type="submit" size="sm">
                          OK
                        </Button>
                      </form>
                    ) : (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: tag.color ?? '#64748B',
                          borderColor: tag.color ?? '#64748B',
                          color: '#FFFFFF',
                        }}
                      >
                        {tag.name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditTagId(tag.id);
                          setEditTagName(tag.name);
                          setEditTagColor(tag.color ?? DEFAULT_TAG_COLORS[0]);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTagMutation.mutate(tag.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          ) : null}
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categories portefeuille</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCategoriesCollapsed((prev) => !prev)}
            >
              {isCategoriesCollapsed ? 'Deplier' : 'Plier'}
              {isCategoriesCollapsed ? (
                <ChevronDown className="ml-1 size-4" />
              ) : (
                <ChevronUp className="ml-1 size-4" />
              )}
            </Button>
          </CardHeader>
          {!isCategoriesCollapsed ? (
            <CardContent className="space-y-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                const value = newRootName.trim();
                if (!value) return;
                createMutation.mutate({ name: value });
              }}
            >
              <Input
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                placeholder="Nouvelle categorie racine"
              />
              <Button type="submit" disabled={createMutation.isPending}>
                Ajouter
              </Button>
            </form>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            {categoriesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : categoriesQuery.isError ? (
              <p className="text-sm text-muted-foreground">Aucune categorie configuree.</p>
            ) : !categoriesQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">Aucune categorie configuree.</p>
            ) : (
              <div className="space-y-2">
                {categoriesQuery.data.map((root, rootIndex) => (
                  <div key={root.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Racine</Badge>
                        {editId === root.id ? (
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const value = editName.trim();
                              if (!value) return;
                              updateMutation.mutate({ id: root.id, payload: { name: value } });
                            }}
                          >
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 w-52"
                            />
                            <Button type="submit" size="sm">
                              OK
                            </Button>
                          </form>
                        ) : (
                          <span className="font-medium">{root.name}</span>
                        )}
                        {!root.isActive ? <Badge variant="outline">Inactif</Badge> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveWithinSiblings(categoriesQuery.data, rootIndex, -1)}
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveWithinSiblings(categoriesQuery.data, rootIndex, 1)}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditId(root.id);
                            setEditName(root.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateMutation.mutate({
                              id: root.id,
                              payload: { isActive: !root.isActive },
                            })
                          }
                        >
                          {root.isActive ? 'ON' : 'OFF'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ id: root.id, name: root.name })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 border-l pl-4">
                      {(root.children ?? []).map((child, childIndex, list) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between rounded border border-border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Sous-categorie</Badge>
                            {editId === child.id ? (
                              <form
                                className="flex items-center gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const value = editName.trim();
                                  if (!value) return;
                                  updateMutation.mutate({ id: child.id, payload: { name: value } });
                                }}
                              >
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 w-52"
                                />
                                <Button type="submit" size="sm">
                                  OK
                                </Button>
                              </form>
                            ) : (
                              <span>{child.name}</span>
                            )}
                            {!child.isActive ? <Badge variant="outline">Inactif</Badge> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveWithinSiblings(list, childIndex, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveWithinSiblings(list, childIndex, 1)}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditId(child.id);
                                setEditName(child.name);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: child.id,
                                  payload: { isActive: !child.isActive },
                                })
                              }
                            >
                              {child.isActive ? 'ON' : 'OFF'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog({ id: child.id, name: child.name })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const value = (newChildByRoot[root.id] ?? '').trim();
                          if (!value) return;
                          createMutation.mutate({ name: value, parentId: root.id });
                        }}
                      >
                        <Input
                          value={newChildByRoot[root.id] ?? ''}
                          onChange={(e) =>
                            setNewChildByRoot((prev) => ({ ...prev, [root.id]: e.target.value }))
                          }
                          placeholder="Ajouter une sous-categorie"
                        />
                        <Button type="submit" variant="outline" size="sm">
                          <Plus className="mr-1 size-3" />
                          Ajouter
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          ) : null}
        </Card>

        <Dialog open={newTagColorModalOpen} onOpenChange={setNewTagColorModalOpen}>
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
                  onClick={() => setNewTagColor(color)}
                  className={`h-7 w-7 rounded-full border ${newTagColor === color ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir la couleur ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Personnalisee</span>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label="Choisir une couleur personnalisee"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setNewTagColorModalOpen(false)}>
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editTagColorModalOpen} onOpenChange={setEditTagColorModalOpen}>
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
                  onClick={() => setEditTagColor(color)}
                  className={`h-7 w-7 rounded-full border ${editTagColor === color ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir la couleur ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Personnalisee</span>
              <input
                type="color"
                value={editTagColor}
                onChange={(e) => setEditTagColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label="Choisir une couleur personnalisee"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setEditTagColorModalOpen(false)}>
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(deleteDialog)} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer la categorie</DialogTitle>
              <DialogDescription>
                Confirmer la suppression de <strong>{deleteDialog?.name}</strong>. Si la categorie
                a des enfants ou des projets rattaches, la suppression sera refusee.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteDialog(null)}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (!deleteDialog) return;
                  deleteMutation.mutate(deleteDialog.id);
                }}
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </RequireActiveClient>
  );
}
