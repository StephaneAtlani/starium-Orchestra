'use client';

import { useMemo, useState } from 'react';
import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useQueryClient } from '@tanstack/react-query';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  deleteProjectReviewPrepareTemplate,
  type ProjectReviewPrepareTemplateApi,
} from '../api/project-reviews.api';
import { usePrepareTemplatesQuery } from '../hooks/use-prepare-templates-query';
import { defaultSelectedBlockIds } from '../lib/prepare-workspace-blocks';
import {
  PREP_TYPE_CODE,
  type PrepTypeCode,
  typeCodeLabel,
} from '../lib/prepare-workspace-types';
import { PrepareTemplateEditorDialog } from './prepare-template-editor-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  canEdit: boolean;
};

const ALL_TYPE_CODES = Object.values(PREP_TYPE_CODE);

function asPrepTypeCode(code: string): PrepTypeCode {
  const upper = code.trim().toUpperCase();
  if ((ALL_TYPE_CODES as string[]).includes(upper)) {
    return upper as PrepTypeCode;
  }
  return PREP_TYPE_CODE.ADHOC;
}

function payloadStringArray(
  payload: Record<string, unknown> | undefined,
  key: string,
): string[] {
  const raw = payload?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function FilterCount({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        active
          ? 'bg-[color:var(--control-active-fg)]/20 text-[color:var(--control-active-fg)]'
          : 'bg-muted text-muted-foreground',
      )}
      aria-hidden
    >
      {count}
    </span>
  );
}

export function ProjectReviewPrepareTemplatesDialog({
  open,
  onOpenChange,
  projectId,
  canEdit,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();

  const templatesQuery = usePrepareTemplatesQuery(projectId, null, {
    enabled: open && Boolean(projectId),
  });

  const [filterType, setFilterType] = useState<PrepTypeCode | 'ALL'>('ALL');
  const [createType, setCreateType] = useState<PrepTypeCode>(
    PREP_TYPE_CODE.COPROJ,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] =
    useState<ProjectReviewPrepareTemplateApi | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = templatesQuery.data?.items ?? [];

  const typeFilters = useMemo(() => {
    const present = new Set(items.map((t) => asPrepTypeCode(t.typeCode)));
    return ALL_TYPE_CODES.filter((c) => present.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    const list =
      filterType === 'ALL'
        ? items
        : items.filter((t) => asPrepTypeCode(t.typeCode) === filterType);
    return [...list].sort((a, b) => {
      const ta = asPrepTypeCode(a.typeCode);
      const tb = asPrepTypeCode(b.typeCode);
      if (ta !== tb) return ta.localeCompare(tb);
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [items, filterType]);

  const grouped = useMemo(() => {
    const map = new Map<PrepTypeCode, ProjectReviewPrepareTemplateApi[]>();
    for (const t of filtered) {
      const code = asPrepTypeCode(t.typeCode);
      const bucket = map.get(code) ?? [];
      bucket.push(t);
      map.set(code, bucket);
    }
    return ALL_TYPE_CODES.filter((c) => map.has(c)).map((c) => ({
      typeCode: c,
      items: map.get(c)!,
    }));
  }, [filtered]);

  const invalidateTemplates = async () => {
    await qc.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return (
          Array.isArray(key) &&
          key[0] === 'project' &&
          key[1] === projectId &&
          key[2] === 'prepare-templates'
        );
      },
    });
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditing(null);
    setCreateType(
      filterType !== 'ALL' ? filterType : PREP_TYPE_CODE.COPROJ,
    );
    setEditorOpen(true);
  };

  const openEdit = (tpl: ProjectReviewPrepareTemplateApi) => {
    setEditorMode('edit');
    setEditing(tpl);
    setEditorOpen(true);
  };

  const requestDelete = (templateId: string) => {
    setConfirmDeleteId(templateId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteProjectReviewPrepareTemplate(
        authFetch,
        projectId,
        confirmDeleteId,
      );
      toast.success('Modèle supprimé');
      setConfirmDeleteId(null);
      await invalidateTemplates();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Suppression impossible'));
    } finally {
      setDeleting(false);
    }
  };

  const editorTypeCode = editing
    ? asPrepTypeCode(editing.typeCode)
    : createType;

  const confirmTarget = confirmDeleteId
    ? items.find((t) => t.id === confirmDeleteId)
    : null;

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={(next) => {
          if (!next) setConfirmDeleteId(null);
          onOpenChange(next);
        }}
        title="Modèles de préparation"
        description="Bibliothèque des modèles d’ordre du jour par type de point."
        icon={LayoutTemplate}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            {canEdit ? (
              <Button
                type="button"
                className="min-h-11 sm:min-h-9"
                onClick={openCreate}
              >
                <Plus className="size-3.5" aria-hidden />
                Créer un modèle
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          {typeFilters.length > 0 ? (
            <div
              role="group"
              aria-label="Filtrer par type de modèle"
              className="starium-tab-group w-full max-w-full overflow-x-auto"
            >
              <button
                type="button"
                aria-pressed={filterType === 'ALL'}
                className={cn(
                  'starium-tab-btn min-h-11 shrink-0',
                  filterType === 'ALL' && 'starium-tab-btn--active',
                )}
                onClick={() => setFilterType('ALL')}
              >
                Tous
                <FilterCount count={items.length} active={filterType === 'ALL'} />
              </button>
              {typeFilters.map((code) => {
                const count = items.filter(
                  (t) => asPrepTypeCode(t.typeCode) === code,
                ).length;
                const active = filterType === code;
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      'starium-tab-btn min-h-11 shrink-0 whitespace-nowrap',
                      active && 'starium-tab-btn--active',
                    )}
                    onClick={() => setFilterType(code)}
                  >
                    {typeCodeLabel(code)}
                    <FilterCount count={count} active={active} />
                  </button>
                );
              })}
            </div>
          ) : null}

          {templatesQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : templatesQuery.isError ? (
            <ErrorState
              message="Impossible de charger les modèles. Réessayez ou vérifiez votre connexion."
              onRetry={() => void templatesQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Aucun modèle"
              description="Créez un modèle pour personnaliser les blocs d’ordre du jour d’un type de point."
              action={
                canEdit ? (
                  <Button
                    type="button"
                    className="min-h-11 sm:min-h-9"
                    onClick={openCreate}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Créer un modèle
                  </Button>
                ) : undefined
              }
              className="py-10"
            />
          ) : (
            <div className="space-y-5" aria-live="polite">
              {grouped.map((group) => (
                <section key={group.typeCode} aria-labelledby={`tpl-g-${group.typeCode}`}>
                  <h3
                    id={`tpl-g-${group.typeCode}`}
                    className="starium-modal-seg-title mb-1.5"
                  >
                    {typeCodeLabel(group.typeCode)}
                  </h3>
                  <ul className="space-y-0.5">
                    {group.items.map((tpl) => {
                      const blockCount = payloadStringArray(
                        tpl.payload,
                        'selectedBlockIds',
                      ).length;
                      const label = displayLabel(tpl.name, 'Modèle sans nom');
                      return (
                        <li key={tpl.id}>
                          <div className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-muted/40 focus-within:shadow-[var(--shadow-focus)]">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {label}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {blockCount > 0
                                  ? `${blockCount} bloc${blockCount > 1 ? 's' : ''}`
                                  : 'Blocs non précisés'}
                              </p>
                            </div>
                            {canEdit ? (
                              <div className="flex shrink-0 items-center gap-1">
                                <IconButton
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Modifier ${label}`}
                                  className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEdit(tpl)}
                                >
                                  <Pencil className="size-4" aria-hidden />
                                </IconButton>
                                <IconButton
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Supprimer ${label}`}
                                  className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                                  onClick={() => requestDelete(tpl.id)}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </IconButton>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </StariumModal>

      <StariumModal
        open={Boolean(confirmTarget)}
        onOpenChange={(next) => {
          if (!next) setConfirmDeleteId(null);
        }}
        title="Supprimer le modèle"
        description={
          confirmTarget
            ? `« ${displayLabel(confirmTarget.name, 'Modèle sans nom')} » ne sera plus proposé à la préparation ni lié aux équipes.`
            : undefined
        }
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setConfirmDeleteId(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-9"
              disabled={deleting || !confirmDeleteId}
              onClick={() => void confirmDelete()}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Cette action est définitive. Les points déjà préparés ne sont pas
          modifiés.
        </p>
      </StariumModal>

      <PrepareTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        typeCode={editorTypeCode}
        typeCodeEditable={editorMode === 'create'}
        onTypeCodeChange={setCreateType}
        mode={editorMode}
        templateId={editing?.id ?? null}
        initialName={editing?.name}
        initialSelectedBlockIds={
          editorMode === 'edit' && editing
            ? (() => {
                const fromTpl = payloadStringArray(
                  editing.payload,
                  'selectedBlockIds',
                );
                return fromTpl.length > 0
                  ? fromTpl
                  : defaultSelectedBlockIds(editorTypeCode);
              })()
            : defaultSelectedBlockIds(editorTypeCode)
        }
        initialBlockOrderIds={
          editorMode === 'edit' && editing
            ? payloadStringArray(editing.payload, 'blockOrderIds')
            : undefined
        }
        onSaved={async () => {
          await invalidateTemplates();
        }}
      />
    </>
  );
}
