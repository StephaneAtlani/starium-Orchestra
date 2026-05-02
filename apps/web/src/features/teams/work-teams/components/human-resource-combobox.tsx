'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';
import { listResources } from '@/services/resources';
import type { ResourceListItem } from '@/services/resources';
import { humanResourceLeadLabel } from './work-team-lead-combobox';

const MIN_SEARCH_CHARS = 2;

export type HumanResourceComboboxProps = {
  id?: string;
  value: string;
  onChange: (resourceId: string) => void;
  fallbackLabel?: string | null;
  disabled?: boolean;
  dialogOpen: boolean;
  /** Resource HUMAN à exclure (ex. responsable d’équipe déjà désigné). */
  excludeResourceId?: string | null;
  label?: string;
};

/**
 * Sélection d’une ressource catalogue Humaine (Resource HUMAN).
 */
export function HumanResourceCombobox({
  id: propId,
  value,
  onChange,
  fallbackLabel,
  disabled = false,
  dialogOpen,
  excludeResourceId = null,
  label = 'Ressource Humaine (catalogue)',
}: HumanResourceComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `hr-combo-${reactId}`;
  const listId = `${inputId}-listbox`;

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);

  const searchReady = debouncedSearch.trim().length >= MIN_SEARCH_CHARS;

  const humanResourcesQuery = useQuery({
    queryKey: ['resources', 'human-for-team-member-combo', clientId, debouncedSearch],
    queryFn: () =>
      listResources(authFetch, {
        type: 'HUMAN',
        search: debouncedSearch.trim(),
        limit: 30,
        offset: 0,
      }),
    enabled: dialogOpen && listOpen && !!clientId && searchReady,
    staleTime: 30_000,
    retry: 1,
  });

  const humanItemsRaw = useMemo(
    () => (searchReady ? (humanResourcesQuery.data?.items ?? []) : []),
    [searchReady, humanResourcesQuery.data?.items],
  );

  const humanItems = useMemo(() => {
    if (!excludeResourceId) return humanItemsRaw;
    return humanItemsRaw.filter((r) => r.id !== excludeResourceId);
  }, [humanItemsRaw, excludeResourceId]);

  const allResultsWereExcluded =
    searchReady &&
    !humanResourcesQuery.isFetching &&
    !humanResourcesQuery.isError &&
    humanItemsRaw.length > 0 &&
    humanItems.length === 0 &&
    !!excludeResourceId;

  useEffect(() => {
    if (!dialogOpen) {
      setListOpen(false);
      setSearchQuery('');
      setDebouncedSearch('');
      setPickedLabel(null);
    }
  }, [dialogOpen]);

  useLayoutEffect(() => {
    if (!listOpen) {
      setSearchQuery('');
      setDebouncedSearch('');
    }
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) return;
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(t);
  }, [searchQuery, listOpen]);

  useEffect(() => {
    if (!value.trim()) setPickedLabel(null);
  }, [value]);

  const openList = useCallback(() => {
    if (disabled) return;
    setListOpen(true);
  }, [disabled]);

  const closeList = useCallback(() => {
    setListOpen(false);
  }, []);

  useEffect(() => {
    if (!listOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeList();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listOpen, closeList]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeList();
    };
    if (listOpen) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [listOpen, closeList]);

  const selectedLabel = useMemo(() => {
    if (!value.trim()) return '';
    if (pickedLabel) return pickedLabel;
    return fallbackLabel?.trim() ?? '';
  }, [value, pickedLabel, fallbackLabel]);

  const showList = listOpen && !disabled;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const pickResource = (r: ResourceListItem) => {
    if (disabled) return;
    if (excludeResourceId && r.id === excludeResourceId) return;
    setPickedLabel(humanResourceLeadLabel(r));
    onChange(r.id);
    closeList();
  };

  const listFetching = searchReady && humanResourcesQuery.isFetching;
  const listError = humanResourcesQuery.isError;
  const listEmpty =
    searchReady &&
    !humanResourcesQuery.isFetching &&
    !humanResourcesQuery.isError &&
    humanItems.length === 0;

  const inputPlaceholder = disabled
    ? '…'
    : `Tape au moins ${MIN_SEARCH_CHARS} caractères pour les suggestions…`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong>Autocomplétion</strong> : saisis au moins {MIN_SEARCH_CHARS} caractères — les fiches{' '}
        <strong>Humaine</strong> correspondantes du catalogue sont proposées.
      </p>
      <div ref={containerRef} className="relative">
        <Input
          id={inputId}
          name="humanResourceId"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={inputPlaceholder}
          value={inputDisplay}
          className="h-9 w-full min-w-0 pr-9"
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!listOpen) setListOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setListOpen(true);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"
          aria-label={listOpen ? 'Fermer la liste' : 'Ouvrir la liste'}
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled) return;
            if (listOpen) closeList();
            else openList();
          }}
        >
          <ChevronDown
            className={cn('size-4 opacity-70 transition-transform', listOpen && 'rotate-180')}
          />
        </button>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
          >
            {!searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_SEARCH_CHARS} caractères pour lancer la recherche.
              </li>
            )}

            {searchReady && listFetching && humanItems.length === 0 && (
              <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                Recherche…
              </li>
            )}

            {searchReady && listError && (
              <li className="px-2 py-2 text-xs text-destructive">
                Impossible de charger les ressources Humaines.
              </li>
            )}

            {searchReady && allResultsWereExcluded && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Seul le responsable d’équipe correspond à cette recherche — il ne peut pas être ajouté
                comme membre.
              </li>
            )}

            {searchReady && listEmpty && !allResultsWereExcluded && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Aucune ressource Humaine ne correspond à ta recherche.
              </li>
            )}

            {searchReady &&
              humanItems.map((r) => (
                <li key={r.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === r.id}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                      value === r.id && 'bg-accent/40',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickResource(r)}
                  >
                    {humanResourceLeadLabel(r)}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
