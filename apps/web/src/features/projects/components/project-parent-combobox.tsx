'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableParents } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectParentSummary } from '../types/project.types';

export const PROJECT_PARENT_NONE_ID = '__none__';

function formatParentLabel(item: ProjectParentSummary): string {
  return `${item.code} — ${item.name}`;
}

export type ProjectParentComboboxProps = {
  id?: string;
  label?: string;
  value: string | null;
  /** Libellé courant si absent de la liste chargée (ex. parent déjà assigné). */
  currentParent?: ProjectParentSummary | null;
  excludeProjectId?: string;
  onValueChange: (parentProjectId: string | null) => void;
  disabled?: boolean;
  errorText?: string | null;
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
  className,
}: ProjectParentComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `project-parent-${reactId}`;
  const listId = `${inputId}-listbox`;
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(query.trim()), 300);
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
    const items = parentsQuery.data?.items ?? [];
    const mapped = items.map((item) => ({
      id: item.id,
      label: formatParentLabel(item),
    }));
    if (value && value !== PROJECT_PARENT_NONE_ID) {
      const selected = items.find((i) => i.id === value);
      if (!selected && query === '') {
        return mapped;
      }
    }
    return mapped;
  }, [parentsQuery.data?.items, value, query]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const fromList = options.find((o) => o.id === value);
    if (fromList) return fromList.label;
    if (currentParent?.id === value) {
      return formatParentLabel(currentParent);
    }
    return '';
  }, [options, value, currentParent]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setListPosition(null);
  }, []);

  const updateListPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateListPosition();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const listEl = document.getElementById(listId);
      if (listEl?.contains(target)) return;
      close();
    };
    const onReposition = () => updateListPosition();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [close, listId, open, updateListPosition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, close]);

  const displayValue = open ? query : selectedLabel;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={errorText ? true : undefined}
            aria-describedby={errorText ? `${inputId}-error` : undefined}
            placeholder="Rechercher un projet (code ou nom)…"
            value={displayValue}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) {
                setOpen(true);
                updateListPosition();
              }
            }}
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
                updateListPosition();
              }
            }}
            className="pr-9"
          />
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
        {errorText ? (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-destructive" role="alert">
            {errorText}
          </p>
        ) : null}
        {mounted && open && listPosition
          ? createPortal(
              <ul
                id={listId}
                role="listbox"
                aria-label="Projets parents disponibles"
                className="fixed z-[200] max-h-60 overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
                style={{
                  top: listPosition.top,
                  left: listPosition.left,
                  width: listPosition.width,
                }}
              >
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onValueChange(null);
                      close();
                    }}
                  >
                    Aucun (projet racine)
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
                      Aucun projet parent éligible.
                    </li>
                  )}
                {options.map((opt) => (
                  <li key={opt.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === opt.id}
                      className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onValueChange(opt.id);
                        close();
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}
