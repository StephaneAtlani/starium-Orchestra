'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { PROJECT_DOCUMENT_CATEGORY_LABEL } from '../constants/project-enum-labels';
import { useProjectDocumentMutations } from '../hooks/use-project-document-mutations';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { projectDocumentTypeLabel } from '../lib/project-document-accept';
import {
  formatProjectDocumentBytes,
  formatProjectDocumentDateTime,
  formatProjectDocumentRelative,
  projectDocumentActivityVerb,
  projectDocumentAuthorFull,
  projectDocumentAuthorShort,
  projectDocumentBadgeClass,
  projectDocumentBadgeLabel,
  projectDocumentDisplayName,
  projectDocumentIcoClass,
  projectDocumentVisualTone,
} from '../lib/project-document-visual';
import type { ProjectDocumentApi, ProjectDocumentCategory } from '../types/project.types';
import { AddProjectDocumentDialog } from './add-project-document-dialog';

type Pane = 'docs' | 'activity';
type SortMode = 'updatedAt:desc' | 'name:asc';

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
  const name = projectDocumentDisplayName(doc);

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
    <div className="inline-flex items-center justify-end gap-1">
      {canEdit ? (
        <button
          type="button"
          className="starium-dt-dots-btn min-h-11 min-w-11 sm:min-h-[30px] sm:min-w-[30px]"
          aria-label={`Modifier ${name}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" aria-hidden />
        </button>
      ) : null}
      <details ref={menuRef} className="group/details relative inline-flex shrink-0">
        <summary
          className="starium-dt-dots-btn min-h-11 min-w-11 [&::-webkit-details-marker]:hidden sm:min-h-[30px] sm:min-w-[30px]"
          aria-label={`Actions pour ${name}`}
        >
          <MoreVertical className="size-4" aria-hidden />
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
    </div>
  );
}

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const query = useProjectDocumentsQuery(projectId);
  const mutations = useProjectDocumentMutations(projectId);

  const [pane, setPane] = useState<Pane>('docs');
  const [search, setSearch] = useState('');
  const [extension, setExtension] = useState('');
  const [sort, setSort] = useState<SortMode>('updatedAt:desc');
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<ProjectDocumentApi | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProjectDocumentCategory>('GENERAL');
  const [editDescription, setEditDescription] = useState('');

  const docs = useMemo(() => {
    let list = [...(query.data ?? [])];
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
    if (sort === 'name:asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    } else {
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [query.data, search, extension, sort]);

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

  if (query.isLoading) {
    return (
      <div className="starium-tablecard p-6">
        <LoadingState rows={6} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message="Impossible de charger les documents. Vérifiez votre connexion puis réessayez."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const total = docs.length;
  const rangeLabel =
    total === 0
      ? 'Aucun document'
      : total === 1
        ? '1 document'
        : `1 à ${total} sur ${total} documents`;

  return (
    <div className="flex flex-col gap-3">
      <div className="starium-toolbar" style={{ marginTop: 0 }}>
        <div className="starium-seg-toggle" role="tablist" aria-label="Documents ou activité">
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'docs'}
            className={cn(
              'starium-seg-btn min-h-11 sm:min-h-9',
              pane === 'docs' && 'starium-seg-btn--active',
            )}
            onClick={() => setPane('docs')}
          >
            <FileText className="size-3.5" strokeWidth={1.75} aria-hidden />
            Documents
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pane === 'activity'}
            className={cn(
              'starium-seg-btn min-h-11 sm:min-h-9',
              pane === 'activity' && 'starium-seg-btn--active',
            )}
            onClick={() => setPane('activity')}
          >
            <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
            Activité
          </button>
        </div>
        <div className="starium-toolbar-spacer" />
        {canEdit ? (
          <Button
            type="button"
            className="min-h-11 gap-1.5 sm:min-h-9"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Ajouter un document
            <ChevronDown className="size-3.5 opacity-80" strokeWidth={2.5} aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="starium-g2-side">
        <div
          className={cn(
            'min-w-0 space-y-3',
            pane === 'activity' && 'max-[1099px]:hidden',
          )}
        >
          <div className="starium-toolbar" role="search" style={{ marginTop: 0 }}>
            <label className="starium-search-input min-w-0 flex-1">
              <Search strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un document…"
                aria-label="Rechercher un document"
              />
            </label>
            <div className="starium-toolbar-spacer" />
            <div className="starium-fbtn-wrap">
              <Filter className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
              <select
                className="starium-fbtn-select"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                aria-label="Filtrer par type"
              >
                <option value="">Type</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word</option>
                <option value="xlsx">Excel</option>
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="zip">ZIP</option>
              </select>
              <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="starium-fbtn-wrap">
              <List className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
              <select
                className="starium-fbtn-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                aria-label="Trier les documents"
              >
                <option value="updatedAt:desc">Modifié le (récent)</option>
                <option value="name:asc">Nom (A → Z)</option>
              </select>
              <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
            </div>
            <button
              type="button"
              className="starium-fbtn starium-fbtn--icon min-h-11 sm:min-h-[38px]"
              aria-label="Vue liste"
              aria-pressed
            >
              <List strokeWidth={2} aria-hidden />
            </button>
          </div>

          {docs.length === 0 ? (
            <div className="starium-tablecard p-6">
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
            </div>
          ) : (
            <div className="starium-tablecard">
              <StariumTableWrap scrollLabel="Documents projet — glisser pour faire défiler">
                <table className="starium-dt w-full">
                  <caption className="sr-only">Documents du projet</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nom</th>
                      <th scope="col">Type</th>
                      <th scope="col">Modifié le</th>
                      <th scope="col">Auteur</th>
                      <th scope="col">Taille</th>
                      <th
                        scope="col"
                        className="starium-dt__right starium-dt__sticky-actions"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc, index) => {
                      const name = projectDocumentDisplayName(doc);
                      const tone = projectDocumentVisualTone(doc);
                      const icoText = projectDocumentTypeLabel(doc).slice(0, 4);
                      const authorShort = projectDocumentAuthorShort(doc.uploadedByUser);
                      const authorFull = projectDocumentAuthorFull(doc.uploadedByUser);
                      return (
                        <tr key={doc.id}>
                          <td>
                            <div className="starium-dt-tname">
                              <span className={projectDocumentIcoClass(tone)} aria-hidden>
                                {icoText}
                              </span>
                              <span className="starium-dt-cell-strong truncate">{name}</span>
                            </div>
                          </td>
                          <td>
                            <span className={projectDocumentBadgeClass(tone)}>
                              {projectDocumentBadgeLabel(doc)}
                            </span>
                          </td>
                          <td className="tabular-nums text-[color:var(--neutral-600)]">
                            {formatProjectDocumentDateTime(doc.updatedAt)}
                          </td>
                          <td>
                            <div className="starium-dt-assignee">
                              <UserInitialsAvatar
                                displayName={authorFull}
                                seed={doc.uploadedByUserId ?? doc.id}
                                themeIndex={index}
                                size="sm"
                              />
                              <span className="starium-dt-assignee-name" title={authorFull}>
                                {authorShort}
                              </span>
                            </div>
                          </td>
                          <td className="tabular-nums">
                            {formatProjectDocumentBytes(doc.sizeBytes)}
                          </td>
                          <td className="starium-dt__right starium-dt__sticky-actions text-right">
                            <DocumentRowActions
                              doc={doc}
                              canEdit={canEdit}
                              onEdit={() => openEdit(doc)}
                              onDownload={() => mutations.download.mutate(doc.id)}
                              onArchive={() => mutations.archive.mutate(doc.id)}
                              onDelete={() => mutations.remove.mutate(doc.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </StariumTableWrap>
              <div className="starium-dt-pagination">
                <span className="starium-dt-pg-info" aria-live="polite">
                  {rangeLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        <aside
          className={cn(
            'starium-activity-card',
            pane === 'docs' && 'max-[1099px]:hidden',
          )}
          aria-label="Activité récente"
        >
          <h2 className="starium-sp-title mb-[18px]">Activité récente</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
          ) : (
            <ul className="starium-act-timeline">
              {activity.map((doc) => {
                const tone = projectDocumentVisualTone(doc);
                const name = projectDocumentDisplayName(doc);
                const author = projectDocumentAuthorShort(doc.uploadedByUser);
                return (
                  <li key={doc.id} className="starium-act-item">
                    <span className={cn(projectDocumentIcoClass(tone), 'z-[1]')} aria-hidden>
                      {projectDocumentTypeLabel(doc).slice(0, 4)}
                    </span>
                    <div className="starium-act-body">
                      <div className="starium-act-line1">
                        <b>{author}</b> {projectDocumentActivityVerb(doc)}
                      </div>
                      <div className="starium-act-file">{name}</div>
                      <div className="starium-act-time">
                        {formatProjectDocumentRelative(doc.updatedAt)}
                      </div>
                    </div>
                    <span
                      className={cn('starium-act-dot', `starium-act-dot--${tone}`)}
                      aria-hidden
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            className="starium-ov-btn mt-2 min-h-11 border-[color:var(--brand-gold)] text-[color:var(--brand-ink)] sm:min-h-9"
            onClick={() => setPane('activity')}
          >
            Voir toute l&apos;activité
          </Button>
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
