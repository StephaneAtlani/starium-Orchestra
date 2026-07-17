'use client';

import { Button } from '@/components/ui/button';
import type { ProjectMicrosoftTeamsChannelTemplateDto } from '../types/project-options.types';

type Props = {
  templates: ProjectMicrosoftTeamsChannelTemplateDto[];
  canEdit: boolean;
  isReordering: boolean;
  onEdit: (template: ProjectMicrosoftTeamsChannelTemplateDto) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
};

export function MicrosoftTeamsChannelTemplatesTable({
  templates,
  canEdit,
  isReordering,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun canal par défaut configuré. Exemples suggérés : Pilotage, Exécution, Documentation.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template, index) => (
        <div
          key={template.id}
          className="flex flex-col gap-3 rounded-lg border border-border/70 p-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Ordre {template.sortOrder + 1}</span>
            {template.isPrimary ? <span>Canal principal</span> : null}
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium">{template.displayName}</p>
            <p className="text-sm text-muted-foreground">
              {template.description || 'Aucune description'}
            </p>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index === 0 || isReordering}
                onClick={() => onMoveUp(index)}
              >
                Monter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index === templates.length - 1 || isReordering}
                onClick={() => onMoveDown(index)}
              >
                Descendre
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onEdit(template)}
              >
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onDelete(template.id)}
              >
                Supprimer
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
