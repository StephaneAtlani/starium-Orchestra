'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LayoutTemplate } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  createProjectReviewPrepareTemplate,
  updateProjectReviewPrepareTemplate,
  type ProjectReviewPrepareTemplateApi,
} from '../api/project-reviews.api';
import {
  blocksForTypeCode,
  defaultSelectedBlockIds,
} from '../lib/prepare-workspace-blocks';
import {
  PREP_TYPE_CODE,
  type PrepTypeCode,
  resolveBlockOrderIds,
  selectedIdsInBlockOrder,
  typeCodeLabel,
} from '../lib/prepare-workspace-types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  typeCode: PrepTypeCode;
  /** Création depuis la bibliothèque : choix du type dans l’éditeur. */
  typeCodeEditable?: boolean;
  onTypeCodeChange?: (typeCode: PrepTypeCode) => void;
  mode: 'create' | 'edit';
  templateId: string | null;
  initialSelectedBlockIds: string[];
  /** Même sémantique que l’ODJ : ordre de tous les blocs (actifs + retirés). */
  initialBlockOrderIds?: string[];
  initialName?: string;
  onSaved: (tpl: ProjectReviewPrepareTemplateApi) => void | Promise<void>;
};

const ALL_TYPE_CODES = Object.values(PREP_TYPE_CODE);

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
  typeCodeEditable = false,
  onTypeCodeChange,
  mode,
  templateId,
  initialSelectedBlockIds,
  initialBlockOrderIds,
  initialName,
  onSaved,
}: Props) {
  const authFetch = useAuthenticatedFetch();
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
    setSelected(selectedIdsInBlockOrder(initialSelectedBlockIds, order));
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

  const changeType = (next: PrepTypeCode) => {
    onTypeCodeChange?.(next);
    const defaults = defaultSelectedBlockIds(next);
    const nextCatalog = blocksForTypeCode(next).map((b) => b.id);
    const order = resolveBlockOrderIds(nextCatalog, defaults);
    setOrderIds(order);
    setSelected(selectedIdsInBlockOrder(defaults, order));
    setName((prev) => {
      const auto = `Modèle ${typeCodeLabel(typeCode)}`;
      if (!prev.trim() || prev.trim() === auto) {
        return `Modèle ${typeCodeLabel(next)}`;
      }
      return prev;
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
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={saving}
            onClick={() => void onSave()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        {typeCodeEditable && mode === 'create' ? (
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="pw-tpl-type">
              Type de point
            </label>
            <Select
              value={typeCode}
              onValueChange={(v) => {
                if (!v) return;
                const next = (ALL_TYPE_CODES as string[]).includes(v)
                  ? (v as PrepTypeCode)
                  : PREP_TYPE_CODE.ADHOC;
                changeType(next);
              }}
            >
              <SelectTrigger
                id="pw-tpl-type"
                className="starium-form-select min-h-11 w-full"
              >
                <SelectValue>
                  {(value) =>
                    value
                      ? typeCodeLabel(
                          (ALL_TYPE_CODES as string[]).includes(String(value))
                            ? (String(value) as PrepTypeCode)
                            : PREP_TYPE_CODE.ADHOC,
                        )
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

        <div className="starium-form-field">
          <label htmlFor="pw-tpl-name" className="starium-form-label">
            Nom du modèle
          </label>
          <Input
            id="pw-tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="starium-form-input !h-11 !min-h-11"
            autoComplete="off"
          />
        </div>

        <fieldset>
          <legend className="starium-modal-seg-title mb-2">
            Blocs inclus (même ordre que l&apos;ODJ)
          </legend>
          <ul className="space-y-1.5">
            {orderedBlocks.map((b, orderPos) => {
              const on = selected.includes(b.id);
              const checkId = `pw-tpl-block-${b.id}`;
              return (
                <li key={b.id}>
                  <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-2 py-1">
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
                      <Checkbox
                        id={checkId}
                        checked={on}
                        onCheckedChange={() => toggle(b.id)}
                        aria-label={b.title}
                        className="size-5"
                      />
                      <label
                        htmlFor={checkId}
                        className="min-w-0 flex-1 cursor-pointer truncate text-sm font-semibold text-foreground"
                      >
                        {b.title}
                      </label>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                        {b.defaultMin} min
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <IconButton
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Monter ${b.title}`}
                        disabled={orderPos <= 0}
                        className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                        onClick={() => moveBlock(b.id, -1)}
                      >
                        <ChevronUp className="size-3.5" aria-hidden />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Descendre ${b.title}`}
                        disabled={orderPos >= orderedBlocks.length - 1}
                        className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                        onClick={() => moveBlock(b.id, 1)}
                      >
                        <ChevronDown className="size-3.5" aria-hidden />
                      </IconButton>
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
