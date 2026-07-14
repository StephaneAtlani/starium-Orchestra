'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectTags } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { cn } from '@/lib/utils';

export type ProjectTagIdsMatch = 'any' | 'all';
export type ProjectTagsFilterPanelLayout = 'dropdown' | 'inline';

export type ProjectTagsFilterProps = {
  value: string[];
  onChange: (tagIds: string[]) => void;
  matchMode?: ProjectTagIdsMatch;
  onMatchModeChange?: (mode: ProjectTagIdsMatch) => void;
  compact?: boolean;
  /** `inline` : panneau dans le flux (modales) — scroll fiable. `dropdown` : portal fixe (tableau). */
  panelLayout?: ProjectTagsFilterPanelLayout;
  id?: string;
};

type PanelPosition = { top: number; left: number; width: number; maxHeight: number };

const PANEL_PREFERRED_MAX_HEIGHT_PX = 280;

function TagOptionsList({
  panelId,
  id,
  tagCatalog,
  value,
  compact,
  listClassName,
  listStyle,
  listRef,
  onListWheel,
  onToggleTag,
  onClearAll,
  isLoading,
}: {
  panelId: string;
  id: string;
  tagCatalog: Array<{ id: string; name: string; color: string | null }>;
  value: string[];
  compact: boolean;
  listClassName?: string;
  listStyle?: React.CSSProperties;
  listRef?: React.RefObject<HTMLUListElement | null>;
  onListWheel?: (event: React.WheelEvent<HTMLUListElement>) => void;
  onToggleTag: (tagId: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2.5 py-1.5">
        <span className={cn('font-medium', compact ? 'text-[10px]' : 'text-xs')}>Étiquettes</span>
        {value.length > 0 ? (
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground shrink-0 underline-offset-2 hover:underline',
              compact ? 'text-[10px]' : 'text-xs',
            )}
            onClick={onClearAll}
          >
            Tout effacer
          </button>
        ) : null}
      </div>
      <ul
        ref={listRef}
        id={panelId}
        role="listbox"
        aria-label="Étiquettes du portefeuille"
        aria-multiselectable="true"
        className={cn(
          'min-h-0 overflow-y-auto overscroll-contain py-1.5 [-webkit-overflow-scrolling:touch]',
          compact ? 'text-[10px]' : 'text-xs',
          listClassName,
        )}
        style={listStyle}
        onWheel={onListWheel}
      >
        {tagCatalog.map((tag) => {
          const checked = value.includes(tag.id);
          const optionId = `${id}-tag-${tag.id}`;
          return (
            <li key={tag.id} role="presentation">
              <label
                htmlFor={optionId}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 hover:bg-muted/60"
              >
                <Checkbox
                  id={optionId}
                  checked={checked}
                  onCheckedChange={() => onToggleTag(tag.id)}
                  aria-label={tag.name}
                />
                <RegistryBadge
                  className={cn(compact && 'text-[10px] px-1.5 py-0')}
                  style={projectTagBadgeStyle(tag.color)}
                >
                  {tag.name}
                </RegistryBadge>
              </label>
            </li>
          );
        })}
      </ul>
      {isLoading ? (
        <p className="text-muted-foreground shrink-0 border-t border-border/60 px-2.5 py-1.5 text-[10px]">
          Chargement…
        </p>
      ) : null}
    </>
  );
}

export function ProjectTagsFilter({
  value,
  onChange,
  matchMode = 'any',
  onMatchModeChange,
  compact = false,
  panelLayout = 'dropdown',
  id = 'project-tags-filter',
}: ProjectTagsFilterProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const panelId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [mounted, setMounted] = useState(false);

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

  const showMatchMode = value.length > 1 && onMatchModeChange != null;
  const hasCatalog = tagCatalog.length > 0;
  const useInlinePanel = panelLayout === 'inline';

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPanelPosition(null);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, compact ? rect.width : 256);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp =
      spaceBelow < PANEL_PREFERRED_MAX_HEIGHT_PX && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(PANEL_PREFERRED_MAX_HEIGHT_PX, available));
    const top = openUp ? Math.max(8, rect.top - maxHeight) : rect.bottom + 4;

    setPanelPosition({
      top,
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      maxHeight,
    });
  }, [compact]);

  const openPanel = useCallback(() => {
    if (!clientId || !hasCatalog) return;
    if (!useInlinePanel) updatePanelPosition();
    setOpen(true);
  }, [clientId, hasCatalog, updatePanelPosition, useInlinePanel]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (!useInlinePanel) {
        const panelEl = document.getElementById(`${panelId}-dropdown`);
        if (panelEl?.contains(target)) return;
      }
      close();
    };
    document.addEventListener('click', onDocClick, true);
    if (!useInlinePanel) {
      window.addEventListener('resize', updatePanelPosition);
      window.addEventListener('scroll', updatePanelPosition, true);
    }
    return () => {
      document.removeEventListener('click', onDocClick, true);
      if (!useInlinePanel) {
        window.removeEventListener('resize', updatePanelPosition);
        window.removeEventListener('scroll', updatePanelPosition, true);
      }
    };
  }, [close, open, panelId, updatePanelPosition, useInlinePanel]);

  useEffect(() => {
    if (!hasCatalog) close();
  }, [close, hasCatalog]);

  const toggleTag = (tagId: string) => {
    const has = value.includes(tagId);
    onChange(has ? value.filter((id) => id !== tagId) : [...value, tagId]);
  };

  const clearAll = () => onChange([]);

  const handleListWheel = useCallback((event: React.WheelEvent<HTMLUListElement>) => {
    const el = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight) return;

    const delta = event.deltaY;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    el.scrollTop += delta;
  }, []);

  const triggerLabel =
    selectedTags.length === 0
      ? 'Toutes les étiquettes'
      : selectedTags.length === 1
        ? selectedTags[0]!.name
        : `${selectedTags.length} étiquettes`;

  const matchModeToggle = showMatchMode ? (
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
        onClick={() => onMatchModeChange?.('any')}
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
        onClick={() => onMatchModeChange?.('all')}
        title="Afficher uniquement les projets ayant toutes les étiquettes sélectionnées"
      >
        ET
      </button>
    </div>
  ) : null;

  const optionsPanel =
    open && hasCatalog ? (
      <div
        id={useInlinePanel ? panelId : `${panelId}-dropdown`}
        className={cn(
          'rounded-md border border-border bg-popover text-popover-foreground shadow-md',
          useInlinePanel
            ? 'mt-1.5 flex max-h-56 flex-col overflow-hidden'
            : 'fixed z-[200] flex flex-col overflow-hidden',
        )}
        style={
          useInlinePanel
            ? undefined
            : panelPosition
              ? {
                  top: panelPosition.top,
                  left: panelPosition.left,
                  width: panelPosition.width,
                  maxHeight: panelPosition.maxHeight,
                }
              : undefined
        }
        onMouseDown={(event) => {
          if (!useInlinePanel) event.stopPropagation();
        }}
        onClick={(event) => {
          if (!useInlinePanel) event.stopPropagation();
        }}
      >
        <TagOptionsList
          panelId={panelId}
          id={id}
          tagCatalog={tagCatalog}
          value={value}
          compact={compact}
          listRef={listRef}
          listClassName="min-h-0 flex-1"
          onToggleTag={toggleTag}
          onClearAll={clearAll}
          isLoading={tagsQuery.isLoading}
          onListWheel={handleListWheel}
        />
      </div>
    ) : null;

  return (
    <div
      ref={triggerRef}
      className={cn('min-w-0', compact ? 'w-full' : 'max-w-full')}
      id={id}
    >
      <div className={cn('flex min-w-0 flex-col gap-1', compact && 'gap-0.5')}>
        <div className={cn('flex min-w-0 flex-wrap items-center gap-1', compact ? 'gap-0.5' : 'gap-1.5')}>
          {selectedTags.length > 0 && !compact ? (
            selectedTags.map((tag, index) => (
              <span key={tag.id} className="inline-flex items-center gap-0.5">
                {index > 0 && showMatchMode ? (
                  <span
                    className="text-muted-foreground shrink-0 text-[10px] font-medium"
                    aria-hidden
                  >
                    {matchMode === 'all' ? 'ET' : 'OU'}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  title={`Retirer le filtre « ${tag.name} »`}
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RegistryBadge style={projectTagBadgeStyle(tag.color)}>
                    {tag.name} ×
                  </RegistryBadge>
                </button>
              </span>
            ))
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'min-w-0 shrink justify-start gap-1 font-normal',
              compact ? 'h-6 w-full px-1.5 text-[10px]' : 'h-8 max-w-full px-2 text-xs',
              selectedTags.length > 0 && 'border-primary/40',
              open && 'border-primary/40',
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (open) close();
              else openPanel();
            }}
            disabled={!clientId || !hasCatalog}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="listbox"
            aria-label={
              selectedTags.length > 0
                ? `Étiquettes sélectionnées : ${selectedTags.map((t) => t.name).join(', ')}`
                : 'Filtrer par étiquettes'
            }
            title="Sélectionner une ou plusieurs étiquettes"
          >
            <Tags className={cn('shrink-0', compact ? 'size-3' : 'size-3.5')} aria-hidden />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </div>

        {matchModeToggle}
      </div>

      {useInlinePanel
        ? optionsPanel
        : mounted && open && panelPosition && hasCatalog
          ? createPortal(optionsPanel, document.body)
          : null}

      {!hasCatalog && !tagsQuery.isLoading && clientId ? (
        <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
          Aucune étiquette configurée.
        </p>
      ) : null}
    </div>
  );
}
