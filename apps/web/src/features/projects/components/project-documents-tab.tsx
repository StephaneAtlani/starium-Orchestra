'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { displayLabel } from '@/lib/display-label';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';
import { PROJECT_DOCUMENT_CATEGORY_LABEL } from '../constants/project-enum-labels';
import { useProjectDocumentMutations } from '../hooks/use-project-document-mutations';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { projectDocumentTypeLabel } from '../lib/project-document-accept';
import type { ProjectDocumentApi, ProjectDocumentCategory } from '../types/project.types';
import { AddProjectDocumentDialog } from './add-project-document-dialog';

function formatBytes(bytes: number | null) {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let v = Math.max(0, bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const s = i === 0 ? String(Math.round(v)) : v.toFixed(v < 10 ? 1 : 0);
  return `${s} ${units[i]}`;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function DocumentRowActions({
  doc,
  canEdit,
  onEdit,
  onDownload,
  onArchive,
  onDelete,
}: {
  doc: ProjectDocumentApi;
  canEdit: boolean;
  onEdit: () => void;
  onDownload: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const name = displayLabel(doc.name, 'Document sans titre');

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      el.open = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.open) el.open = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const close = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <details ref={menuRef} className="group/details relative shrink-0">
      <summary
        className="starium-btn-icon min-h-11 min-w-11 [&::-webkit-details-marker]:hidden sm:min-h-9 sm:min-w-9"
        aria-label={`Actions pour ${name}`}
      >
        <MoreHorizontal aria-hidden />
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel starium-dropdown-panel--floating absolute right-0 z-[120] mt-1 min-w-[12rem] rounded-xl py-1.5 shadow-lg',
          'pointer-events-none translate-y-1 opacity-0 transition-all',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:opacity-100',
        )}
      >
        {doc.storageType === 'STARIUM' ? (
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              onDownload();
              close();
            }}
          >
            <Download className="size-4" aria-hidden />
            Télécharger
          </button>
        ) : null}
        {doc.externalUrl ? (
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              window.open(doc.externalUrl!, '_blank', 'noopener,noreferrer');
              close();
            }}
          >
            <ExternalLink className="size-4" aria-hidden />
            Ouvrir le lien
          </button>
        ) : null}
        {canEdit ? (
          <>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onEdit();
                close();
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Modifier
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onArchive();
                close();
              }}
            >
              <Archive className="size-4" aria-hidden />
              Archiver
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-destructive hover:bg-accent"
              onClick={() => {
                if (window.confirm(`Supprimer « ${name} » du registre projet ?`)) {
                  onDelete();
                }
                close();
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Supprimer
            </button>
          </>
        ) : null}
      </div>
    </details>
  );
}

type Pane = 'docs' | 'activity';

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const query = useProjectDocumentsQuery(projectId);
  const mutations = useProjectDocumentMutations(projectId);

  const [pane, setPane] = useState<Pane>('docs');
  const [search, setSearch] = useState('');
  const [extension, setExtension] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<ProjectDocumentApi | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProjectDocumentCategory>('GENERAL');
  const [editDescription, setEditDescription] = useState('');

  const docs = useMemo(() => {
    let list = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.originalFilename?.toLowerCase().includes(q) ?? false),
      );
    }
    if (extension) {
      const ext = extension.toLowerCase();
      list = list.filter(
        (d) => (d.extension ?? '').replace(/^\./, '').toLowerCase() === ext,
      );
    }
    return list;
  }, [query.data, search, extension]);

  const activity = useMemo(
    () =>
      [...(query.data ?? [])]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
    [query.data],
  );

  const openEdit = (doc: ProjectDocumentApi) => {
    setEditDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditDescription(doc.description ?? '');
  };

  const saveEdit = async () => {
    if (!editDoc) return;
    await mutations.update.mutateAsync({
      documentId: editDoc.id,
      name: editName.trim(),
      category: editCategory,
      description: editDescription.trim() || null,
    });
    setEditDoc(null);
  };

  if (query.isLoading) return <LoadingState rows={6} />;
  if (query.isError) {
    return (
      <ErrorState
        message="Impossible de charger les documents. Vérifiez votre connexion puis réessayez."
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="starium-stack space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="starium-tab-group inline-flex gap-1 rounded-xl bg-muted/90 p-1"
          role="tablist"
          aria-label="Documents ou activité"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'docs'}
            className={cn(
              'min-h-11 rounded-lg px-3 text-sm font-medium sm:min-h-9',
              pane === 'docs' && 'bg-background shadow-sm',
            )}
            onClick={() => setPane('docs')}
          >
            Documents
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'activity'}
            className={cn(
              'min-h-11 rounded-lg px-3 text-sm font-medium sm:min-h-9 lg:hidden',
              pane === 'activity' && 'bg-background shadow-sm',
            )}
            onClick={() => setPane('activity')}
          >
            Activité
          </button>
        </div>
        {canEdit ? (
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Ajouter un document
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className={cn('min-w-0 space-y-3', pane === 'activity' && 'hidden lg:block')}>
          <FilterBar aria-label="Filtres documents">
            <FilterBarField id="proj-docs-search" label="Recherche" className="min-w-[12rem] flex-1">
              {({ controlId }) => (
                <Input
                  id={controlId}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un document…"
                  className="min-h-11"
                />
              )}
            </FilterBarField>
            <FilterBarField id="proj-docs-type" label="Type">
              {({ controlId }) => (
                <select
                  id={controlId}
                  className="starium-form-select min-h-11"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                >
                  <option value="">Tous</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="xlsx">Excel</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPEG</option>
                  <option value="zip">ZIP</option>
                </select>
              )}
            </FilterBarField>
          </FilterBar>

          {docs.length === 0 ? (
            <EmptyState
              title="Aucun document"
              description="Ajoutez un livrable ou un lien pour constituer le registre du projet."
              action={
                canEdit ? (
                  <Button type="button" onClick={() => setAddOpen(true)}>
                    Ajouter un document
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Modifié le</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Taille</TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const name = displayLabel(doc.name, 'Document sans titre');
                    const typeLabel = projectDocumentTypeLabel(doc);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-[10px] font-semibold tabular-nums"
                              aria-hidden
                            >
                              {typeLabel.slice(0, 4)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {typeLabel} · {formatDate(doc.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <RegistryBadge className="border border-border text-[11px]">
                            {typeLabel}
                          </RegistryBadge>
                        </TableCell>
                        <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                          {formatDate(doc.updatedAt)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums lg:table-cell">
                          {formatBytes(doc.sizeBytes)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DocumentRowActions
                            doc={doc}
                            canEdit={canEdit}
                            onEdit={() => openEdit(doc)}
                            onDownload={() => mutations.download.mutate(doc.id)}
                            onArchive={() => mutations.archive.mutate(doc.id)}
                            onDelete={() => mutations.remove.mutate(doc.id)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <aside
          className={cn(
            'rounded-xl border border-border/70 bg-card p-4',
            pane === 'docs' && 'hidden lg:block',
          )}
          aria-label="Activité récente"
        >
          <h2 className="starium-overline mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
            Activité récente
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((doc) => (
                <li key={doc.id} className="flex gap-2 text-sm">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {displayLabel(doc.name, 'Document sans titre')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mis à jour · {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <AddProjectDocumentDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <StariumModal
        open={!!editDoc}
        onOpenChange={(open) => {
          if (!open) setEditDoc(null);
        }}
        title="Modifier le document"
        description="Métadonnées du registre projet."
        icon={Pencil}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setEditDoc(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={mutations.update.isPending}
              onClick={() => void saveEdit()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="starium-form space-y-3">
          <div className="starium-form-field">
            <Label htmlFor="edit-doc-name">Nom</Label>
            <Input
              id="edit-doc-name"
              className="min-h-11"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="starium-form-field">
            <Label htmlFor="edit-doc-cat">Catégorie</Label>
            <select
              id="edit-doc-cat"
              className="starium-form-select min-h-11 w-full"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as ProjectDocumentCategory)}
            >
              {Object.entries(PROJECT_DOCUMENT_CATEGORY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="starium-form-field">
            <Label htmlFor="edit-doc-desc">Description</Label>
            <textarea
              id="edit-doc-desc"
              className="starium-form-textarea min-h-20 w-full"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
        </div>
      </StariumModal>
    </div>
  );
}
