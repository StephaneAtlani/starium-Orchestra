'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectoryProviderGroup } from '../types/team-sync.types';

export type ProviderGroupComboboxProps = {
  id?: string;
  value: string;
  onChange: (groupId: string) => void;
  groups: DirectoryProviderGroup[];
  /** Groupes déjà ajoutés (exclus des suggestions). */
  excludeGroupIds?: string[];
  isLoading?: boolean;
  isError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function ProviderGroupCombobox({
  id: propId,
  value,
  onChange,
  groups,
  excludeGroupIds = [],
  isLoading = false,
  isError = false,
  disabled = false,
  placeholder = 'Sélectionner un groupe',
  className,
}: ProviderGroupComboboxProps) {
  const reactId = useId();
  const triggerId = propId ?? `provider-group-${reactId}`;
  const listId = `${triggerId}-listbox`;
  const searchId = `${triggerId}-search`;

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const excluded = useMemo(() => new Set(excludeGroupIds), [excludeGroupIds]);

  const availableGroups = useMemo(
    () => groups.filter((g) => !excluded.has(g.id)),
    [groups, excluded],
  );

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return availableGroups;
    return availableGroups.filter((g) => normalizeSearch(g.name).includes(q));
  }, [availableGroups, query]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return groups.find((g) => g.id === value)?.name ?? '';
  }, [groups, value]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const pick = (groupId: string) => {
    onChange(groupId);
    close();
  };

  return (
    <div ref={containerRef} className={cn('relative min-w-0 flex-1', className)}>
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={placeholder}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else openList();
        }}
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-sm outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate',
            selectedLabel ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Groupes disponibles"
          className="absolute left-0 right-0 top-full z-[200] mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder="Rechercher un groupe…"
                className="h-11 w-full rounded-md border border-border bg-background py-0 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Rechercher un groupe"
                autoComplete="off"
              />
            </div>
          </div>

          <ul className="max-h-56 overflow-auto py-1" aria-live="polite">
            {isLoading ? (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                Chargement des groupes…
              </li>
            ) : null}

            {isError ? (
              <li className="px-3 py-2 text-sm text-destructive" role="alert">
                Impossible de charger les groupes.
              </li>
            ) : null}

            {!isLoading && !isError && filteredGroups.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {query.trim()
                  ? 'Aucun groupe ne correspond à la recherche.'
                  : availableGroups.length === 0
                    ? 'Aucun groupe disponible.'
                    : 'Aucun résultat.'}
              </li>
            ) : null}

            {!isLoading &&
              !isError &&
              filteredGroups.map((g) => {
                const selected = value === g.id;
                return (
                  <li key={g.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                        selected && 'bg-accent/50 font-medium',
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(g.id)}
                    >
                      {selected ? (
                        <Check className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <span className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0 truncate">{g.name}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
