'use client';

import { LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { displayLabel } from '@/lib/display-label';
import type { PrepTypeCode } from '../lib/prepare-workspace-types';
import { typeCodeLabel } from '../lib/prepare-workspace-types';

export type PrepareTemplateOption = {
  id: string;
  name: string;
  typeCode: string;
};

type Props = {
  typeCode: PrepTypeCode;
  templates: PrepareTemplateOption[];
  templatesLoading: boolean;
  selectedTemplateId: string | null;
  canEdit: boolean;
  onSelectTemplate: (id: string | null) => void;
  onCreate: () => void;
  onEdit: () => void;
};

export function PrepareWorkspaceModelCard({
  typeCode,
  templates,
  templatesLoading,
  selectedTemplateId,
  canEdit,
  onSelectTemplate,
  onCreate,
  onEdit,
}: Props) {
  const selected = templates.find((t) => t.id === selectedTemplateId) ?? null;

  return (
    <section className="prepare-workspace__card" aria-labelledby="pw-model-title">
      <div className="prepare-workspace__card-h">
        <LayoutTemplate className="size-3.5" aria-hidden />
        <span id="pw-model-title">Modèle {typeCode}</span>
        {canEdit && selected ? (
          <button
            type="button"
            className="ml-auto text-[11.5px] font-bold normal-case tracking-normal text-[color:var(--brand-gold-700)] underline-offset-2 hover:underline"
            onClick={onEdit}
          >
            Modifier
          </button>
        ) : null}
      </div>

      <p className="text-sm font-extrabold text-foreground">
        {selected
          ? displayLabel(selected.name, 'Modèle sans nom')
          : typeCodeLabel(typeCode)}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {selected
          ? 'Modèle client enregistré'
          : 'Blocs standards du type — créez un modèle pour le personnaliser'}
      </p>

      <div className="mt-3 space-y-2">
        <label className="sr-only" htmlFor="pw-template-select">
          Choisir un modèle
        </label>
        <Select
          value={selectedTemplateId ?? '__default__'}
          onValueChange={(v) =>
            onSelectTemplate(!v || v === '__default__' ? null : v)
          }
          disabled={!canEdit || templatesLoading}
        >
          <SelectTrigger
            id="pw-template-select"
            className="min-h-11 w-full"
            aria-label="Modèle de préparation"
          >
            <SelectValue placeholder="Modèle par défaut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Modèle par défaut ({typeCode})</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {displayLabel(t.name, 'Modèle sans nom')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={onCreate}
          >
            Créer un modèle
          </Button>
        ) : null}
      </div>
    </section>
  );
}
