'use client';

import { useMemo, useState } from 'react';
import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    setEditorOpen(true);
  };

  const openEdit = (tpl: ProjectReviewPrepareTemplateApi) => {
    setEditorMode('edit');
    setEditing(tpl);
    setEditorOpen(true);
  };

  const onDelete = async (templateId: string) => {
    if (confirmDeleteId !== templateId) {
      setConfirmDeleteId(templateId);
      return;
    }
    setDeleting(true);
    try {
      await deleteProjectReviewPrepareTemplate(
        authFetch,
        projectId,
        templateId,
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

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={(next) => {
          if (!next) setConfirmDeleteId(null);
          onOpenChange(next);
        }}
        title="Tous les modèles"
        description="Modèles de préparation des points projet — créer, modifier ou supprimer."
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
                <Plus className="size-4" aria-hidden />
                Créer un modèle
              </Button>
            ) : null}
          </>
        }
      >
        <div className="starium-form space-y-4">
          {canEdit ? (
            <div className="starium-form-field">
              <label
                className="starium-form-label"
                htmlFor="prep-tpl-create-type"
              >
                Type pour un nouveau modèle
              </label>
              <Select
                value={createType}
                onValueChange={(v) => {
                  if (v) setCreateType(asPrepTypeCode(v));
                }}
              >
                <SelectTrigger
                  id="prep-tpl-create-type"
                  className="min-h-11 w-full sm:max-w-sm"
                >
                  <SelectValue>
                    {(value) =>
                      value
                        ? typeCodeLabel(asPrepTypeCode(String(value)))
                        : 'Choisir un type'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPE_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {typeCodeLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {typeFilters.length > 1 ? (
            <div
              role="tablist"
              aria-label="Filtrer par type de modèle"
              className="starium-tab-group w-full max-w-full overflow-x-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filterType === 'ALL'}
                className="starium-tab-btn min-h-11 shrink-0"
                onClick={() => setFilterType('ALL')}
              >
                Tous
                <span className="ml-1.5 tabular-nums text-xs opacity-80">
                  {items.length}
                </span>
              </button>
              {typeFilters.map((code) => {
                const count = items.filter(
                  (t) => asPrepTypeCode(t.typeCode) === code,
                ).length;
                return (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={filterType === code}
                    className="starium-tab-btn min-h-11 shrink-0 whitespace-nowrap"
                    onClick={() => setFilterType(code)}
                  >
                    {typeCodeLabel(code)}
                    <span className="ml-1.5 tabular-nums text-xs opacity-80">
                      {count}
                    </span>
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
                  <Button type="button" onClick={openCreate}>
                    <Plus className="size-4" aria-hidden />
                    Créer un modèle
                  </Button>
                ) : undefined
              }
              className="py-10"
            />
          ) : (
            <ul className="space-y-5" aria-live="polite">
              {grouped.map((group) => (
                <li key={group.typeCode}>
                  <h3 className="starium-modal-seg-title mb-2">
                    {typeCodeLabel(group.typeCode)}
                  </h3>
                  <ul className="divide-y divide-border/70 rounded-[var(--radius-lg)] border border-border/70 bg-card">
                    {group.items.map((tpl) => {
                      const blockCount = payloadStringArray(
                        tpl.payload,
                        'selectedBlockIds',
                      ).length;
                      const confirming = confirmDeleteId === tpl.id;
                      return (
                        <li
                          key={tpl.id}
                          className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {displayLabel(tpl.name, 'Modèle sans nom')}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {blockCount > 0
                                ? `${blockCount} bloc${blockCount > 1 ? 's' : ''} sélectionné${blockCount > 1 ? 's' : ''}`
                                : 'Blocs non précisés'}
                            </p>
                          </div>
                          {canEdit ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <IconButton
                                type="button"
                                size="icon"
                                variant="outline"
                                aria-label={`Modifier ${displayLabel(tpl.name, 'le modèle')}`}
                                className="min-h-11 min-w-11"
                                onClick={() => openEdit(tpl)}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </IconButton>
                              <Button
                                type="button"
                                variant={confirming ? 'destructive' : 'outline'}
                                className={cn(
                                  'min-h-11',
                                  confirming && 'min-w-[10rem]',
                                )}
                                disabled={deleting}
                                onClick={() => void onDelete(tpl.id)}
                                onBlur={() => {
                                  if (confirmDeleteId === tpl.id) {
                                    setConfirmDeleteId(null);
                                  }
                                }}
                              >
                                {confirming ? (
                                  'Confirmer'
                                ) : (
                                  <>
                                    <Trash2
                                      className="size-4"
                                      aria-hidden
                                    />
                                    <span className="sr-only sm:not-sr-only sm:ml-1.5">
                                      Supprimer
                                    </span>
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </StariumModal>

      <PrepareTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        typeCode={editorTypeCode}
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
