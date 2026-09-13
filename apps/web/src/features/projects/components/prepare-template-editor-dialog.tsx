'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LayoutTemplate } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  createProjectReviewPrepareTemplate,
  updateProjectReviewPrepareTemplate,
  type ProjectReviewPrepareTemplateApi,
} from '../api/project-reviews.api';
import { blocksForTypeCode } from '../lib/prepare-workspace-blocks';
import type { PrepTypeCode } from '../lib/prepare-workspace-types';
import {
  resolveBlockOrderIds,
  selectedIdsInBlockOrder,
  typeCodeLabel,
} from '../lib/prepare-workspace-types';
import { projectQueryKeys } from '../lib/project-query-keys';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  typeCode: PrepTypeCode;
  mode: 'create' | 'edit';
  templateId: string | null;
  initialSelectedBlockIds: string[];
  /** Même sémantique que l’ODJ : ordre de tous les blocs (actifs + retirés). */
  initialBlockOrderIds?: string[];
  initialName?: string;
  onSaved: (tpl: ProjectReviewPrepareTemplateApi) => void | Promise<void>;
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function PrepareTemplateEditorDialog({
  open,
  onOpenChange,
  projectId,
  typeCode,
  mode,
  templateId,
  initialSelectedBlockIds,
  initialBlockOrderIds,
  initialName,
  onSaved,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const blocks = blocksForTypeCode(typeCode);
  const catalogIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelectedBlockIds);
  const [orderIds, setOrderIds] = useState<string[]>(() =>
    resolveBlockOrderIds(catalogIds, initialBlockOrderIds),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(
      mode === 'edit' && initialName?.trim()
        ? initialName.trim()
        : `Modèle ${typeCodeLabel(typeCode)}`,
    );
    const order = resolveBlockOrderIds(catalogIds, initialBlockOrderIds);
    setOrderIds(order);
    setSelected(
      selectedIdsInBlockOrder(initialSelectedBlockIds, order),
    );
  }, [
    open,
    mode,
    typeCode,
    catalogIds,
    initialSelectedBlockIds,
    initialBlockOrderIds,
    initialName,
  ]);

  const orderedBlocks = useMemo(() => {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    return orderIds
      .map((id) => byId.get(id))
      .filter((b): b is (typeof blocks)[number] => !!b);
  }, [blocks, orderIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return selectedIdsInBlockOrder([...prev, id], orderIds);
    });
  };

  const moveBlock = (blockId: string, delta: number) => {
    setOrderIds((prev) => {
      const ids = [...prev];
      const index = ids.indexOf(blockId);
      if (index < 0) return prev;
      const next = index + delta;
      if (next < 0 || next >= ids.length) return prev;
      const copy = [...ids];
      const [removed] = copy.splice(index, 1);
      copy.splice(next, 0, removed!);
      setSelected((sel) => selectedIdsInBlockOrder(sel, copy));
      return copy;
    });
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Indiquez un nom de modèle');
      return;
    }
    setSaving(true);
    try {
      const order = resolveBlockOrderIds(catalogIds, orderIds);
      const payload = {
        mode: 'simple' as const,
        selectedBlockIds: selectedIdsInBlockOrder(selected, order),
        blockOrderIds: order,
        customBlocks: [],
      };
      let tpl: ProjectReviewPrepareTemplateApi;
      if (mode === 'edit' && templateId) {
        tpl = await updateProjectReviewPrepareTemplate(
          authFetch,
          projectId,
          templateId,
          { name: trimmed, payload },
        );
      } else {
        tpl = await createProjectReviewPrepareTemplate(authFetch, projectId, {
          name: trimmed,
          typeCode,
          payload,
        });
      }
      await qc.invalidateQueries({
        queryKey: projectQueryKeys.prepareTemplates(
          clientId,
          projectId,
          typeCode,
        ),
      });
      toast.success('Modèle enregistré');
      await onSaved(tpl);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Enregistrement du modèle impossible'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'edit' ? 'Modifier le modèle' : 'Créer un modèle'}
      description={`Personnalisez les blocs pour ${typeCodeLabel(typeCode)}`}
      icon={LayoutTemplate}
      size="md"
      overlayClassName="!z-[100] bg-black/55 dark:bg-black/70"
      contentClassName="!z-[101]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={saving}
            onClick={() => void onSave()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pw-tpl-name" className="text-sm font-semibold">
            Nom du modèle
          </label>
          <Input
            id="pw-tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11"
            autoComplete="off"
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Blocs inclus (même ordre que l&apos;ODJ)
          </legend>
          <ul className="space-y-1.5">
            {orderedBlocks.map((b, orderPos) => {
              const on = selected.includes(b.id);
              return (
                <li key={b.id}>
                  <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 px-2">
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-1">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(b.id)}
                        className="size-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {b.title}
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                        {b.defaultMin} min
                      </span>
                    </label>
                    <span className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                        aria-label={`Monter ${b.title}`}
                        disabled={orderPos <= 0}
                        onClick={() => moveBlock(b.id, -1)}
                      >
                        <ChevronUp className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                        aria-label={`Descendre ${b.title}`}
                        disabled={orderPos >= orderedBlocks.length - 1}
                        onClick={() => moveBlock(b.id, 1)}
                      >
                        <ChevronDown className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </StariumModal>
  );
}
