'use client';

import { useQuery } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { humanResourceCatalogLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { listResources } from '@/services/resources';
import type { ResourceListItem } from '@/services/resources';

const MIN_AUTOCOMPLETE_CHARS = 2;

/** Libellé métier pour une ressource catalogue Humaine. */
export const humanResourceLeadLabel = humanResourceCatalogLabel;

export type WorkTeamLeadComboboxProps = {
  id?: string;
  /** `Resource` HUMAN (`leadResourceId`). */
  value: string;
  onChange: (leadResourceId: string) => void;
  fallbackLabel?: string | null;
  allowEmpty?: boolean;
  disabled?: boolean;
  dialogOpen: boolean;
  /** Libellé du champ (défaut : responsable d'équipe). */
  fieldLabel?: string;
  /** Texte d'aide sous le libellé ; si absent, le texte par défaut catalogue. */
  fieldDescription?: ReactNode;
  /** Exclure une ressource des suggestions (ex. la fiche en cours comme manager d'elle-même). */
  excludeResourceId?: string;
};

/**
 * Responsable d’équipe : sélection dans le catalogue **Ressources Humaine** uniquement (`resources.read`).
 */
export function WorkTeamLeadCombobox({
  id: propId,
  value,
  onChange,
  fallbackLabel,
  allowEmpty = false,
  disabled = false,
  dialogOpen,
  fieldLabel = 'Responsable d’équipe',
  fieldDescription,
  excludeResourceId,
}: WorkTeamLeadComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `wt-lead-${reactId}`;
  const listId = `${inputId}-listbox`;

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();
  const canReadResources = permsOk && has('resources.read');

  const containerRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);

  const searchReady = debouncedSearch.trim().length >= MIN_AUTOCOMPLETE_CHARS;

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
      dialogOpen && listOpen && !!clientId && permsOk && canReadResources && searchReady,
    staleTime: 30_000,
    retry: 1,
  });

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
    return () => clearTimeout(t);
  }, [searchQuery, listOpen]);

  useEffect(() => {
    if (!value.trim()) setPickedLabel(null);
  }, [value]);

  const openList = useCallback(() => {
    if (disabled || !canReadResources) return;
    setListOpen(true);
  }, [disabled, canReadResources]);

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

  const showList = listOpen && !disabled && canReadResources;
  const inputDisplay = showList ? searchQuery : selectedLabel;

  const pickHumanResource = (r: ResourceListItem) => {
    setPickedLabel(humanResourceLeadLabel(r));
    onChange(r.id);
    closeList();
  };

  const humanItemsRaw =
    searchReady && canReadResources ? (humanResourcesQuery.data?.items ?? []) : [];
  const humanItems = excludeResourceId
    ? humanItemsRaw.filter((row) => row.id !== excludeResourceId)
    : humanItemsRaw;

  const listFetching = searchReady && humanResourcesQuery.isFetching;
  const listError = humanResourcesQuery.isError;
  const listEmpty =
    searchReady &&
    !humanResourcesQuery.isFetching &&
    !humanResourcesQuery.isError &&
    humanItems.length === 0;

  const inputPlaceholder = disabled
    ? '…'
    : !canReadResources
      ? 'Permission catalogue requise (resources.read)…'
      : `Tape au moins ${MIN_AUTOCOMPLETE_CHARS} caractères pour les suggestions…`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{fieldLabel}</Label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {fieldDescription !== undefined ? (
          fieldDescription
        ) : !permsOk ? (
          'Vérification des droits…'
        ) : canReadResources ? (
          <>
            <strong>Catalogue Humaine</strong> : saisis au moins {MIN_AUTOCOMPLETE_CHARS} caractères
            pour proposer des fiches <strong>Resource</strong> du client actif.
          </>
        ) : (
          <>
            La désignation du responsable passe par le catalogue <strong>Ressources Humaine</strong>{' '}
            (permission <code className="text-xs">resources.read</code>).
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
          disabled={disabled || !canReadResources}
          placeholder={inputPlaceholder}
          value={inputDisplay}
          className="h-9 w-full min-w-0 pr-9"
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!listOpen) setListOpen(true);
          }}
          onFocus={() => {
            if (!disabled && canReadResources) setListOpen(true);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || !canReadResources}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"
          aria-label={listOpen ? 'Fermer la liste' : 'Ouvrir la liste'}
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled || !canReadResources) return;
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
                  onClick={() => {
                    setPickedLabel(null);
                    onChange('');
                    closeList();
                  }}
                >
                  Aucun responsable
                </button>
              </li>
            )}

            {!searchReady && (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Saisis au moins {MIN_AUTOCOMPLETE_CHARS} caractères pour lancer la recherche.
              </li>
            )}

            {searchReady && listFetching && humanItems.length === 0 && !allowEmpty && (
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

            {searchReady && listEmpty && !allowEmpty && (
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
                    className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickHumanResource(r)}
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
