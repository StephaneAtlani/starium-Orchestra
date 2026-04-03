'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import type { CollaboratorManagerOption } from '@/features/teams/collaborators/types/collaborator.types';

function formatOptionLabel(c: CollaboratorManagerOption): string {
  const sec = collaboratorManagerSecondaryLabel(c);
  return sec ? `${c.displayName} — ${sec}` : c.displayName;
}

export type WorkTeamLeadComboboxProps = {
  id?: string;
  value: string;
  onChange: (collaboratorId: string) => void;
  /** Libellé si le responsable courant est hors page API (édition). */
  fallbackLabel?: string | null;
  /** Équipe archivée : entrée « Aucun » en tête de liste. */
  allowEmpty?: boolean;
  disabled?: boolean;
  /** Dialog parent ouvert — active les requêtes collaborateurs. */
  dialogOpen: boolean;
};

/**
 * Recherche + liste (autocomplétion) pour choisir le collaborateur responsable d’équipe.
 * Une seule zone : saisie filtre l’API, clic sur une ligne valide le choix.
 */
export function WorkTeamLeadCombobox({
  id: propId,
  value,
  onChange,
  fallbackLabel,
  allowEmpty = false,
  disabled = false,
  dialogOpen,
}: WorkTeamLeadComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `wt-lead-${reactId}`;
  const listId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const managersQuery = useCollaboratorManagerOptions(debouncedSearch, {
    enabled: dialogOpen && listOpen,
  });

  useEffect(() => {
    if (!dialogOpen) {
      setListOpen(false);
      setSearchQuery('');
      setDebouncedSearch('');
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

  const openList = useCallback(() => {
    if (disabled) return;
    setListOpen(true);
    setSearchQuery('');
    setDebouncedSearch('');
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
    const items = managersQuery.data?.items ?? [];
    const v = value.trim();
    if (!v) return items;
    if (items.some((c) => c.id === v)) return items;
    const fb = fallbackLabel?.trim();
    const synthetic: CollaboratorManagerOption = {
      id: v,
      displayName: fb || '…',
      email: null,
      jobTitle: null,
    };
    return [synthetic, ...items];
  }, [managersQuery.data?.items, value, fallbackLabel]);

  const selectedLabel = useMemo(() => {
    if (!value.trim()) return '';
    const row = mergedOptions.find((c) => c.id === value);
    if (row) return formatOptionLabel(row);
    return fallbackLabel?.trim() ?? '';
  }, [value, mergedOptions, fallbackLabel]);

  const showList = listOpen && !disabled;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const pick = (id: string) => {
    onChange(id);
    closeList();
  };

  const inputPlaceholder = disabled
    ? '…'
    : showList
      ? 'Nom, prénom, email…'
      : 'Rechercher un collaborateur…';

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>Responsable d’équipe (collaborateur)</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Tape pour filtrer, puis clique sur une ligne pour désigner le responsable (référentiel Collaborateurs).
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
          placeholder={inputPlaceholder}
          value={inputDisplay}
          className="h-9 w-full min-w-0 pr-9"
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!listOpen) setListOpen(true);
          }}
          onFocus={() => {
            openList();
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
            {allowEmpty && (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ''}
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                    value === '' && 'bg-accent/40',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick('')}
                >
                  Aucun responsable
                </button>
              </li>
            )}
            {managersQuery.isFetching && mergedOptions.length === 0 && (
              <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                Chargement…
              </li>
            )}
            {managersQuery.isError && (
              <li className="px-2 py-2 text-xs text-destructive">Impossible de charger la liste.</li>
            )}
            {!managersQuery.isFetching &&
              !managersQuery.isError &&
              mergedOptions.length === 0 &&
              !allowEmpty && (
                <li className="px-2 py-2 text-xs text-muted-foreground">Aucun collaborateur trouvé.</li>
              )}
            {mergedOptions.map((c) => (
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
