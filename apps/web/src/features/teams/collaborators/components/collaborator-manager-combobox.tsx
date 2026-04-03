'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCollaboratorManagerOptions } from '../hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '../lib/collaborator-label-mappers';
import type { CollaboratorManagerOption } from '../types/collaborator.types';

const MIN_SEARCH_CHARS = 2;

function formatOptionLabel(c: CollaboratorManagerOption): string {
  const sec = collaboratorManagerSecondaryLabel(c);
  return sec ? `${c.displayName} — ${sec}` : c.displayName;
}

export type CollaboratorManagerComboboxProps = {
  id?: string;
  /** id du manager ou chaîne vide */
  value: string;
  onChange: (managerId: string) => void;
  /** Si le manager enregistré n’est pas dans la page API (tri / pagination). */
  fallbackLabel?: string | null;
  /** Ne pas proposer ce collaborateur (ex. interdiction d’être son propre manager). */
  excludeCollaboratorId?: string;
  disabled?: boolean;
  label?: string;
};

/**
 * Manager hiérarchique : autocomplétion sur `GET /collaborators/options/managers` (recherche débouncée),
 * pas une liste figée des N premiers.
 */
export function CollaboratorManagerCombobox({
  id: propId,
  value,
  onChange,
  fallbackLabel,
  excludeCollaboratorId,
  disabled = false,
  label = 'Manager',
}: CollaboratorManagerComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `collab-mgr-${reactId}`;
  const listId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const searchReady = debouncedSearch.trim().length >= MIN_SEARCH_CHARS;

  const managersQuery = useCollaboratorManagerOptions(debouncedSearch, {
    enabled: listOpen && searchReady,
  });

  useLayoutEffect(() => {
    if (!listOpen) {
      setSearchQuery('');
      setDebouncedSearch('');
    }
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) return;
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, listOpen]);

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

  const mergedOptions = useMemo(() => {
    const raw = managersQuery.data?.items ?? [];
    const filtered = excludeCollaboratorId
      ? raw.filter((c) => c.id !== excludeCollaboratorId)
      : raw;
    const v = value.trim();
    if (!v) return filtered;
    if (filtered.some((c) => c.id === v)) return filtered;
    const fb = fallbackLabel?.trim();
    if (!fb) return filtered;
    const synthetic: CollaboratorManagerOption = {
      id: v,
      displayName: fb,
      email: null,
      jobTitle: null,
    };
    return [synthetic, ...filtered];
  }, [
    managersQuery.data?.items,
    value,
    fallbackLabel,
    excludeCollaboratorId,
  ]);

  const displayOptions = searchReady ? mergedOptions : [];

  const selectedLabel = useMemo(() => {
    if (!value.trim()) return 'Aucun manager';
    const row = mergedOptions.find((c) => c.id === value);
    if (row) return formatOptionLabel(row);
    return fallbackLabel?.trim() ?? '—';
  }, [value, mergedOptions, fallbackLabel]);

  const showList = listOpen && !disabled;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const pick = (id: string) => {
    onChange(id);
    closeList();
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Tape au moins {MIN_SEARCH_CHARS} caractères pour chercher un manager (nom, email, service…).
      </p>
      <div ref={containerRef} className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={`Recherche manager (min. ${MIN_SEARCH_CHARS} caractères)…`}
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
            className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                  !value.trim() && 'bg-accent/40',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick('')}
              >
                Aucun manager
              </button>
            </li>

            {!searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_SEARCH_CHARS} caractères pour lancer la recherche.
              </li>
            )}

            {searchReady && managersQuery.isFetching && displayOptions.length === 0 && (
              <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                Recherche…
              </li>
            )}

            {searchReady && managersQuery.isError && (
              <li className="px-2 py-2 text-xs text-destructive">Impossible de charger les managers.</li>
            )}

            {searchReady &&
              !managersQuery.isFetching &&
              !managersQuery.isError &&
              displayOptions.length === 0 && (
                <li className="px-2 py-2 text-xs text-muted-foreground">Aucun résultat.</li>
              )}

            {searchReady &&
              displayOptions.map((c) => (
                <li key={c.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === c.id}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                      value === c.id && 'bg-accent/40',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(c.id)}
                  >
                    {formatOptionLabel(c)}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
