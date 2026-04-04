'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { listResources } from '@/services/resources';
import type { ResourceListItem } from '@/services/resources';
import { cn } from '@/lib/utils';
import { useCollaboratorManagerOptions } from '../hooks/use-collaborator-manager-options';
import {
  collaboratorManagerSecondaryLabel,
  humanResourceCatalogLabel,
} from '../lib/collaborator-label-mappers';
import { resolveCollaboratorIdFromHumanResource } from '@/features/teams/work-teams/lib/resolve-human-resource-to-collaborator';
import type { CollaboratorManagerOption } from '../types/collaborator.types';

const MIN_SEARCH_CHARS = 2;

function formatOptionLabel(c: CollaboratorManagerOption): string {
  const sec = collaboratorManagerSecondaryLabel(c);
  return sec ? `${c.displayName} — ${sec}` : c.displayName;
}

export type CollaboratorManagerComboboxProps = {
  id?: string;
  /** Nom du champ pour le formulaire (ex. `managerId` pour react-hook-form). */
  name?: string;
  /** id du manager ou chaîne vide */
  value: string;
  onChange: (managerId: string) => void;
  /** Si le manager enregistré n’est pas dans la page API (tri / pagination). */
  fallbackLabel?: string | null;
  /** Ne pas proposer ce collaborateur (ex. interdiction d’être son propre manager). */
  excludeCollaboratorId?: string;
  /** Exclure la ressource Humaine avec le même email (fiche en cours d’édition). */
  excludeSelfEmail?: string | null;
  disabled?: boolean;
  label?: string;
};

/**
 * Manager hiérarchique : avec `resources.read`, autocomplétion sur le catalogue **Ressources Humaine**
 * puis rattachement collaborateur ; sinon repli sur `GET /collaborators/options/managers`.
 */
export function CollaboratorManagerCombobox({
  id: propId,
  name = 'managerId',
  value,
  onChange,
  fallbackLabel,
  excludeCollaboratorId,
  excludeSelfEmail,
  disabled = false,
  label = 'Manager',
}: CollaboratorManagerComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `collab-mgr-${reactId}`;
  const listId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();
  const useHumanCatalog = permsOk && has('resources.read');

  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pickedHumanLabel, setPickedHumanLabel] = useState<string | null>(null);
  const [resolvingResourceId, setResolvingResourceId] = useState<string | null>(null);

  const searchReady = debouncedSearch.trim().length >= MIN_SEARCH_CHARS;

  const managersQuery = useCollaboratorManagerOptions(debouncedSearch, {
    enabled:
      listOpen &&
      !!clientId &&
      permsOk &&
      !useHumanCatalog &&
      searchReady,
  });

  const humanResourcesQuery = useQuery({
    queryKey: ['resources', 'human-manager-combobox', clientId, debouncedSearch],
    queryFn: () =>
      listResources(authFetch, {
        type: 'HUMAN',
        search: debouncedSearch.trim(),
        limit: 50,
        offset: 0,
      }),
    enabled:
      listOpen && !!clientId && permsOk && useHumanCatalog && searchReady,
    staleTime: 30_000,
    retry: 1,
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
    return () => window.clearTimeout(t);
  }, [searchQuery, listOpen]);

  useEffect(() => {
    if (!value.trim()) setPickedHumanLabel(null);
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

  const humanItemsFiltered = useMemo(() => {
    const items = humanResourcesQuery.data?.items ?? [];
    const ex = excludeSelfEmail?.trim().toLowerCase();
    if (!ex) return items;
    return items.filter((r) => r.email?.trim().toLowerCase() !== ex);
  }, [humanResourcesQuery.data?.items, excludeSelfEmail]);

  const displayOptions = searchReady && !useHumanCatalog ? mergedOptions : [];

  const selectedLabel = useMemo(() => {
    if (!value.trim()) return '';
    if (useHumanCatalog && pickedHumanLabel) return pickedHumanLabel;
    if (!useHumanCatalog) {
      const row = mergedOptions.find((c) => c.id === value);
      if (row) return formatOptionLabel(row);
    }
    return fallbackLabel?.trim() ?? '—';
  }, [value, useHumanCatalog, pickedHumanLabel, mergedOptions, fallbackLabel]);

  const showList = listOpen && !disabled;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const inputPlaceholder = showList
    ? `Recherche manager (min. ${MIN_SEARCH_CHARS} caractères)…`
    : 'Aucun manager — tapez pour rechercher (nom, email, service…)';

  const pickCollaborator = (id: string) => {
    setPickedHumanLabel(null);
    onChange(id);
    closeList();
  };

  const pickHumanResource = async (r: ResourceListItem) => {
    if (disabled) return;
    setResolvingResourceId(r.id);
    try {
      const collaboratorId = await resolveCollaboratorIdFromHumanResource(authFetch, r);
      if (excludeCollaboratorId && collaboratorId === excludeCollaboratorId) {
        toast.error('Tu ne peux pas te désigner comme manager de toi-même.');
        return;
      }
      setPickedHumanLabel(humanResourceCatalogLabel(r));
      onChange(collaboratorId);
      closeList();
    } catch (e) {
      toast.error((e as Error).message ?? 'Rattachement collaborateur impossible');
    } finally {
      setResolvingResourceId(null);
    }
  };

  const listError = useHumanCatalog ? humanResourcesQuery.isError : managersQuery.isError;
  const humanEmpty =
    useHumanCatalog &&
    searchReady &&
    !humanResourcesQuery.isFetching &&
    !humanResourcesQuery.isError &&
    humanItemsFiltered.length === 0;
  const collabEmpty =
    !useHumanCatalog &&
    searchReady &&
    !managersQuery.isFetching &&
    !managersQuery.isError &&
    displayOptions.length === 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {!permsOk ? (
          'Vérification des droits…'
        ) : useHumanCatalog ? (
          <>
            Saisis au moins {MIN_SEARCH_CHARS} caractères : suggestions parmi les fiches{' '}
            <strong>Ressource Humaine</strong> ; le choix est enregistré comme collaborateur
            manager.
          </>
        ) : (
          <>
            Tape au moins {MIN_SEARCH_CHARS} caractères pour chercher un manager (collaborateurs
            actifs). Avec <code className="text-xs">resources.read</code>, le catalogue{' '}
            <strong>Humaine</strong> est utilisé à la place.
          </>
        )}
      </p>
      <div ref={containerRef} className="relative">
        <Input
          id={inputId}
          name={name}
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
            <li role="presentation">
              <button
                type="button"
                role="option"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                  !value.trim() && 'bg-accent/40',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickCollaborator('')}
              >
                Aucun manager
              </button>
            </li>

            {useHumanCatalog && !searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_SEARCH_CHARS} caractères pour lancer la recherche.
              </li>
            )}

            {!useHumanCatalog && !searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_SEARCH_CHARS} caractères pour lancer la recherche.
              </li>
            )}

            {searchReady &&
              useHumanCatalog &&
              humanResourcesQuery.isFetching &&
              humanItemsFiltered.length === 0 && (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  Recherche…
                </li>
              )}

            {searchReady &&
              !useHumanCatalog &&
              managersQuery.isFetching &&
              displayOptions.length === 0 && (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  Recherche…
                </li>
              )}

            {searchReady && listError && (
              <li className="px-2 py-2 text-xs text-destructive">
                {useHumanCatalog
                  ? 'Impossible de charger les ressources Humaines.'
                  : 'Impossible de charger les managers.'}
              </li>
            )}

            {useHumanCatalog && humanEmpty && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Aucune ressource Humaine ne correspond à ta recherche.
              </li>
            )}

            {!useHumanCatalog && collabEmpty && (
              <li className="px-2 py-2 text-xs text-muted-foreground">Aucun résultat.</li>
            )}

            {useHumanCatalog &&
              searchReady &&
              !listError &&
              humanItemsFiltered.map((r) => (
                <li key={r.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    disabled={!!resolvingResourceId}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60 disabled:opacity-50',
                      resolvingResourceId === r.id && 'opacity-70',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void pickHumanResource(r)}
                  >
                    {resolvingResourceId === r.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Rattachement…
                      </span>
                    ) : (
                      humanResourceCatalogLabel(r)
                    )}
                  </button>
                </li>
              ))}

            {!useHumanCatalog &&
              searchReady &&
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
                    onClick={() => pickCollaborator(c.id)}
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
