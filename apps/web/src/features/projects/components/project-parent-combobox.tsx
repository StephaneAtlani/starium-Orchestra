'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableParents } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectParentSummary } from '../types/project.types';

export const PROJECT_PARENT_NONE_ID = '__none__';
export const PROJECT_PARENT_NONE_LABEL = 'Aucun projet parent';

function formatParentLabel(item: ProjectParentSummary): string {
  return `${item.code} — ${item.name}`;
}

export type ProjectParentComboboxProps = {
  id?: string;
  label?: string;
  value: string | null;
  currentParent?: ProjectParentSummary | null;
  excludeProjectId?: string;
  onValueChange: (parentProjectId: string | null) => void;
  disabled?: boolean;
  errorText?: string | null;
  hint?: string;
  className?: string;
};

type ListPosition = { top: number; left: number; width: number };

export function ProjectParentCombobox({
  id: propId,
  label = 'Projet parent',
  value,
  excludeProjectId,
  currentParent,
  onValueChange,
  disabled = false,
  errorText,
  hint,
  className,
}: ProjectParentComboboxProps) {
  const reactId = useId();
  const triggerId = propId ?? `project-parent-${reactId}`;
  const listId = `${triggerId}-listbox`;
  const searchId = `${triggerId}-search`;
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const parentsQuery = useQuery({
    queryKey: projectQueryKeys.assignableParents(clientId, {
      excludeProjectId,
      search: debouncedSearch || undefined,
      limit: 50,
    }),
    queryFn: () =>
      listAssignableParents(authFetch, {
        excludeProjectId,
        search: debouncedSearch || undefined,
        limit: 50,
      }),
    enabled: Boolean(clientId) && open,
  });

  const options = useMemo(() => {
    return (parentsQuery.data?.items ?? []).map((item) => ({
      id: item.id,
      label: formatParentLabel(item),
    }));
  }, [parentsQuery.data?.items]);

  const selectedLabel = useMemo(() => {
    if (!value) return PROJECT_PARENT_NONE_LABEL;
    if (currentParent?.id === value) return formatParentLabel(currentParent);
    const fromList = options.find((o) => o.id === value);
    if (fromList) return fromList.label;
    return 'Projet parent sélectionné';
  }, [options, value, currentParent]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebouncedSearch('');
    setListPosition(null);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
    setOpen(true);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const listEl = document.getElementById(listId);
      if (listEl?.contains(target)) return;
      close();
    };
    const onReposition = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setListPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    };
    // `click` (pas `mousedown`) : évite de fermer avant le `click` sur une option.
    document.addEventListener('click', onDoc, true);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('click', onDoc, true);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [close, listId, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const pick = (parentProjectId: string | null) => {
    onValueChange(parentProjectId);
    close();
  };

  return (
    <div className={cn('starium-form-field', className)}>
      <span className="starium-form-label" id={`${triggerId}-label`}>
        {label}
      </span>
      <div ref={containerRef} className="relative">
        <button
          id={triggerId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-labelledby={`${triggerId}-label`}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={
            [errorText ? `${triggerId}-error` : null, hint ? `${triggerId}-hint` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (open) close();
            else openList();
          }}
          className={cn(
            'starium-form-select flex w-full items-center justify-between gap-2 text-left text-foreground',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        {errorText ? (
          <p id={`${triggerId}-error`} className="starium-form-hint text-destructive" role="alert">
            {errorText}
          </p>
        ) : null}
        {hint && !errorText ? (
          <p id={`${triggerId}-hint`} className="starium-form-hint text-foreground">
            {hint}
          </p>
        ) : null}

        {mounted && open && listPosition
          ? createPortal(
              <div
                id={listId}
                role="listbox"
                aria-label="Projets parents disponibles"
                className="fixed z-[200] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: listPosition.top,
                  left: listPosition.left,
                  width: listPosition.width,
                }}
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
                      placeholder="Filtrer par code ou nom…"
                      className="h-9 w-full rounded-md border border-border bg-background py-0 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Filtrer les projets parents"
                    />
                  </div>
                </div>
                <ul className="max-h-56 overflow-auto py-1">
                  <li role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!value}
                      className={cn(
                        'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                        !value && 'bg-accent/50 font-medium',
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(null)}
                    >
                      {!value ? <Check className="size-4 shrink-0" aria-hidden /> : <span className="size-4 shrink-0" />}
                      {PROJECT_PARENT_NONE_LABEL}
                    </button>
                  </li>
                  {parentsQuery.isLoading ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Chargement…</li>
                  ) : null}
                  {parentsQuery.isError ? (
                    <li className="px-3 py-2 text-sm text-destructive" role="alert">
                      Impossible de charger les projets parents.
                    </li>
                  ) : null}
                  {!parentsQuery.isLoading &&
                    !parentsQuery.isError &&
                    options.length === 0 && (
                      <li className="px-3 py-2 text-sm text-muted-foreground">
                        Aucun autre projet éligible.
                      </li>
                    )}
                  {options.map((opt) => {
                    const selected = value === opt.id;
                    return (
                      <li key={opt.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                            selected && 'bg-accent/50 font-medium',
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pick(opt.id)}
                        >
                          {selected ? (
                            <Check className="size-4 shrink-0" aria-hidden />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">{opt.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}
