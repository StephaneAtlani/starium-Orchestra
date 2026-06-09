'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectTags } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { cn } from '@/lib/utils';

export type ProjectTagIdsMatch = 'any' | 'all';

export type ProjectTagsFilterProps = {
  value: string[];
  onChange: (tagIds: string[]) => void;
  matchMode?: ProjectTagIdsMatch;
  onMatchModeChange?: (mode: ProjectTagIdsMatch) => void;
  compact?: boolean;
  id?: string;
};

export function ProjectTagsFilter({
  value,
  onChange,
  matchMode = 'any',
  onMatchModeChange,
  compact = false,
  id = 'project-tags-filter',
}: ProjectTagsFilterProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagToAdd, setTagToAdd] = useState('');

  const tagsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
  });

  const tagCatalog = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  const selectedTags = useMemo(
    () =>
      value
        .map((tagId) => tagCatalog.find((t) => t.id === tagId))
        .filter((t): t is (typeof tagCatalog)[number] => t != null),
    [value, tagCatalog],
  );

  const availableTags = useMemo(
    () => tagCatalog.filter((t) => !value.includes(t.id)),
    [tagCatalog, value],
  );

  const showMatchMode = value.length > 1 && onMatchModeChange != null;

  const removeTag = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  const addTag = (tagId: string) => {
    if (!tagId || value.includes(tagId)) return;
    onChange([...value, tagId]);
    setTagToAdd('');
    setPickerOpen(false);
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', compact && 'gap-0.5')}>
      <div
        className={cn('flex min-w-0 flex-wrap items-center gap-1', compact ? 'gap-0.5' : 'gap-1.5')}
        id={id}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tag, index) => (
            <span key={tag.id} className="inline-flex items-center gap-0.5">
              {index > 0 && showMatchMode ? (
                <span
                  className={cn(
                    'text-muted-foreground shrink-0 font-medium',
                    compact ? 'text-[9px]' : 'text-[10px]',
                  )}
                  aria-hidden
                >
                  {matchMode === 'all' ? 'ET' : 'OU'}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                title={`Retirer le filtre « ${tag.name} »`}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RegistryBadge
                  className={cn(compact && 'text-[10px] px-1.5 py-0')}
                  style={projectTagBadgeStyle(tag.color)}
                >
                  {tag.name} ×
                </RegistryBadge>
              </button>
            </span>
          ))
        ) : (
          <span
            className={cn(
              'text-muted-foreground shrink-0',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            Toutes
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('shrink-0 p-0', compact ? 'h-6 w-6' : 'h-7 w-7')}
          onClick={() => setPickerOpen((prev) => !prev)}
          title="Ajouter une étiquette au filtre"
          disabled={!clientId || availableTags.length === 0}
          aria-label="Ajouter une étiquette au filtre"
        >
          +
        </Button>
        {pickerOpen && availableTags.length > 0 ? (
          <Select
            value={tagToAdd}
            onValueChange={(next) => {
              if (!next) return;
              addTag(next);
            }}
          >
            <SelectTrigger
              className={cn(
                compact ? 'h-6 max-w-[10rem] text-[10px]' : 'h-8 max-w-[220px]',
              )}
            >
              <SelectValue placeholder="Choisir une étiquette" />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {showMatchMode ? (
        <div
          className={cn(
            'inline-flex rounded-md border border-border/60 bg-background/80 p-0.5',
            compact && 'max-w-full',
          )}
          role="group"
          aria-label="Mode de combinaison des étiquettes"
        >
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 font-medium transition-colors',
              compact ? 'text-[10px]' : 'text-xs',
              matchMode === 'any'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onMatchModeChange('any')}
            title="Afficher les projets ayant au moins une des étiquettes sélectionnées"
          >
            OU
          </button>
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 font-medium transition-colors',
              compact ? 'text-[10px]' : 'text-xs',
              matchMode === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onMatchModeChange('all')}
            title="Afficher uniquement les projets ayant toutes les étiquettes sélectionnées"
          >
            ET
          </button>
        </div>
      ) : null}
    </div>
  );
}
