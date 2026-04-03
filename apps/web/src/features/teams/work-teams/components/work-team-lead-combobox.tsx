'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import type { CollaboratorManagerOption } from '@/features/teams/collaborators/types/collaborator.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { listResources } from '@/services/resources';
import type { ResourceListItem } from '@/services/resources';
import { resolveCollaboratorIdFromHumanResource } from '../lib/resolve-human-resource-to-collaborator';

/** Pas de requête ni de liste « complète » : uniquement des suggestions après saisie. */
const MIN_AUTOCOMPLETE_CHARS = 2;

function formatCollaboratorOptionLabel(c: CollaboratorManagerOption): string {
  const sec = collaboratorManagerSecondaryLabel(c);
  return sec ? `${c.displayName} — ${sec}` : c.displayName;
}

/** Libellé métier pour une ressource catalogue Humaine (jamais l’UUID). */
export function humanResourceLeadLabel(r: ResourceListItem): string {
  const name =
    [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ') || r.name.trim();
  if (r.email?.trim()) return `${name} — ${r.email.trim()}`;
  return name;
}

export type WorkTeamLeadComboboxProps = {
  id?: string;
  value: string;
  onChange: (collaboratorId: string) => void;
  /** Libellé si le responsable courant est connu seulement côté équipe (édition). */
  fallbackLabel?: string | null;
  /** Équipe archivée : entrée « Aucun » en tête de liste. */
  allowEmpty?: boolean;
  disabled?: boolean;
  /** Dialog parent ouvert — active les requêtes. */
  dialogOpen: boolean;
};

/**
 * Recherche + autocomplétion : par défaut **catalogue Ressources Humaine** → résolution en collaborateur.
 * Sans `resources.read` : repli sur la liste collaborateurs (options/managers).
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

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();
  const canReadResources = permsOk && has('resources.read');
  const useHumanCatalog = canReadResources;

  const containerRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  /** Libellé affiché après choix depuis le catalogue Humaine (value = collaborateur résolu). */
  const [pickedHumanLabel, setPickedHumanLabel] = useState<string | null>(null);
  const [resolvingResourceId, setResolvingResourceId] = useState<string | null>(null);

  const searchReady =
    debouncedSearch.trim().length >= MIN_AUTOCOMPLETE_CHARS;

  const managersQuery = useCollaboratorManagerOptions(debouncedSearch, {
    enabled:
      dialogOpen &&
      listOpen &&
      !!clientId &&
      permsOk &&
      !useHumanCatalog &&
      searchReady,
  });

  const humanResourcesQuery = useQuery({
    queryKey: ['resources', 'human-team-lead', clientId, debouncedSearch],
    queryFn: () =>
      listResources(authFetch, {
        type: 'HUMAN',
        search: debouncedSearch.trim(),
        limit: 20,
        offset: 0,
      }),
    enabled:
      dialogOpen &&
      listOpen &&
      !!clientId &&
      permsOk &&
      useHumanCatalog &&
      searchReady,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!dialogOpen) {
      setListOpen(false);
      setSearchQuery('');
      setDebouncedSearch('');
      setPickedHumanLabel(null);
      setResolvingResourceId(null);
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
    return () => clearTimeout(t);
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

  const mergedCollaboratorOptions = useMemo(() => {
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
    if (useHumanCatalog && pickedHumanLabel) return pickedHumanLabel;
    if (!useHumanCatalog) {
      const row = mergedCollaboratorOptions.find((c) => c.id === value);
      if (row) return formatCollaboratorOptionLabel(row);
    }
    return fallbackLabel?.trim() ?? '';
  }, [
    value,
    useHumanCatalog,
    pickedHumanLabel,
    mergedCollaboratorOptions,
    fallbackLabel,
  ]);

  const showList = listOpen && !disabled;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const pickCollaborator = (id: string) => {
    if (!useHumanCatalog) setPickedHumanLabel(null);
    onChange(id);
    closeList();
  };

  const pickHumanResource = async (r: ResourceListItem) => {
    if (disabled) return;
    setResolvingResourceId(r.id);
    try {
      const collaboratorId = await resolveCollaboratorIdFromHumanResource(authFetch, r);
      setPickedHumanLabel(humanResourceLeadLabel(r));
      onChange(collaboratorId);
      closeList();
    } catch (e) {
      toast.error((e as Error).message ?? 'Rattachement collaborateur impossible');
    } finally {
      setResolvingResourceId(null);
    }
  };

  /** N’affiche pas les résultats en cache si la saisie est redevenue trop courte. */
  const humanItems =
    searchReady && useHumanCatalog
      ? (humanResourcesQuery.data?.items ?? [])
      : [];

  const collaboratorItems =
    searchReady && !useHumanCatalog ? mergedCollaboratorOptions : [];

  const listFetching = useHumanCatalog
    ? searchReady && humanResourcesQuery.isFetching
    : searchReady && managersQuery.isFetching;
  const listError = useHumanCatalog ? humanResourcesQuery.isError : managersQuery.isError;
  const listEmpty =
    useHumanCatalog &&
    searchReady &&
    !humanResourcesQuery.isFetching &&
    !humanResourcesQuery.isError &&
    humanItems.length === 0;
  const collabEmpty =
    !useHumanCatalog &&
    searchReady &&
    !managersQuery.isFetching &&
    !managersQuery.isError &&
    collaboratorItems.length === 0;

  const inputPlaceholder = disabled
    ? '…'
    : `Tape au moins ${MIN_AUTOCOMPLETE_CHARS} caractères pour les suggestions…`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>Responsable d’équipe</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {!permsOk ? (
          'Vérification des droits…'
        ) : useHumanCatalog ? (
          <>
            <strong>Autocomplétion</strong> : saisis au moins {MIN_AUTOCOMPLETE_CHARS} caractères —
            seules les fiches <strong>Humaine</strong> correspondantes sont proposées (pas de liste
            complète à l’ouverture). Rattachement Collaborateur au choix.
          </>
        ) : (
          <>
            Sans lecture du catalogue Ressources : sélection parmi les{' '}
            <strong>collaborateurs</strong> seulement (permission <code>resources.read</code>{' '}
            pour le mode Humaine).
          </>
        )}
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
                  onClick={() => pickCollaborator('')}
                >
                  Aucun responsable
                </button>
              </li>
            )}

            {useHumanCatalog && !searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_AUTOCOMPLETE_CHARS} caractères pour lancer la recherche (aucune
                liste complète).
              </li>
            )}

            {!useHumanCatalog && !searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_AUTOCOMPLETE_CHARS} caractères pour l’autocomplétion.
              </li>
            )}

            {useHumanCatalog &&
              searchReady &&
              listFetching &&
              humanItems.length === 0 &&
              !allowEmpty && (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  Recherche…
                </li>
              )}

            {!useHumanCatalog &&
              searchReady &&
              listFetching &&
              collaboratorItems.length === 0 &&
              !allowEmpty && (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  Recherche…
                </li>
              )}

            {searchReady && listError && (
              <li className="px-2 py-2 text-xs text-destructive">
                {useHumanCatalog
                  ? 'Impossible de charger les ressources Humaines.'
                  : 'Impossible de charger la liste.'}
              </li>
            )}

            {useHumanCatalog && listEmpty && !allowEmpty && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Aucune ressource Humaine ne correspond à ta recherche.
              </li>
            )}

            {!useHumanCatalog && collabEmpty && !allowEmpty && (
              <li className="px-2 py-2 text-xs text-muted-foreground">Aucun collaborateur trouvé.</li>
            )}

            {useHumanCatalog &&
              searchReady &&
              humanItems.map((r) => (
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
                      humanResourceLeadLabel(r)
                    )}
                  </button>
                </li>
              ))}

            {!useHumanCatalog &&
              searchReady &&
              collaboratorItems.map((c) => (
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
                    {formatCollaboratorOptionLabel(c)}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
