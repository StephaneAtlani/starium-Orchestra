'use client';

import { useEffect, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
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
import { projectQueryKeys } from '../lib/project-query-keys';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  typeCode: PrepTypeCode;
  mode: 'create' | 'edit';
  templateId: string | null;
  initialSelectedBlockIds: string[];
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
  initialName,
  onSaved,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const blocks = blocksForTypeCode(typeCode);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelectedBlockIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(
      mode === 'edit' && initialName?.trim()
        ? initialName.trim()
        : `Modèle ${typeCode}`,
    );
    setSelected(initialSelectedBlockIds);
  }, [open, mode, typeCode, initialSelectedBlockIds, initialName]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Indiquez un nom de modèle');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mode: 'simple' as const,
        selectedBlockIds: selected,
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
      description={`Personnalisez les blocs pour ${typeCode}`}
      icon={LayoutTemplate}
      size="md"
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
          <legend className="mb-2 text-sm font-semibold">Blocs inclus</legend>
          <ul className="space-y-1.5">
            {blocks.map((b) => {
              const on = selected.includes(b.id);
              return (
                <li key={b.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(b.id)}
                      className="size-4"
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {b.title}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">
                      {b.defaultMin} min
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </StariumModal>
  );
}
